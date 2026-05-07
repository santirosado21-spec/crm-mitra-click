-- ============================================================================
-- TMS de Paqueterías · extender guias_paqueteria + carrier_credentials
--                    + shipment_tracking_events + mx_postal_codes
--
-- Convierte el módulo de captura manual en un TMS con rate shopping, auto-pick
-- por código postal, compra de etiqueta vía agregador, y tracking automático.
--
-- Idempotente: usa IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, ON CONFLICT.
-- ============================================================================

-- ── 1. Extender guias_paqueteria con campos de rate shopping y auto-pick ──
ALTER TABLE guias_paqueteria
  ADD COLUMN IF NOT EXISTS from_postal_code   TEXT,
  ADD COLUMN IF NOT EXISTS to_postal_code     TEXT,
  ADD COLUMN IF NOT EXISTS to_country         TEXT NOT NULL DEFAULT 'MX',
  ADD COLUMN IF NOT EXISTS weight_kg          NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS length_cm          NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS width_cm           NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS height_cm          NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS rate_quotes        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_pick_carrier  TEXT,
  ADD COLUMN IF NOT EXISTS auto_pick_service  TEXT,
  ADD COLUMN IF NOT EXISTS auto_pick_score    NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS auto_pick_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS override_reason    TEXT,
  ADD COLUMN IF NOT EXISTS override_by        TEXT,
  ADD COLUMN IF NOT EXISTS label_url          TEXT,
  ADD COLUMN IF NOT EXISTS label_format       TEXT
    CHECK (label_format IS NULL OR label_format IN ('pdf','zpl')),
  ADD COLUMN IF NOT EXISTS provider           TEXT NOT NULL DEFAULT 'manual'
    CHECK (provider IN ('manual','easypost','skydropx',
                        'direct_dhl','direct_ups','direct_fedex','direct_estafeta')),
  ADD COLUMN IF NOT EXISTS provider_shipment_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_rate_id   TEXT,
  ADD COLUMN IF NOT EXISTS tracking_status    TEXT
    CHECK (tracking_status IS NULL OR
           tracking_status IN ('cotizado','comprado','en_transito','entregado','excepcion','devuelto'));

-- is_local: derivada del país destino (true si es MX, false internacional).
ALTER TABLE guias_paqueteria
  DROP COLUMN IF EXISTS is_local;
ALTER TABLE guias_paqueteria
  ADD COLUMN is_local BOOLEAN GENERATED ALWAYS AS (to_country = 'MX') STORED;

CREATE INDEX IF NOT EXISTS idx_guias_provider     ON guias_paqueteria(provider);
CREATE INDEX IF NOT EXISTS idx_guias_tracking_st  ON guias_paqueteria(tracking_status);
CREATE INDEX IF NOT EXISTS idx_guias_to_country   ON guias_paqueteria(to_country);

-- ── 2. carrier_credentials ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carrier_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT UNIQUE NOT NULL
    CHECK (provider IN ('easypost','skydropx',
                        'direct_dhl','direct_ups','direct_fedex','direct_estafeta')),
  api_key         TEXT,                    -- En producción cifrar con vault.
  api_secret      TEXT,
  account_id      TEXT,
  base_url        TEXT,
  test_mode       BOOLEAN DEFAULT true,
  active          BOOLEAN DEFAULT false,
  last_check_ok   BOOLEAN,
  last_check_at   TIMESTAMPTZ,
  notas           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carrier_creds_active ON carrier_credentials(active);

ALTER TABLE carrier_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS carrier_creds_admin_all ON carrier_credentials;
-- Solo admin puede leer/escribir credenciales.
CREATE POLICY carrier_creds_admin_all ON carrier_credentials
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

COMMENT ON TABLE carrier_credentials IS
  'Credenciales API de cada provider (agregador o directo). Solo admin lee/escribe.';

-- ── 3. shipment_tracking_events ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guia_id         UUID NOT NULL REFERENCES guias_paqueteria(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  status          TEXT,
  status_detail   TEXT,
  location        TEXT,
  occurred_at     TIMESTAMPTZ,
  raw_payload     JSONB,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_evt_guia    ON shipment_tracking_events(guia_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_evt_status  ON shipment_tracking_events(status);

ALTER TABLE shipment_tracking_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tracking_evt_all ON shipment_tracking_events;
CREATE POLICY tracking_evt_all ON shipment_tracking_events
  FOR ALL USING (true) WITH CHECK (true);

-- ── 4. mx_postal_codes (lookup para distancia Haversine) ─────────────────
-- Este es solo el esqueleto. El seed con los ~3,500 CPs reales viene en
-- supabase_seed_mx_postal_codes.sql (separado para mantenerlo limpio).
CREATE TABLE IF NOT EXISTS mx_postal_codes (
  cp           TEXT PRIMARY KEY,           -- Código postal (5 dígitos)
  estado       TEXT,
  municipio    TEXT,
  ciudad       TEXT,
  lat          NUMERIC(9,6) NOT NULL,
  lon          NUMERIC(9,6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mx_cp_lat_lon ON mx_postal_codes(lat, lon);

ALTER TABLE mx_postal_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mx_cp_read_all ON mx_postal_codes;
-- Lectura pública (no contiene info sensible).
CREATE POLICY mx_cp_read_all ON mx_postal_codes
  FOR SELECT USING (true);
DROP POLICY IF EXISTS mx_cp_admin_write ON mx_postal_codes;
CREATE POLICY mx_cp_admin_write ON mx_postal_codes
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

COMMENT ON TABLE mx_postal_codes IS
  'Códigos postales MX con lat/lon para cálculo de distancia entre origen y destino. Cargar dataset SEPOMEX vía seed separado.';

-- ── 5. Trigger updated_at para carrier_credentials ───────────────────────
CREATE OR REPLACE FUNCTION carrier_credentials_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_carrier_creds_updated_at ON carrier_credentials;
CREATE TRIGGER trg_carrier_creds_updated_at
  BEFORE UPDATE ON carrier_credentials
  FOR EACH ROW EXECUTE FUNCTION carrier_credentials_set_updated_at();

-- ── 6. Verificación ──────────────────────────────────────────────────────
SELECT
  to_regclass('public.carrier_credentials')      AS carrier_credentials,
  to_regclass('public.shipment_tracking_events') AS tracking_events,
  to_regclass('public.mx_postal_codes')          AS mx_postal_codes,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'guias_paqueteria'
      AND column_name IN ('from_postal_code','to_postal_code','rate_quotes',
                          'auto_pick_carrier','override_reason','label_url',
                          'provider','tracking_status','is_local')) AS new_cols_count;
