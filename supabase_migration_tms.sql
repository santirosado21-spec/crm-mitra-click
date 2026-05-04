-- ============================================================================
-- Migration: TMS Module — Transport Management System
-- Proyecto: CRM Supply Chain Mexico
-- ============================================================================

-- ── 1. proveedores_transporte (Fleteros externos) ──────────────────────────
CREATE TABLE IF NOT EXISTS proveedores_transporte (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  rfc             TEXT,
  contacto_nombre TEXT DEFAULT '',
  contacto_email  TEXT DEFAULT '',
  contacto_telefono TEXT DEFAULT '',
  tipos_vehiculo  TEXT[] DEFAULT '{}',
  tarifa_base_km  NUMERIC(10,2) DEFAULT 0,
  calificacion    NUMERIC(3,1) DEFAULT 5.0 CHECK (calificacion >= 0 AND calificacion <= 5),
  notas           TEXT DEFAULT '',
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prov_nombre ON proveedores_transporte(nombre);
CREATE INDEX IF NOT EXISTS idx_prov_activo ON proveedores_transporte(activo);

-- ── 2. vehiculos (Propios + Externos — reemplaza UNIDADES hardcoded) ───────
CREATE TABLE IF NOT EXISTS vehiculos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave           TEXT NOT NULL UNIQUE,
  placa           TEXT NOT NULL,
  modelo          TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  combustible     TEXT NOT NULL CHECK (combustible IN ('Diesel','Gasolina')),
  rendimiento     NUMERIC(6,2) NOT NULL,
  depreciacion    NUMERIC(10,2) DEFAULT 0,
  es_propio       BOOLEAN DEFAULT true,
  proveedor_id    UUID REFERENCES proveedores_transporte(id) ON DELETE SET NULL,
  motive_vehicle_id TEXT,
  año             INTEGER,
  vin             TEXT,
  color           TEXT DEFAULT '',
  capacidad_kg    NUMERIC(10,2) DEFAULT 0,
  activo          BOOLEAN DEFAULT true,
  notas           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_clave ON vehiculos(clave);
CREATE INDEX IF NOT EXISTS idx_vehiculos_placa ON vehiculos(placa);
CREATE INDEX IF NOT EXISTS idx_vehiculos_proveedor ON vehiculos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_motive ON vehiculos(motive_vehicle_id);

-- ── 3. operadores (Propios + Externos) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS operadores (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  telefono        TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  licencia_tipo   TEXT DEFAULT '',
  licencia_numero TEXT DEFAULT '',
  licencia_vigencia DATE,
  es_propio       BOOLEAN DEFAULT true,
  proveedor_id    UUID REFERENCES proveedores_transporte(id) ON DELETE SET NULL,
  motive_user_id  TEXT,
  sueldo_diario   NUMERIC(10,2) DEFAULT 420,
  activo          BOOLEAN DEFAULT true,
  notas           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operadores_nombre ON operadores(nombre);
CREATE INDEX IF NOT EXISTS idx_operadores_proveedor ON operadores(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_operadores_motive ON operadores(motive_user_id);

-- ── 4. viajes (Despachos vinculados a operaciones) ─────────────────────────
CREATE TABLE IF NOT EXISTS viajes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operacion_id    UUID REFERENCES operations(id) ON DELETE SET NULL,
  vehiculo_id     UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
  operador_id     UUID REFERENCES operadores(id) ON DELETE SET NULL,
  proveedor_id    UUID REFERENCES proveedores_transporte(id) ON DELETE SET NULL,
  origen          TEXT NOT NULL DEFAULT '',
  destino         TEXT NOT NULL DEFAULT '',
  km_estimados    NUMERIC(10,2) DEFAULT 0,
  km_reales       NUMERIC(10,2) DEFAULT 0,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','asignado','en_transito','entregado','completado','cancelado')),
  fecha_programada  DATE,
  fecha_salida      TIMESTAMPTZ,
  fecha_llegada     TIMESTAMPTZ,
  fecha_completado  TIMESTAMPTZ,
  costo_combustible  NUMERIC(12,2) DEFAULT 0,
  costo_casetas      NUMERIC(12,2) DEFAULT 0,
  costo_viaticos     NUMERIC(12,2) DEFAULT 0,
  costo_proveedor    NUMERIC(12,2) DEFAULT 0,
  costo_total        NUMERIC(12,2) DEFAULT 0,
  ingreso_cliente    NUMERIC(12,2) DEFAULT 0,
  margen             NUMERIC(12,2) DEFAULT 0,
  motive_dispatch_id TEXT,
  motive_status      TEXT DEFAULT '',
  notas           TEXT DEFAULT '',
  creado_por      TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viajes_operacion ON viajes(operacion_id);
CREATE INDEX IF NOT EXISTS idx_viajes_vehiculo ON viajes(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_viajes_operador ON viajes(operador_id);
CREATE INDEX IF NOT EXISTS idx_viajes_proveedor ON viajes(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON viajes(estado);
CREATE INDEX IF NOT EXISTS idx_viajes_fecha ON viajes(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_viajes_motive ON viajes(motive_dispatch_id);

-- ── 5. Seed: migrar UNIDADES hardcoded ─────────────────────────────────────
INSERT INTO vehiculos (clave, placa, modelo, tipo, combustible, rendimiento, depreciacion, es_propio) VALUES
  ('RAB_54AK8K','54AK8K','ISUZU Forward','Rabon','Diesel',3.2,346.78,true),
  ('RAB_56AK8K','56AK8K','VW Constellation','Rabon','Diesel',3.8,132.87,true),
  ('RAB_57AK8K','57AK8K','ISUZU Forward','Rabon','Diesel',2.0,129.43,true),
  ('VAN_98D4AA','98D4AA','VW Transporter','Van','Gasolina',5.5,86.51,true),
  ('VAN_D41BPR','D41BPR','VW Caddy','Van ligera','Gasolina',9.5,122.13,true),
  ('AUT_MGP230A','MGP230A','KIA Rio','Auto chico','Gasolina',14.0,35.96,true)
ON CONFLICT (clave) DO NOTHING;

-- ── 6. Seed: operadores existentes ─────────────────────────────────────────
INSERT INTO operadores (nombre, es_propio, sueldo_diario)
SELECT v.nombre, true, 420
FROM (VALUES
  ('Luis Manuel Lopez Celis'),
  ('Jose Luis Martinez Gonzalez'),
  ('Estanislao Valverde Gonzalez'),
  ('Guadalupe Hernandez Jimenez'),
  ('Ruben Rodarte Martinez')
) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM operadores op WHERE op.nombre = v.nombre);

-- ── 7. RLS Policies ────────────────────────────────────────────────────────
ALTER TABLE proveedores_transporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_proveedores" ON proveedores_transporte FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_vehiculos" ON vehiculos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_operadores" ON operadores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_viajes" ON viajes FOR ALL USING (true) WITH CHECK (true);
