-- ============================================================================
-- Módulo SAC · Guías de paquetería (Estafeta / UPS)
--
-- Permite a SAC capturar costo y precio de cada guía emitida con Estafeta o
-- UPS, ligándola a una transacción Extensiv (clientes integrados: Epos,
-- ToughBuilt, iFit, FFL, Linet) o a una referencia manual (clientes Seko 365
-- cuyo inventario NO vive en Extensiv: BASF, KST, Lululemon, Burberry).
--
-- Patrón de Extensiv link tomado de supabase_migration_extensiv_link.sql.
-- ============================================================================

-- 1. Tabla principal --------------------------------------------------------
CREATE TABLE IF NOT EXISTS guias_paqueteria (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  paqueteria                  TEXT         NOT NULL CHECK (paqueteria IN ('estafeta','ups')),
  tracking_number             TEXT         NOT NULL,
  cliente_id                  UUID         NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  cliente_codigo              TEXT,
  costo                       NUMERIC(12,2) NOT NULL CHECK (costo  >= 0),
  precio                      NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  margen                      NUMERIC(12,2) GENERATED ALWAYS AS (precio - costo) STORED,
  fecha                       DATE         NOT NULL DEFAULT CURRENT_DATE,
  origen                      TEXT         NOT NULL CHECK (origen IN ('extensiv','manual')),
  extensiv_transaction_type   TEXT         CHECK (extensiv_transaction_type IS NULL
                                                  OR extensiv_transaction_type IN ('order','receipt')),
  extensiv_transaction_id     TEXT,
  extensiv_customer_id        INT,
  manual_reference            TEXT,
  notas                       TEXT         DEFAULT '',
  creado_por                  TEXT,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Si origen=extensiv, los 3 campos extensiv_* son obligatorios.
  -- Si origen=manual,    manual_reference es obligatoria.
  CONSTRAINT guias_origen_consistencia CHECK (
    (origen = 'extensiv'
      AND extensiv_transaction_type IS NOT NULL
      AND extensiv_transaction_id   IS NOT NULL
      AND extensiv_customer_id      IS NOT NULL)
    OR
    (origen = 'manual'
      AND manual_reference IS NOT NULL
      AND length(trim(manual_reference)) > 0)
  )
);

-- 2. Índices ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_guias_cliente_fecha     ON guias_paqueteria(cliente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_guias_extensiv_txn      ON guias_paqueteria(extensiv_transaction_id)
  WHERE extensiv_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guias_tracking          ON guias_paqueteria(tracking_number);
CREATE INDEX IF NOT EXISTS idx_guias_fecha             ON guias_paqueteria(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_guias_paqueteria        ON guias_paqueteria(paqueteria);

-- 3. Trigger updated_at -----------------------------------------------------
CREATE OR REPLACE FUNCTION guias_paqueteria_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guias_updated_at ON guias_paqueteria;
CREATE TRIGGER trg_guias_updated_at
  BEFORE UPDATE ON guias_paqueteria
  FOR EACH ROW EXECUTE FUNCTION guias_paqueteria_set_updated_at();

-- 4. RLS --------------------------------------------------------------------
ALTER TABLE guias_paqueteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_all_guias_paqueteria ON guias_paqueteria;
CREATE POLICY anon_all_guias_paqueteria
  ON guias_paqueteria FOR ALL USING (true) WITH CHECK (true);

-- 5. Comentarios ------------------------------------------------------------
COMMENT ON TABLE  guias_paqueteria IS
  'Guías de paquetería emitidas por SAC (Estafeta/UPS). Liga costo y precio a una transacción Extensiv o a una referencia manual.';
COMMENT ON COLUMN guias_paqueteria.costo           IS 'Costo MXN pagado a la paquetería';
COMMENT ON COLUMN guias_paqueteria.precio          IS 'Precio MXN cobrado al cliente final';
COMMENT ON COLUMN guias_paqueteria.margen          IS 'Diferencia precio - costo (auto)';
COMMENT ON COLUMN guias_paqueteria.origen          IS 'extensiv = ligada a transaction; manual = referencia libre (Seko 365 / PT)';
COMMENT ON COLUMN guias_paqueteria.manual_reference IS 'Folio externo cuando origen=manual (ej. Seko 365 #12345 o PT FFL-3344)';
