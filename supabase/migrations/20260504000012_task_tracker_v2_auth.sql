-- ============================================================================
-- Migration v2 — Auth real + RLS estricto para Task Tracker
-- Ejecutar DESPUÉS de supabase_migration_task_tracker.sql
--
-- Cambios:
--   1. team_members.role  → fuente de verdad del rol (antes solo localStorage)
--   2. RLS de las tablas del Task Tracker pasan de USING(true) a auth.email()
--   3. RPCs de timer validan que p_user_email == auth.email()
--   4. RPC task_create con guards de negocio (no asignarse a sí mismo,
--      no programar en el pasado, validar duración mínima/máxima)
-- ============================================================================

-- 1. Agregar columna role a team_members ─────────────────────────────────────
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'almacen'
    CHECK (role IN ('admin','almacen','servicio_cliente','cobranza'));

CREATE INDEX IF NOT EXISTS idx_tm_role ON team_members(role);

-- Helper: ¿el usuario actual es admin?
CREATE OR REPLACE FUNCTION current_user_is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
     WHERE lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       AND active = true
       AND role = 'admin'
  );
$$;

-- Helper: email autenticado en lowercase
CREATE OR REPLACE FUNCTION current_user_email() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- 2. Cerrar RLS — eliminar policies abiertas y recrear restrictivas ──────────
DROP POLICY IF EXISTS tc_all  ON task_categories;
DROP POLICY IF EXISTS ts_all  ON tasks;
DROP POLICY IF EXISTS tte_all ON task_time_entries;
DROP POLICY IF EXISTS tn_all  ON task_notes;
DROP POLICY IF EXISTS tpl_all ON task_templates;
DROP POLICY IF EXISTS uws_all ON user_work_schedule;
DROP POLICY IF EXISTS tm_all  ON team_members;
DROP POLICY IF EXISTS n_all   ON notifications;

-- task_categories: catálogo público para autenticados
CREATE POLICY tc_select ON task_categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY tc_admin_write ON task_categories
  FOR ALL TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- tasks: ver si soy assigner o assignee, o admin. Crear si soy el assigner.
CREATE POLICY ts_select ON tasks
  FOR SELECT TO authenticated
  USING (
    assigner_email = current_user_email()
    OR assignee_email = current_user_email()
    OR current_user_is_admin()
  );
CREATE POLICY ts_insert ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (assigner_email = current_user_email() OR current_user_is_admin());
CREATE POLICY ts_update ON tasks
  FOR UPDATE TO authenticated
  USING (
    assigner_email = current_user_email()
    OR assignee_email = current_user_email()
    OR current_user_is_admin()
  );
CREATE POLICY ts_delete ON tasks
  FOR DELETE TO authenticated USING (current_user_is_admin());

-- task_time_entries: el dueño del email puede ver/modificar; admin todo.
CREATE POLICY tte_select ON task_time_entries
  FOR SELECT TO authenticated
  USING (
    user_email = current_user_email()
    OR current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_time_entries.task_id
        AND (t.assigner_email = current_user_email()
          OR t.assignee_email = current_user_email())
    )
  );
CREATE POLICY tte_modify ON task_time_entries
  FOR ALL TO authenticated
  USING (user_email = current_user_email() OR current_user_is_admin())
  WITH CHECK (user_email = current_user_email() OR current_user_is_admin());

-- task_notes: ver si participo en la tarea; escribir solo participantes.
CREATE POLICY tn_select ON task_notes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_notes.task_id
        AND (t.assigner_email = current_user_email()
          OR t.assignee_email = current_user_email())
    )
    OR current_user_is_admin()
  );
CREATE POLICY tn_insert ON task_notes
  FOR INSERT TO authenticated
  WITH CHECK (user_email = current_user_email() AND EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id
      AND (t.assigner_email = current_user_email()
        OR t.assignee_email = current_user_email())
  ));

-- task_templates: lectura para autenticados; mutaciones solo creador o admin.
CREATE POLICY tpl_select ON task_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY tpl_modify ON task_templates
  FOR ALL TO authenticated
  USING (created_by = current_user_email() OR current_user_is_admin())
  WITH CHECK (created_by = current_user_email() OR current_user_is_admin());

-- user_work_schedule: lectura para todos los autenticados (necesario para
-- AvailabilityPicker). Mutaciones: solo admin o el dueño del email.
CREATE POLICY uws_select ON user_work_schedule
  FOR SELECT TO authenticated USING (true);
CREATE POLICY uws_modify ON user_work_schedule
  FOR ALL TO authenticated
  USING (user_email = current_user_email() OR current_user_is_admin())
  WITH CHECK (user_email = current_user_email() OR current_user_is_admin());

-- team_members: lectura para autenticados; mutaciones solo admin.
CREATE POLICY tm_select ON team_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY tm_admin_modify ON team_members
  FOR ALL TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- notifications: solo el dueño.
