-- ============================================================================
-- Módulo SAC · Ampliación de paqueterías
--
-- Agrega FedEx, DHL y Castores al catálogo permitido en guias_paqueteria.
-- Ejecutar en Supabase si la tabla ya existe con el CHECK anterior.
-- ============================================================================

ALTER TABLE guias_paqueteria
  DROP CONSTRAINT IF EXISTS guias_paqueteria_paqueteria_check;

ALTER TABLE guias_paqueteria
  ADD CONSTRAINT guias_paqueteria_paqueteria_check
  CHECK (paqueteria IN ('estafeta','ups','fedex','dhl','castores'));

COMMENT ON TABLE guias_paqueteria IS
  'Guías de paquetería emitidas por SAC (Estafeta/UPS/FedEx/DHL/Castores). Liga costo y precio a una transacción Extensiv o a una referencia manual.';
