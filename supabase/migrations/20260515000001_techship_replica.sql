-- ============================================================================
-- TMS Paqueterías · Techship replica — schema base
--
-- Agrega las tablas operativas y analíticas que faltan para reemplazar Techship:
--   markup_profiles + markup_profile_rules   — matriz de markup configurable
--   parcel_addresses                         — libreta de direcciones
--   manifests + manifest_guias               — cierre de manifiestos por carrier
--   parcel_order_templates                   — plantillas de órdenes
--   parcel_print_queue                       — cola de impresión de etiquetas
--
-- Extiende guias_paqueteria con campos de SLA y markup aplicado.
--
-- Idempotente: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS. RLS open policies en
-- las tablas nuevas (single-tenant Supply Chain MX).
-- ============================================================================

-- ── 1. markup_profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS markup_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT DEFAULT '',
  activo        BOOLEAN NOT NULL DEFAULT true,
  prioridad     INT NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. markup_profile_rules ─────────────────────────────────────────────────
-- Cada regla es una fila de la matriz cliente × carrier × service.
-- cliente_id / carrier / service en NULL = comodín (aplica a todos).
CREATE TABLE IF NOT EXISTS markup_profile_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES markup_profiles(id) ON DELETE CASCADE,
  cliente_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  carrier       TEXT,
  service       TEXT,
  markup_pct    NUMERIC(8,4) NOT NULL DEFAULT 0,
  min_markup    NUMERIC(12,2),
  max_markup    NUMERIC(12,2),
  prioridad     INT NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mpr_profile ON markup_profile_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_mpr_client  ON markup_profile_rules(cliente_id);

-- ── 3. parcel_addresses ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcel_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias         TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('sender','recipient','ambos')),
  nombre        TEXT NOT NULL,
  empresa       TEXT DEFAULT '',
  calle1        TEXT NOT NULL,
  calle2        TEXT DEFAULT '',
  ciudad        TEXT NOT NULL,
  estado        TEXT NOT NULL,
  codigo_postal TEXT NOT NULL,
  pais          TEXT NOT NULL DEFAULT 'MX',
  telefono      TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  referencia    TEXT DEFAULT '',
  cliente_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  es_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parcel_addr_tipo   ON parcel_addresses(tipo);
CREATE INDEX IF NOT EXISTS idx_parcel_addr_client ON parcel_addresses(cliente_id);

-- ── 4. manifests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manifests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           TEXT NOT NULL,
  carrier         TEXT NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'manual',
  status          TEXT NOT NULL DEFAULT 'abierto'
    CHECK (status IN ('abierto','finalizado','cancelado')),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  total_guias     INT NOT NULL DEFAULT 0,
  pdf_url         TEXT,
  provider_manifest_id TEXT,
  notas           TEXT DEFAULT '',
  creado_por      TEXT,
  finalized_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manifests_status  ON manifests(status);
CREATE INDEX IF NOT EXISTS idx_manifests_carrier ON manifests(carrier);

-- ── 5. manifest_guias (join) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manifest_guias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id   UUID NOT NULL REFERENCES manifests(id) ON DELETE CASCADE,
  guia_id       UUID NOT NULL REFERENCES guias_paqueteria(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manifest_id, guia_id)
);

CREATE INDEX IF NOT EXISTS idx_manifest_guias_manifest ON manifest_guias(manifest_id);
CREATE INDEX IF NOT EXISTS idx_manifest_guias_guia     ON manifest_guias(guia_id);

-- ── 6. parcel_order_templates ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcel_order_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT DEFAULT '',
  cliente_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  use_count     INT NOT NULL DEFAULT 0,
  last_used_at  TIMESTAMPTZ,
  creado_por    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pot_client ON parcel_order_templates(cliente_id);

-- ── 7. parcel_print_queue ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcel_print_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guia_id       UUID REFERENCES guias_paqueteria(id) ON DELETE CASCADE,
  user_email    TEXT NOT NULL,
  label_url     TEXT,
  tracking_number TEXT,
  carrier       TEXT,
  status        TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente','impreso','error')),
  printed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppq_user   ON parcel_print_queue(user_email, status);
CREATE INDEX IF NOT EXISTS idx_ppq_status ON parcel_print_queue(status);

-- ── 8. Extender guias_paqueteria con SLA + markup ───────────────────────────
ALTER TABLE guias_paqueteria
  ADD COLUMN IF NOT EXISTS promised_delivery_date  DATE,
  ADD COLUMN IF NOT EXISTS actual_delivery_date    DATE,
  ADD COLUMN IF NOT EXISTS induction_date          DATE,
  ADD COLUMN IF NOT EXISTS billing_account         TEXT,
  ADD COLUMN IF NOT EXISTS markup_pct_applied      NUMERIC(8,4);

-- ── 9. Triggers updated_at ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION techship_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_markup_profiles_updated ON markup_profiles;
CREATE TRIGGER trg_markup_profiles_updated BEFORE UPDATE ON markup_profiles
  FOR EACH ROW EXECUTE FUNCTION techship_set_updated_at();

DROP TRIGGER IF EXISTS trg_parcel_addresses_updated ON parcel_addresses;
CREATE TRIGGER trg_parcel_addresses_updated BEFORE UPDATE ON parcel_addresses
  FOR EACH ROW EXECUTE FUNCTION techship_set_updated_at();

DROP TRIGGER IF EXISTS trg_manifests_updated ON manifests;
CREATE TRIGGER trg_manifests_updated BEFORE UPDATE ON manifests
  FOR EACH ROW EXECUTE FUNCTION techship_set_updated_at();

DROP TRIGGER IF EXISTS trg_pot_updated ON parcel_order_templates;
CREATE TRIGGER trg_pot_updated BEFORE UPDATE ON parcel_order_templates
  FOR EACH ROW EXECUTE FUNCTION techship_set_updated_at();

-- ── 10. RLS — open policies (single-tenant) ─────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'markup_profiles','markup_profile_rules','parcel_addresses',
    'manifests','manifest_guias','parcel_order_templates','parcel_print_queue'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS open_all_%I ON %I', t, t);
    EXECUTE format('CREATE POLICY open_all_%I ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ── 11. Seed: dirección remitente default Supply Chain MX — Lerma ───────────
INSERT INTO parcel_addresses (alias, tipo, nombre, empresa, calle1, ciudad, estado, codigo_postal, pais, es_default)
SELECT 'Supply Chain MX — Lerma', 'sender', 'Supply Chain MX',
       'Supply Chain México', 'Carretera Lerma-Toluca KM 5', 'Lerma',
       'México', '52000', 'MX', true
WHERE NOT EXISTS (SELECT 1 FROM parcel_addresses WHERE alias = 'Supply Chain MX — Lerma');

-- ── 12. Verificación ────────────────────────────────────────────────────────
SELECT
  to_regclass('public.markup_profiles')        AS markup_profiles,
  to_regclass('public.markup_profile_rules')   AS markup_profile_rules,
  to_regclass('public.parcel_addresses')       AS parcel_addresses,
  to_regclass('public.manifests')              AS manifests,
  to_regclass('public.manifest_guias')         AS manifest_guias,
  to_regclass('public.parcel_order_templates') AS parcel_order_templates,
  to_regclass('public.parcel_print_queue')     AS parcel_print_queue;