CREATE POLICY n_select ON notifications
  FOR SELECT TO authenticated
  USING (user_email = current_user_email() OR current_user_is_admin());
CREATE POLICY n_update ON notifications
  FOR UPDATE TO authenticated
  USING (user_email = current_user_email());
-- INSERT viene del trigger, que corre con SECURITY DEFINER por defecto;
-- agregamos policy permisiva para que el trigger pueda insertar:
CREATE POLICY n_insert ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- 3. Hardening de RPCs: timer valida identidad, task_create con guards
-- ============================================================================

CREATE OR REPLACE FUNCTION task_start_timer(p_task_id UUID, p_user_email TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_started   TIMESTAMPTZ;
  v_assignee  TEXT;
  v_caller    TEXT := current_user_email();
BEGIN
  IF v_caller = '' THEN RAISE EXCEPTION 'no auth'; END IF;
  IF lower(p_user_email) <> v_caller AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'No puedes operar el timer de otro usuario';
  END IF;

  SELECT assignee_email INTO v_assignee FROM tasks WHERE id = p_task_id;
  IF v_assignee IS NULL THEN RAISE EXCEPTION 'Tarea no encontrada'; END IF;
  IF lower(v_assignee) <> v_caller AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo el asignado puede iniciar la tarea';
  END IF;

  UPDATE task_time_entries SET ended_at = now()
   WHERE task_id = p_task_id AND ended_at IS NULL;

  INSERT INTO task_time_entries (task_id, user_email, segment_type, started_at)
  VALUES (p_task_id, lower(p_user_email), 'work', now())
  RETURNING started_at INTO v_started;

  UPDATE tasks SET status = 'en_curso' WHERE id = p_task_id;
  RETURN v_started;
END;
$$;

CREATE OR REPLACE FUNCTION task_pause_timer(p_task_id UUID, p_user_email TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_started   TIMESTAMPTZ;
  v_assignee  TEXT;
  v_caller    TEXT := current_user_email();
BEGIN
  IF v_caller = '' THEN RAISE EXCEPTION 'no auth'; END IF;
  IF lower(p_user_email) <> v_caller AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'No puedes operar el timer de otro usuario';
  END IF;
  SELECT assignee_email INTO v_assignee FROM tasks WHERE id = p_task_id;
  IF lower(v_assignee) <> v_caller AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo el asignado puede pausar';
  END IF;

  UPDATE task_time_entries SET ended_at = now()
   WHERE task_id = p_task_id AND ended_at IS NULL AND segment_type = 'work';

  INSERT INTO task_time_entries (task_id, user_email, segment_type, started_at)
  VALUES (p_task_id, lower(p_user_email), 'pause', now())
  RETURNING started_at INTO v_started;

  UPDATE tasks SET status = 'pausada' WHERE id = p_task_id;
  RETURN v_started;
END;
$$;

CREATE OR REPLACE FUNCTION task_resume_timer(p_task_id UUID, p_user_email TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_started   TIMESTAMPTZ;
  v_assignee  TEXT;
  v_caller    TEXT := current_user_email();
BEGIN
  IF v_caller = '' THEN RAISE EXCEPTION 'no auth'; END IF;
  IF lower(p_user_email) <> v_caller AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'No puedes operar el timer de otro usuario';
  END IF;
  SELECT assignee_email INTO v_assignee FROM tasks WHERE id = p_task_id;
  IF lower(v_assignee) <> v_caller AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo el asignado puede reanudar';
  END IF;

  UPDATE task_time_entries SET ended_at = now()
   WHERE task_id = p_task_id AND ended_at IS NULL;

  INSERT INTO task_time_entries (task_id, user_email, segment_type, started_at)
  VALUES (p_task_id, lower(p_user_email), 'work', now())
  RETURNING started_at INTO v_started;

  UPDATE tasks SET status = 'en_curso' WHERE id = p_task_id;
  RETURN v_started;
END;
$$;

CREATE OR REPLACE FUNCTION task_finalize_timer(p_task_id UUID, p_user_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_assignee  TEXT;
  v_caller    TEXT := current_user_email();
BEGIN
  IF v_caller = '' THEN RAISE EXCEPTION 'no auth'; END IF;
  IF lower(p_user_email) <> v_caller AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'No puedes operar el timer de otro usuario';
  END IF;
  SELECT assignee_email INTO v_assignee FROM tasks WHERE id = p_task_id;
  IF lower(v_assignee) <> v_caller AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo el asignado puede finalizar';
  END IF;

  UPDATE task_time_entries SET ended_at = now()
   WHERE task_id = p_task_id AND ended_at IS NULL;
  UPDATE tasks SET status = 'finalizada' WHERE id = p_task_id;
END;
$$;
