-- ============================================================================
-- Alta de Paulina Alvarez con rol Transportes + asegurar CHECK constraint
-- Idempotente: se puede correr varias veces sin efectos secundarios.
-- ============================================================================

-- 1. Garantizar que el CHECK constraint de team_members.role permite 'transporte'.
--    Si tu Supabase nunca aplicó supabase_migration_role_transporte.sql, los
--    intentos de cambiar rol a 'transporte' desde la UI fallan silenciosamente.
ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('admin','almacen','servicio_cliente','cobranza','transporte'));

-- 2. Alta / actualización de Paulina como Transportes activa.
INSERT INTO team_members (user_email, user_name, role, active)
VALUES ('palvarez@supplychain.com.mx', 'Paulina Alvarez', 'transporte', true)
ON CONFLICT (user_email) DO UPDATE SET
  user_name = EXCLUDED.user_name,
  role      = EXCLUDED.role,
  active    = EXCLUDED.active;

-- 3. Horario laboral default Transportes: L–V 08:30–18:30.
--    Sólo inserta días que aún no tenga registrados.
INSERT INTO user_work_schedule (user_email, day_of_week, start_time, end_time)
SELECT 'palvarez@supplychain.com.mx', d, '08:30', '18:30'
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
WHERE NOT EXISTS (
  SELECT 1 FROM user_work_schedule
  WHERE user_email = 'palvarez@supplychain.com.mx' AND day_of_week = days.d
);

-- 4. Verificación rápida.
SELECT user_email, user_name, role, active
FROM team_members
WHERE user_email = 'palvarez@supplychain.com.mx';
