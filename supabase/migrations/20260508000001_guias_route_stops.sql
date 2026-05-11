-- ============================================================================
-- TMS Guías de Paquetería · rutas manuales para mapa
--
-- Permite que una guía capturada manualmente guarde origen, destino y paradas
-- intermedias para que aparezca correctamente en /tms/parcel-map.
-- ============================================================================

ALTER TABLE guias_paqueteria
  ADD COLUMN IF NOT EXISTS route_stops JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN guias_paqueteria.from_postal_code IS
  'Código postal de origen usado para cotización/rastreo/mapa.';

COMMENT ON COLUMN guias_paqueteria.to_postal_code IS
  'Código postal de destino usado para cotización/rastreo/mapa.';

COMMENT ON COLUMN guias_paqueteria.route_stops IS
  'Paradas intermedias de ruta en JSON. Formato: [{ "cp": "64000", "label": "Monterrey" }].';
