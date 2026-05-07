-- ============================================================================
-- TMS Paqueterías · shipping_rules
--
-- Reglas que el motor de auto-pick consulta antes de aplicar el score:
--   "Si distancia entre A y B km, y costo del rate está bajo X $, preferir
--    carrier Y servicio Z." También permite excluir carriers explícitamente.
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipping_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority            INT NOT NULL DEFAULT 100,             -- menor = se evalúa primero
  name                TEXT NOT NULL,
  description         TEXT DEFAULT '',
  -- Condiciones (todas opcionales — NULL = no se evalúa esa condición)
  distance_km_min     NUMERIC(8,2),
  distance_km_max     NUMERIC(8,2),
  max_cost_mxn        NUMERIC(12,2),
  -- Acción
  preferred_provider  TEXT,                                 -- 'easypost' | 'skydropx' | ...
  preferred_carrier   TEXT,                                 -- 'estafeta' | 'dhl' | ...
  preferred_service   TEXT,                                 -- 'SDS' | 'EXPRESS' | ...
  exclude_carriers    TEXT[] DEFAULT '{}',                  -- carriers a excluir
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT shipping_rules_distance_consistencia CHECK (
    distance_km_min IS NULL OR distance_km_max IS NULL
    OR distance_km_max >= distance_km_min
  )
);

CREATE INDEX IF NOT EXISTS idx_rules_priority ON shipping_rules(priority);
CREATE INDEX IF NOT EXISTS idx_rules_active   ON shipping_rules(active);

CREATE OR REPLACE FUNCTION shipping_rules_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rules_updated_at ON shipping_rules;
CREATE TRIGGER trg_rules_updated_at
  BEFORE UPDATE ON shipping_rules
  FOR EACH ROW EXECUTE FUNCTION shipping_rules_set_updated_at();

ALTER TABLE shipping_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_rules_admin_all ON shipping_rules;
-- Solo admin puede leer/escribir reglas (la lectura tampoco se hace a nivel
-- usuario final; el motor de autopick las consulta server-side cuando tenga
-- edge function. Mientras se hace client-side con admin requerido).
CREATE POLICY shipping_rules_admin_all ON shipping_rules
  FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- También permitir SELECT a todos los authenticated (las reglas se aplican
-- en el cliente, así que cualquiera con sesión necesita verlas).
DROP POLICY IF EXISTS shipping_rules_select_all ON shipping_rules;
CREATE POLICY shipping_rules_select_all ON shipping_rules
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE shipping_rules IS
  'Reglas de routing: filtran/priorizan rates por distancia y costo antes del auto-pick.';
