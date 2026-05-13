-- Agrega columna `proveedor_nombre` (texto libre) a las 3 tablas TMS.
--
-- Contexto: el schema original (20260504000014_tms.sql) modeló los proveedores
-- de transporte como FK (proveedor_id → proveedores_transporte). El código
-- evolucionó a usar texto libre (proveedor_nombre) porque la mayoría de los
-- proveedores son ad-hoc por viaje y no vale la pena pre-registrarlos.
--
-- Bug observado: al confirmar un viaje desde el Cotizador se trona con
-- "Could not find the 'proveedor_nombre' column of 'viajes' in the schema
-- cache" porque el código manda el campo pero la DB no lo tiene.
--
-- Fix: agregar la columna en las 3 tablas. proveedor_id se conserva por
-- compatibilidad con datos históricos.

ALTER TABLE viajes      ADD COLUMN IF NOT EXISTS proveedor_nombre TEXT;
ALTER TABLE vehiculos   ADD COLUMN IF NOT EXISTS proveedor_nombre TEXT;
ALTER TABLE operadores  ADD COLUMN IF NOT EXISTS proveedor_nombre TEXT;

-- Refresca el schema cache de PostgREST para que el campo aparezca de
-- inmediato sin reiniciar el proyecto.
NOTIFY pgrst, 'reload schema';
