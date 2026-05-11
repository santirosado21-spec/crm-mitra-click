-- ============================================================================
-- Cartas de Instrucción · workflow SAC → Transportes
--
-- SAC genera la carta y la "envía" a Transportes (status='enviada'). Transportes
-- la ve en una bandeja y la convierte en Carta Porte. El payload completo de la
-- carta vive en columnas tipadas + un JSONB para mercancías (lista variable).
-- ============================================================================

CREATE TABLE IF NOT EXISTS cartas_instruccion (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio             TEXT NOT NULL UNIQUE,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  status            TEXT NOT NULL DEFAULT 'enviada'
    CHECK (status IN ('borrador','enviada','procesada','cancelada')),

  -- Cliente / referencias
  cliente_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  cliente_nombre    TEXT NOT NULL,
  referencia        TEXT,
  orden_compra      TEXT,
  tipo_servicio     TEXT,

  -- Origen / destino
  origen            TEXT,
  origen_direccion  TEXT,
  destino           TEXT NOT NULL,
  destino_direccion TEXT NOT NULL,
  fecha_carga       DATE,
  hora_carga        TEXT,
  fecha_entrega     DATE,
  hora_entrega      TEXT,
  contacto_carga    TEXT,
  contacto_entrega  TEXT,

  -- Vehículo / operador (opcionales en SAC; los confirma Transportes)
  unidad_sugerida   TEXT,
  operador_sugerido TEXT,
  placas_sugeridas  TEXT,
  maniobras         TEXT,
  sellos            TEXT,

  -- Documentación e instrucciones
  documentos        TEXT,
  instrucciones     TEXT,
  seguridad         TEXT,

  -- Mercancías: array de { descripcion, sku, cantidad, empaque, peso, valor }
  mercancias        JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_bultos      NUMERIC(12,2) DEFAULT 0,
  total_peso_kg     NUMERIC(12,2) DEFAULT 0,

  -- Trazabilidad SAC → Transportes
  enviada_por       TEXT,
  enviada_at        TIMESTAMPTZ,
  procesada_por     TEXT,
  procesada_at      TIMESTAMPTZ,
  carta_porte_id    UUID,                 -- FK suave: ID de la Carta Porte generada (puede no existir aún)

  notas             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_status_fecha ON cartas_instruccion(status, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ci_cliente     ON cartas_instruccion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ci_folio       ON cartas_instruccion(folio);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION cartas_instruccion_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ci_updated_at ON cartas_instruccion;
CREATE TRIGGER trg_ci_updated_at
  BEFORE UPDATE ON cartas_instruccion
  FOR EACH ROW EXECUTE FUNCTION cartas_instruccion_set_updated_at();

ALTER TABLE cartas_instruccion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_all_cartas_instruccion ON cartas_instruccion;
CREATE POLICY anon_all_cartas_instruccion
  ON cartas_instruccion FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE cartas_instruccion IS
  'Cartas de instrucción emitidas por SAC para Transportes. Se convierten en Carta Porte cuando Transportes las procesa.';
COMMENT ON COLUMN cartas_instruccion.status IS
  'borrador (SAC no ha enviado) · enviada (en bandeja Transportes) · procesada (ya hay Carta Porte) · cancelada';
COMMENT ON COLUMN cartas_instruccion.mercancias IS
  'JSONB array: [{descripcion, sku, cantidad, empaque, peso, valor}]';
