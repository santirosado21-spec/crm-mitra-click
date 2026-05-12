-- Agrega cliente WI-BO al catálogo de clientes.
-- Codigo "WB" derivado por convención (siglas).
--
-- Defensive: si la columna codigo no existe (drift entre prod y migrations),
-- la creamos antes de insertar.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS extensiv_customer_id INT;

INSERT INTO clients (name, codigo, is_active)
VALUES ('WI-BO', 'WB', TRUE)
ON CONFLICT (name) DO UPDATE
  SET codigo    = EXCLUDED.codigo,
      is_active = TRUE,
      updated_at = NOW();
