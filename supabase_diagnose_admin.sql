-- ============================================================================
-- Diagnóstico: ¿por qué no se puede cambiar roles desde /tasks/admin/team?
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================

-- 1. ¿Quién está marcado como admin en team_members?
SELECT user_email, user_name, role, active, created_at
FROM team_members
WHERE role = 'admin' AND active = true
ORDER BY user_email;

-- 2. ¿Existe tu cuenta en team_members? Reemplaza el email por el tuyo.
SELECT user_email, user_name, role, active
FROM team_members
WHERE lower(user_email) = lower('santirosado21@gmail.com');

-- 3. ¿La función current_user_is_admin() está creada?
SELECT proname
FROM pg_proc
WHERE proname IN ('current_user_is_admin', 'current_user_email');

-- 4. ¿Las policies de team_members están activas?
SELECT polname, polcmd, polqual::text, polwithcheck::text
FROM pg_policy
WHERE polrelid = 'team_members'::regclass;

-- ============================================================================
-- FIX (descomentar y ajustar el email si lo necesitas):
-- Si tu cuenta NO aparece en (2) o no tiene role='admin', corre esto para
-- garantizar que tu sesión pueda mutar team_members.
-- ============================================================================

-- INSERT INTO team_members (user_email, user_name, role, active)
-- VALUES ('santirosado21@gmail.com', 'Santiago Rosado', 'admin', true)
-- ON CONFLICT (user_email) DO UPDATE SET
--   role   = 'admin',
--   active = true;
