-- ============================================================================
-- ARREGLO ONE-SHOT
--
-- Corre TODO ESTE ARCHIVO en una sola ejecución dentro del SQL Editor de
-- Supabase. La SQL Editor corre como superusuario, por lo que no la afectan
-- las policies de RLS — esto va a funcionar SÍ O SÍ.
--
-- Lo que hace:
--   1. Garantiza el CHECK constraint que permite role='transporte'.
--   2. Promueve a santirosado21@gmail.com como admin activo.
--   3. Da de alta a palvarez@supplychain.com.mx con role='transporte'.
--   4. Le pone horario L–V 08:30–18:30 a Paulina.
--   5. Verifica al final.
--
-- Si tu email admin NO es santirosado21@gmail.com, edita la línea (2) antes
-- de correr.
-- ============================================================================

BEGIN;

-- 1. Asegurar el CHECK con todos los roles válidos.
ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('admin','almacen','servicio_cliente','cobranza','transporte'));

-- 2. Promover (o crear) tu cuenta admin.
--    ⬇⬇ EDITA AQUÍ si tu email NO es santirosado21@gmail.com ⬇⬇
INSERT INTO team_members (user_email, user_name, role, active)
VALUES ('santirosado21@gmail.com', 'Santiago Rosado', 'admin', true)
ON CONFLICT (user_email) DO UPDATE SET
  role   = 'admin',
  active = true;

-- 3. Alta de Paulina como Transportes.
INSERT INTO team_members (user_email, user_name, role, active)
VALUES ('palvarez@supplychain.com.mx', 'Paulina Alvarez', 'transporte', true)
ON CONFLICT (user_email) DO UPDATE SET
  user_name = EXCLUDED.user_name,
  role      = 'transporte',
  active    = true;

-- 4. Horario default de Paulina: L–V 08:30–18:30.
INSERT INTO user_work_schedule (user_email, day_of_week, start_time, end_time)
SELECT 'palvarez@supplychain.com.mx', d, '08:30', '18:30'
FROM (VALUES (1),(2),(3),(4),(5)) AS days(d)
WHERE NOT EXISTS (
  SELECT 1 FROM user_work_schedule
  WHERE user_email = 'palvarez@supplychain.com.mx' AND day_of_week = days.d
);

COMMIT;

-- 5. Verificación: deberías ver al menos 2 filas (vos como admin y Paulina como transporte).
SELECT user_email, user_name, role, active
FROM team_members
WHERE user_email IN ('santirosado21@gmail.com', 'palvarez@supplychain.com.mx')
ORDER BY role;
