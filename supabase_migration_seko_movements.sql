-- ============================================================================
-- Seko 365 · seko_movements
--
-- Almacena los movimientos importados de los Excel que comparten los clientes
-- Seko 365 (BASF, KST, Lululemon, Burberry). El inventario de estos clientes
-- NO vive en Extensiv, así que el Excel es la única fuente.
--
-- Después de importarlos, el módulo Seko Billing los consume para armar el
-- billing mensual y eventualmente empujarlos a Extensiv junto con los datos
-- del TMS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS seko_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cliente
  cliente_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
  cliente_codigo  TEXT,             -- denorm para reportes (BSF, KST, BB, LUL)

  -- Movimiento
  fecha           DATE NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  referencia      TEXT,             -- PO / SO / folio del cliente
  sku             TEXT,
  cantidad        NUMERIC(12,3) DEFAULT 0,

  -- Trazabilidad del import
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by     TEXT,
  source_file     TEXT,             -- nombre del Excel original
  source_row      INT,              -- número de fila en el Excel (para debug)

  -- Estado de billing
  billed          BOOLEAN NOT NULL DEFAULT false,
  billed_at       TIMESTAMPTZ,

  notas           TEXT DEFAULT '',
  raw             JSONB,            -- payload original de la fila por si hay datos extra
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seko_mov_cliente_fecha ON seko_movements(cliente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_seko_mov_codigo        ON seko_movements(cliente_codigo);
CREATE INDEX IF NOT EXISTS idx_seko_mov_tipo          ON seko_movements(tipo);
CREATE INDEX IF NOT EXISTS idx_seko_mov_referencia    ON seko_movements(referencia);
CREATE INDEX IF NOT EXISTS idx_seko_mov_billed        ON seko_movements(billed);

ALTER TABLE seko_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_all_seko_movements ON seko_movements;
CREATE POLICY anon_all_seko_movements
  ON seko_movements FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE seko_movements IS
  'Movimientos importados de los Excels de clientes Seko 365 (BASF, KST, Lululemon, Burberry). Fuente única de inventario para esos clientes.';
COMMENT ON COLUMN seko_movements.tipo IS
  'entrada (receipt) | salida (order). Coherente con el patrón de Extensiv.';
COMMENT ON COLUMN seko_movements.billed IS
  'true cuando el movimiento ya fue incluido en un billing exportado / empujado a Extensiv.';
COMMENT ON COLUMN seko_movements.raw IS
  'Payload original de la fila Excel, por si el parser no captura todos los campos.';
