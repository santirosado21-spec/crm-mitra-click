-- ============================================================
-- SCHEMA: CRM Supply Chain México
-- Ejecutar en: Supabase → SQL Editor → New Query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Clientes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  rfc           TEXT,
  address       TEXT,
  notes         TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Operaciones (Bitácora) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS operations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID        REFERENCES clients(id) ON DELETE CASCADE,
  referencia          TEXT,
  cliente_nombre      TEXT,
  cliente_codigo      TEXT,
  fecha               DATE,
  estado              TEXT        DEFAULT 'pendiente',
  asunto_cliente      TEXT,
  ref_cliente         TEXT,
  tipo_operacion      TEXT,
  incluye_transporte  BOOLEAN     DEFAULT FALSE,
  rc_transporte       BOOLEAN     DEFAULT FALSE,
  costo_proveedor     NUMERIC(12,2),
  factura_proveedor   TEXT,
  proveedor           TEXT,
  pod                 BOOLEAN     DEFAULT FALSE,
  evidencias          BOOLEAN     DEFAULT FALSE,
  proforma            BOOLEAN     DEFAULT FALSE,
  comentarios         TEXT,
  costo_cliente       NUMERIC(12,2),
  factura_supply      TEXT,
  folio_factura       TEXT,
  fecha_envio_rc      DATE,
  fecha_envio_factura DATE,
  creado_por          TEXT,
  -- Campos extra (Tequila Enemigo)
  fecha_entrega       DATE,
  almacen_origen      TEXT,
  cliente_destino     TEXT,
  sku                 TEXT,
  cantidad            INTEGER,
  -- Campos extra (Antonio Zapata)
  total_pallets       INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_operations_client_id    ON operations(client_id);
CREATE INDEX IF NOT EXISTS idx_operations_estado       ON operations(estado);
CREATE INDEX IF NOT EXISTS idx_operations_fecha        ON operations(fecha);
CREATE INDEX IF NOT EXISTS idx_operations_referencia   ON operations(referencia);
CREATE INDEX IF NOT EXISTS idx_operations_cliente_nombre ON operations(cliente_nombre);

-- ─── Trigger updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_updated_at    ON clients;
DROP TRIGGER IF EXISTS trg_operations_updated_at ON operations;

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_operations_updated_at
  BEFORE UPDATE ON operations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_clients_select"
  ON clients FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "auth_clients_insert"
  ON clients FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "auth_clients_update"
  ON clients FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "auth_operations_all"
  ON operations FOR ALL TO authenticated USING (TRUE);
