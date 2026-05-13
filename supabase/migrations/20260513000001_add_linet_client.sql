-- Agrega cliente LINET al catálogo.
-- Codigo "LIN" derivado por convención (siglas).
--
-- LINET en Extensiv aparece como "Wissner-Bosserhoff Mexico, S. de R.L. de C.V."
-- (subsidiaria del grupo LINET SE). En el CRM lo manejamos como "LINET" por
-- request del usuario, pero el extensiv_customer_id = 39 hace el binding correcto
-- para que la visualización del CEDIS y los reportes de inventario funcionen.
--
-- Defensive: columnas codigo / extensiv_customer_id pueden no existir en prod
-- si la migración correspondiente no se aplicó (drift conocido).

ALTER TABLE clients ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS extensiv_customer_id INT;

INSERT INTO clients (name, codigo, extensiv_customer_id, is_active)
VALUES ('LINET', 'LIN', 39, TRUE)
ON CONFLICT (name) DO UPDATE
  SET codigo               = EXCLUDED.codigo,
      extensiv_customer_id = EXCLUDED.extensiv_customer_id,
      is_active            = TRUE,
      updated_at           = NOW();
