-- ============================================================================
-- Migration: Tarifarios + Servicios Adicionales + Clients update
-- Proyecto: CRM Supply Chain México
-- Fecha: 2026-04-01
-- ============================================================================

-- 1. Agregar campo 'codigo' a tabla clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE;

-- Poblar códigos de clientes existentes
-- (ejecutar solo si los clientes ya existen en la tabla)
UPDATE clients SET codigo = '200'  WHERE name = 'FITNESS FOR LIFE RIVIERA MAYA'  AND codigo IS NULL;
UPDATE clients SET codigo = '090'  WHERE name = 'FITNESS FOR LIFE MÉRIDA'        AND codigo IS NULL;
UPDATE clients SET codigo = 'VY8'  WHERE name = 'VERMONT YORK'                   AND codigo IS NULL;
UPDATE clients SET codigo = 'WD'   WHERE name = 'WORLD DIAGNOSTIC'               AND codigo IS NULL;
UPDATE clients SET codigo = '600'  WHERE name = 'EPOSNOW'                        AND codigo IS NULL;
UPDATE clients SET codigo = 'KST'  WHERE name = 'KST (SUPPLY CHAIN WORLDWIDE)'  AND codigo IS NULL;
UPDATE clients SET codigo = 'SK'   WHERE name = 'SEKO'                           AND codigo IS NULL;
UPDATE clients SET codigo = '070'  WHERE name = 'GNR'                            AND codigo IS NULL;
UPDATE clients SET codigo = 'BSF'  WHERE name = 'BASF'                           AND codigo IS NULL;
UPDATE clients SET codigo = 'KYN'  WHERE name = 'KYNDRYL'                        AND codigo IS NULL;
UPDATE clients SET codigo = '500'  WHERE name = 'ITWORKS'                        AND codigo IS NULL;
UPDATE clients SET codigo = 'RED'  WHERE name = 'LA RED'                         AND codigo IS NULL;
UPDATE clients SET codigo = 'LUL'  WHERE name = 'LULULEMON'                      AND codigo IS NULL;
UPDATE clients SET codigo = 'BB'   WHERE name = 'BURBERRY'                       AND codigo IS NULL;
UPDATE clients SET codigo = 'TB'   WHERE name = 'TOUGHBUILT'                     AND codigo IS NULL;
UPDATE clients SET codigo = '800'  WHERE name = 'RMC'                            AND codigo IS NULL;
UPDATE clients SET codigo = 'MC'   WHERE name = 'MICROCOMPUTADORAS'              AND codigo IS NULL;
UPDATE clients SET codigo = 'AZ'   WHERE name = 'ANTONIO ZAPATA'                 AND codigo IS NULL;
UPDATE clients SET codigo = 'PG'   WHERE name = 'PRINCIPLE GLOBAL'               AND codigo IS NULL;
UPDATE clients SET codigo = '700'  WHERE name = 'PANTANS'                        AND codigo IS NULL;
UPDATE clients SET codigo = '080'  WHERE name = 'CASIQUE RUTA NORMAL'            AND codigo IS NULL;
UPDATE clients SET codigo = 'AHT'  WHERE name = 'AHT'                            AND codigo IS NULL;
UPDATE clients SET codigo = '400'  WHERE name = 'TEQUILA ENEMIGO'                AND codigo IS NULL;
UPDATE clients SET codigo = 'IFT'  WHERE name = 'IFIT'                           AND codigo IS NULL;
UPDATE clients SET codigo = '071'  WHERE name = 'TARGET CONSULTING'              AND codigo IS NULL;

-- Insertar clientes que no existan
INSERT INTO clients (name, codigo, is_active)
SELECT v.name, v.codigo, true
FROM (VALUES
  ('FITNESS FOR LIFE RIVIERA MAYA', '200'),
  ('FITNESS FOR LIFE MÉRIDA', '090'),
  ('VERMONT YORK', 'VY8'),
  ('WORLD DIAGNOSTIC', 'WD'),
  ('EPOSNOW', '600'),
  ('KST (SUPPLY CHAIN WORLDWIDE)', 'KST'),
  ('SEKO', 'SK'),
  ('GNR', '070'),
  ('BASF', 'BSF'),
  ('KYNDRYL', 'KYN'),
  ('ITWORKS', '500'),
  ('LA RED', 'RED'),
  ('LULULEMON', 'LUL'),
  ('BURBERRY', 'BB'),
  ('TOUGHBUILT', 'TB'),
  ('RMC', '800'),
  ('MICROCOMPUTADORAS', 'MC'),
  ('ANTONIO ZAPATA', 'AZ'),
  ('PRINCIPLE GLOBAL', 'PG'),
  ('PANTANS', '700'),
  ('CASIQUE RUTA NORMAL', '080'),
  ('AHT', 'AHT'),
  ('TEQUILA ENEMIGO', '400'),
  ('IFIT', 'IFT'),
  ('TARGET CONSULTING', '071')
) AS v(name, codigo)
WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.codigo = v.codigo);

-- 2. Agregar campos URL evidencias a operations
ALTER TABLE operations ADD COLUMN IF NOT EXISTS url_evidencias TEXT DEFAULT '';
ALTER TABLE operations ADD COLUMN IF NOT EXISTS url_pod TEXT DEFAULT '';

-- 3. Crear tabla tarifarios
CREATE TABLE IF NOT EXISTS tarifarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  cliente_codigo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('almacenaje', 'transporte', 'maniobra', 'valor_agregado', 'otro')),
  concepto TEXT NOT NULL,
  unidad TEXT NOT NULL,
  precio NUMERIC(12,2) NOT NULL,
  moneda TEXT DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  notas TEXT DEFAULT '',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tarifarios_cliente ON tarifarios(cliente_codigo);
CREATE INDEX IF NOT EXISTS idx_tarifarios_categoria ON tarifarios(categoria);

-- 4. Crear tabla servicios_adicionales
CREATE TABLE IF NOT EXISTS servicios_adicionales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operacion_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  referencia TEXT NOT NULL,
  cliente_codigo TEXT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('almacenaje', 'transporte', 'maniobra', 'valor_agregado', 'otro')),
  concepto TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  unidad TEXT NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  moneda TEXT DEFAULT 'MXN',
  tarifa_id UUID REFERENCES tarifarios(id),
  registrado_por TEXT NOT NULL,
  fecha_servicio DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servicios_operacion ON servicios_adicionales(operacion_id);
CREATE INDEX IF NOT EXISTS idx_servicios_cliente ON servicios_adicionales(cliente_codigo);
CREATE INDEX IF NOT EXISTS idx_servicios_fecha ON servicios_adicionales(fecha_servicio);

-- 5. RLS (Row Level Security) - permitir acceso con anon key
ALTER TABLE tarifarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_adicionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total tarifarios" ON tarifarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total servicios" ON servicios_adicionales FOR ALL USING (true) WITH CHECK (true);
