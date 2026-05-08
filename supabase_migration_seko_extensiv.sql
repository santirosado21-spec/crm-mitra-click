-- ============================================================================
-- Seko 365 → Extensiv Billing
--
-- Extiende el CHECK de extensiv_billing_log.source_table para permitir
-- 'seko_movements' como tabla origen, y deja un comentario explicando los
-- charge types nuevos. No se cambia el RPC `extensiv_log_attempt` porque
-- aceptaba TEXT libre (la validación vive en el CHECK).
--
-- Charge types nuevos (TEXT libre, sin enum):
--   MOVIMIENTO_SEKO_ENTRADA  → cobro por receipt importado del Excel Seko
--   MOVIMIENTO_SEKO_SALIDA   → cobro por order importado del Excel Seko
--
-- El amount se calcula del lado del cliente como cantidad × tarifario.precio
-- buscando el concepto que matchee "entrada"/"salida" en `tarifarios` para
-- el cliente_codigo. Después del push, el campo `seko_movements.billed` se
-- pasa a true para que la UI los muestre como facturados.
-- ============================================================================

ALTER TABLE extensiv_billing_log
  DROP CONSTRAINT IF EXISTS extensiv_billing_log_source_table_check;

ALTER TABLE extensiv_billing_log
  ADD CONSTRAINT extensiv_billing_log_source_table_check
  CHECK (source_table IN (
    'viajes',
    'operations',
    'servicios_adicionales',
    'seko_movements'
  ));

COMMENT ON COLUMN extensiv_billing_log.source_table IS
  'Tabla origen del charge: viajes | operations | servicios_adicionales | seko_movements.';
