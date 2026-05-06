-- ============================================================================
-- RPC team_member_set_role
--
-- Permite cambiar rol / nombre / activo de un miembro del equipo sin chocar
-- con la RLS estricta de team_members (tm_admin_modify) cuando el JWT del
-- caller no está reconocido como admin.
--
-- Se ejecuta con SECURITY DEFINER (bypassea RLS) pero internamente verifica:
--   1. Hay sesión autenticada (auth.jwt() devuelve email).
--   2. El caller es admin activo en team_members
--      O bien la tabla está vacía / sin admins (modo bootstrap).
--
-- Esto evita el caso "se reinicia y anula el cambio" que ocurría cuando el
-- admin no estaba registrado en team_members con role='admin', porque RLS
-- silenciosamente afectaba 0 filas y el UI parecía resetearse.
-- ============================================================================

CREATE OR REPLACE FUNCTION team_member_set_role(
  p_email      TEXT,
  p_role       TEXT,
  p_user_name  TEXT DEFAULT NULL,
  p_active     BOOLEAN DEFAULT true
)
RETURNS team_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email TEXT;
  v_admin_count  INT;
  v_result       team_members%ROWTYPE;
BEGIN
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  IF v_caller_email = '' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Debes iniciar sesión.';
  END IF;

  IF p_role NOT IN ('admin','almacen','servicio_cliente','cobranza','transporte') THEN
    RAISE EXCEPTION 'INVALID_ROLE: % no es un rol válido.', p_role;
  END IF;

  -- Bootstrap: si aún no existe ningún admin activo en team_members,
  -- permitimos a cualquier usuario autenticado promover/registrar.
  SELECT count(*) INTO v_admin_count
  FROM team_members
  WHERE role = 'admin' AND active = true;

  IF v_admin_count > 0 THEN
    -- Hay al menos un admin: el caller también tiene que serlo.
    IF NOT EXISTS (
      SELECT 1 FROM team_members
      WHERE lower(user_email) = v_caller_email
        AND role = 'admin'
        AND active = true
    ) THEN
      RAISE EXCEPTION 'NOT_ADMIN: Tu cuenta (%) no tiene rol admin activo en team_members.', v_caller_email;
    END IF;
  END IF;

  -- Upsert con conflict-by-email.
  INSERT INTO team_members (user_email, user_name, role, active)
  VALUES (lower(p_email), p_user_name, p_role, p_active)
  ON CONFLICT (user_email) DO UPDATE SET
    user_name = COALESCE(EXCLUDED.user_name, team_members.user_name),
    role      = EXCLUDED.role,
    active    = EXCLUDED.active
  RETURNING * INTO v_result;

  RETURN v_result;
END $$;

REVOKE ALL    ON FUNCTION team_member_set_role(TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION team_member_set_role(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION team_member_set_role IS
  'Cambia rol/nombre/activo de un miembro del equipo. SECURITY DEFINER con check explícito de admin (o bootstrap si no hay admins).';


-- ============================================================================
-- RPC team_member_delete
-- Borrado físico de un miembro del equipo. Solo admins.
-- También limpia user_work_schedule del mismo email para evitar huérfanos.
-- ============================================================================

CREATE OR REPLACE FUNCTION team_member_delete(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email TEXT;
  v_target_email TEXT;
BEGIN
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_target_email := lower(p_email);

  IF v_caller_email = '' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Debes iniciar sesión.';
  END IF;

  -- El caller debe ser admin activo.
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE lower(user_email) = v_caller_email
      AND role = 'admin'
      AND active = true
  ) THEN
    RAISE EXCEPTION 'NOT_ADMIN: Tu cuenta (%) no tiene rol admin activo.', v_caller_email;
  END IF;

  -- Bloquear que un admin se borre a sí mismo (evita auto-locking).
  IF v_target_email = v_caller_email THEN
    RAISE EXCEPTION 'SELF_DELETE: No puedes borrar tu propia cuenta.';
  END IF;

  -- Borrar horarios primero (FK suave por email — no hay constraint pero igual limpiamos).
  DELETE FROM user_work_schedule WHERE lower(user_email) = v_target_email;

  -- Borrar miembro.
  DELETE FROM team_members WHERE lower(user_email) = v_target_email;
END $$;

REVOKE ALL    ON FUNCTION team_member_delete(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION team_member_delete(TEXT) TO authenticated;

COMMENT ON FUNCTION team_member_delete IS
  'Borrado físico de un miembro del equipo (incluye su horario laboral). Solo admins activos. Bloquea autoborrado.';
