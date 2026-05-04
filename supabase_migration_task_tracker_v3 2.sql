-- ============================================================================
-- Task Tracker · Migración v3
--   - EXCLUDE constraint en tasks para evitar overlaps
--   - RPC task_create_safe con guards de negocio
--   - Audit log de cambios
--   - pg_cron diario para materialize_task_templates
--   - Edge function email hooks (db_send_task_email)
-- Ejecutar DESPUÉS de v1 y v2.
-- ============================================================================

-- 1. Extensiones requeridas ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;       -- requerido para EXCLUDE TSTZRANGE + texto
CREATE EXTENSION IF NOT EXISTS pg_cron;          -- scheduler diario
CREATE EXTENSION IF NOT EXISTS pg_net;           -- HTTP POST para edge function

-- 2. EXCLUDE constraint: nadie tiene 2 tareas activas que se traslapen ──────
-- Estados activos = aceptada/en_curso/pausada (propuesta no bloquea aún)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS time_range tstzrange
    GENERATED ALWAYS AS (tstzrange(scheduled_start, scheduled_end, '[)')) STORED;

DO $$ BEGIN
  ALTER TABLE tasks
    ADD CONSTRAINT tasks_no_overlap
    EXCLUDE USING gist (
      assignee_email WITH =,
      time_range     WITH &&
    ) WHERE (status IN ('aceptada','en_curso','pausada'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. RPC task_create_safe con validaciones de negocio ────────────────────────
CREATE OR REPLACE FUNCTION task_create_safe(
  p_title           TEXT,
  p_description     TEXT,
  p_category_id     UUID,
  p_client_id       UUID,
  p_operation_id    UUID,
  p_assignee_email  TEXT,
  p_scheduled_start TIMESTAMPTZ,
  p_scheduled_end   TIMESTAMPTZ
) RETURNS tasks LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller   TEXT := current_user_email();
  v_assignee TEXT := lower(p_assignee_email);
  v_min_min  INT  := 15;
  v_max_min  INT  := 12 * 60;   -- 12 horas máximo por tarea
  v_dur_min  INT;
  v_inserted tasks;
BEGIN
  IF v_caller = '' THEN RAISE EXCEPTION 'no auth'; END IF;
  IF coalesce(trim(p_title),'') = '' THEN RAISE EXCEPTION 'Título requerido'; END IF;
  IF v_assignee = '' THEN RAISE EXCEPTION 'Destinatario requerido'; END IF;
  IF v_assignee = v_caller THEN RAISE EXCEPTION 'No puedes asignarte tareas a ti mismo'; END IF;
  IF p_scheduled_end <= p_scheduled_start THEN
    RAISE EXCEPTION 'La hora fin debe ser posterior a la hora inicio'; END IF;
  IF p_scheduled_start < now() - INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'No se pueden crear tareas en el pasado'; END IF;
  v_dur_min := EXTRACT(EPOCH FROM (p_scheduled_end - p_scheduled_start)) / 60;
  IF v_dur_min < v_min_min THEN RAISE EXCEPTION 'Duración mínima: % minutos', v_min_min; END IF;
  IF v_dur_min > v_max_min THEN RAISE EXCEPTION 'Duración máxima: % horas', v_max_min/60; END IF;

  -- Verifica que el destinatario exista y esté activo
  IF NOT EXISTS (SELECT 1 FROM team_members WHERE lower(user_email) = v_assignee AND active) THEN
    RAISE EXCEPTION 'El destinatario no es miembro activo del equipo';
  END IF;

  INSERT INTO tasks (
    title, description, category_id, client_id, operation_id,
    assigner_email, assignee_email, scheduled_start, scheduled_end, status
  ) VALUES (
    trim(p_title), coalesce(p_description,''), p_category_id, p_client_id, p_operation_id,
    v_caller, v_assignee, p_scheduled_start, p_scheduled_end, 'propuesta'
  )
  RETURNING * INTO v_inserted;
  RETURN v_inserted;
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Ese horario ya está ocupado para %', v_assignee;
END;
$$;

-- 4. RPC task_change_status con guards (acepta/rechaza/cancela) ──────────────
CREATE OR REPLACE FUNCTION task_change_status(
  p_task_id           UUID,
  p_new_status        task_status,
  p_rejection_reason  TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller   TEXT := current_user_email();
  v_task     tasks;
  v_admin    BOOLEAN := current_user_is_admin();
BEGIN
  IF v_caller = '' THEN RAISE EXCEPTION 'no auth'; END IF;
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Tarea no encontrada'; END IF;

  -- No se puede modificar status de tareas finalizadas o canceladas (excepto admin)
  IF v_task.status IN ('finalizada','cancelada') AND NOT v_admin THEN
    RAISE EXCEPTION 'La tarea ya está cerrada'; END IF;

  -- Reglas de transición:
  IF p_new_status = 'aceptada' THEN
    IF v_task.status <> 'propuesta' THEN RAISE EXCEPTION 'Solo se aceptan propuestas'; END IF;
    IF lower(v_task.assignee_email) <> v_caller AND NOT v_admin THEN
      RAISE EXCEPTION 'Solo el asignado puede aceptar'; END IF;
  ELSIF p_new_status = 'rechazada' THEN
    IF v_task.status <> 'propuesta' THEN RAISE EXCEPTION 'Solo se rechazan propuestas'; END IF;
    IF lower(v_task.assignee_email) <> v_caller AND NOT v_admin THEN
      RAISE EXCEPTION 'Solo el asignado puede rechazar'; END IF;
  ELSIF p_new_status = 'cancelada' THEN
    IF lower(v_task.assigner_email) <> v_caller
       AND lower(v_task.assignee_email) <> v_caller
       AND NOT v_admin THEN
      RAISE EXCEPTION 'No tienes permiso para cancelar esta tarea'; END IF;
    -- Cierra cualquier segmento de timer abierto al cancelar
    UPDATE task_time_entries SET ended_at = now()
     WHERE task_id = p_task_id AND ended_at IS NULL;
  ELSE
    RAISE EXCEPTION 'Status no soportado por este RPC: %', p_new_status;
  END IF;

  UPDATE tasks
     SET status = p_new_status,
         rejection_reason = CASE WHEN p_new_status = 'rechazada'
                                 THEN coalesce(p_rejection_reason, '') ELSE rejection_reason END
   WHERE id = p_task_id;
END;
$$;

-- 5. Audit log ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,
  before      JSONB,
  after       JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_task ON task_audit_log(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON task_audit_log(actor_email, created_at DESC);

ALTER TABLE task_audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tal_select ON task_audit_log FOR SELECT TO authenticated
    USING (current_user_is_admin() OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_audit_log.task_id
        AND (t.assigner_email = current_user_email()
          OR t.assignee_email = current_user_email())
    ));
  CREATE POLICY tal_insert ON task_audit_log FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION task_audit_trigger() RETURNS TRIGGER AS $$
DECLARE v_actor TEXT := coalesce(current_user_email(), 'system');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_audit_log (task_id, actor_email, action, after)
    VALUES (NEW.id, v_actor, 'created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO task_audit_log (task_id, actor_email, action, before, after)
      VALUES (NEW.id, v_actor, 'status:' || OLD.status || '→' || NEW.status,
              jsonb_build_object('status', OLD.status),
              jsonb_build_object('status', NEW.status, 'rejection_reason', NEW.rejection_reason));
    END IF;
    IF OLD.title IS DISTINCT FROM NEW.title
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start
       OR OLD.scheduled_end IS DISTINCT FROM NEW.scheduled_end
       OR OLD.client_id IS DISTINCT FROM NEW.client_id THEN
      INSERT INTO task_audit_log (task_id, actor_email, action, before, after)
      VALUES (NEW.id, v_actor, 'edited',
              jsonb_build_object('title', OLD.title, 'description', OLD.description,
                'scheduled_start', OLD.scheduled_start, 'scheduled_end', OLD.scheduled_end,
                'client_id', OLD.client_id),
              jsonb_build_object('title', NEW.title, 'description', NEW.description,
                'scheduled_start', NEW.scheduled_start, 'scheduled_end', NEW.scheduled_end,
                'client_id', NEW.client_id));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_audit ON tasks;
CREATE TRIGGER trg_task_audit AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION task_audit_trigger();

-- 6. pg_cron diario: materialize plantillas recurrentes 7 días adelante ─────
-- (idempotente: si ya existe el job lo recrea)
DO $$ BEGIN
  PERFORM cron.unschedule('materialize_task_templates_daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'materialize_task_templates_daily',
  '0 8 * * *',  -- 02:00 hora México (08:00 UTC)
  $$ SELECT materialize_task_templates(CURRENT_DATE + 7); $$
);

-- 7. Reportes operativos: vistas SQL ────────────────────────────────────────
CREATE OR REPLACE VIEW v_task_user_stats AS
SELECT
  assignee_email AS user_email,
  count(*) FILTER (WHERE status IN ('aceptada','en_curso','pausada')) AS open_tasks,
  count(*) FILTER (WHERE status = 'finalizada')                       AS finished,
  count(*) FILTER (WHERE status = 'rechazada')                        AS rejected,
  count(*) FILTER (WHERE status = 'cancelada')                        AS cancelled,
  count(*) FILTER (WHERE status NOT IN ('finalizada','cancelada')
                   AND scheduled_end < now())                          AS overdue,
  COALESCE(SUM((SELECT EXTRACT(EPOCH FROM (
                  COALESCE(tte.ended_at, now()) - tte.started_at)) / 60
                FROM task_time_entries tte
                WHERE tte.task_id = tasks.id AND tte.segment_type = 'work')), 0)::NUMERIC(12,2) AS total_minutes
FROM tasks
GROUP BY assignee_email;

-- 8. Edge Function email hook (lo dispara el cliente vía pg_net) ─────────────
-- La función la implementaremos como Supabase Edge Function (`notify-task-email`).
-- Aquí solo creamos la función SQL que el trigger de notificaciones usa para
-- empujar el evento. Si la Edge Function no está deployada aún, no truena el
-- trigger principal — usa BEGIN/EXCEPTION.

CREATE OR REPLACE FUNCTION db_send_task_email(
  p_to       TEXT,
  p_subject  TEXT,
  p_html     TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url     TEXT  := current_setting('app.settings.edge_email_url', true);
  v_secret  TEXT  := current_setting('app.settings.edge_email_secret', true);
  v_headers JSONB;
BEGIN
  IF v_url IS NULL OR v_url = '' THEN RETURN; END IF;
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || coalesce(v_secret, '')
  );
  PERFORM net.http_post(
    url     := v_url,
    headers := v_headers,
    body    := jsonb_build_object('to', p_to, 'subject', p_subject, 'html', p_html)
  );
EXCEPTION WHEN OTHERS THEN
  -- No tirar el trigger por fallas del email
  NULL;
END;
$$;

-- 9. Trigger de notificaciones reforzado: in-app + email ─────────────────────
CREATE OR REPLACE FUNCTION notify_task_event() RETURNS TRIGGER AS $$
DECLARE
  v_assigner_name TEXT;
  v_assignee_name TEXT;
BEGIN
  SELECT user_name INTO v_assigner_name FROM team_members WHERE user_email = NEW.assigner_email;
  SELECT user_name INTO v_assignee_name FROM team_members WHERE user_email = NEW.assignee_email;

  IF TG_OP = 'INSERT' THEN
    -- in-app
    INSERT INTO notifications (user_email, type, title, body, link, payload)
    VALUES (NEW.assignee_email, 'task_proposed',
      'Nueva tarea: ' || NEW.title,
      'De ' || coalesce(v_assigner_name, NEW.assigner_email),
      '/tasks/' || NEW.id,
      jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref));
    -- email
    PERFORM db_send_task_email(
      NEW.assignee_email,
      '[Supply Chain] Nueva tarea: ' || NEW.title,
      '<p>Hola ' || coalesce(v_assignee_name, '') || ',</p>' ||
      '<p><strong>' || coalesce(v_assigner_name, NEW.assigner_email) ||
        '</strong> te asignó una nueva tarea: <strong>' || NEW.title || '</strong>.</p>' ||
      '<p>Programada: ' || to_char(NEW.scheduled_start AT TIME ZONE 'America/Mexico_City', 'DD Mon YYYY HH24:MI') ||
      ' → ' || to_char(NEW.scheduled_end AT TIME ZONE 'America/Mexico_City', 'HH24:MI') || ' (CDMX)</p>' ||
      CASE WHEN coalesce(NEW.description,'') <> '' THEN '<p>' || NEW.description || '</p>' ELSE '' END ||
      '<p>Revísala en el CRM para aceptarla o rechazarla.</p>'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'aceptada' THEN
      INSERT INTO notifications (user_email, type, title, body, link, payload)
      VALUES (NEW.assigner_email, 'task_accepted',
        coalesce(v_assignee_name, NEW.assignee_email) || ' aceptó: ' || NEW.title, NULL,
        '/tasks/' || NEW.id, jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref));
    ELSIF NEW.status = 'rechazada' THEN
      INSERT INTO notifications (user_email, type, title, body, link, payload)
      VALUES (NEW.assigner_email, 'task_rejected',
        coalesce(v_assignee_name, NEW.assignee_email) || ' rechazó: ' || NEW.title, NEW.rejection_reason,
        '/tasks/' || NEW.id, jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref));
      PERFORM db_send_task_email(
        NEW.assigner_email,
        '[Supply Chain] Tarea rechazada: ' || NEW.title,
        '<p>' || coalesce(v_assignee_name, NEW.assignee_email) ||
        ' rechazó la tarea <strong>' || NEW.title || '</strong>.</p>' ||
        CASE WHEN coalesce(NEW.rejection_reason,'') <> ''
             THEN '<p>Motivo: ' || NEW.rejection_reason || '</p>' ELSE '' END
      );
    ELSIF NEW.status = 'finalizada' THEN
      INSERT INTO notifications (user_email, type, title, body, link, payload)
      VALUES (NEW.assigner_email, 'task_finalized',
        coalesce(v_assignee_name, NEW.assignee_email) || ' finalizó: ' || NEW.title, NULL,
        '/tasks/' || NEW.id, jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref));
      PERFORM db_send_task_email(
        NEW.assigner_email,
        '[Supply Chain] Tarea finalizada: ' || NEW.title,
        '<p>' || coalesce(v_assignee_name, NEW.assignee_email) ||
        ' finalizó la tarea <strong>' || NEW.title || '</strong>.</p>' ||
        '<p>Revisa el detalle en el CRM.</p>'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Recordatorios: notificación si quedan 30 min y aún no inicia ──────────
CREATE OR REPLACE FUNCTION generate_task_reminders() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inserted INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.id, t.ref, t.title, t.assignee_email, t.scheduled_start
      FROM tasks t
     WHERE t.status = 'aceptada'
       AND t.scheduled_start BETWEEN now() AND now() + INTERVAL '30 minutes'
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
          WHERE n.user_email = t.assignee_email
            AND (n.payload ->> 'task_id')::UUID = t.id
            AND n.type = 'task_reminder'
       )
  LOOP
    INSERT INTO notifications (user_email, type, title, body, link, payload)
    VALUES (r.assignee_email, 'task_reminder',
      'Recordatorio: ' || r.title || ' inicia pronto',
      'Programada: ' || to_char(r.scheduled_start AT TIME ZONE 'America/Mexico_City', 'HH24:MI'),
      '/tasks/' || r.id,
      jsonb_build_object('task_id', r.id, 'ref', r.ref));
    v_inserted := v_inserted + 1;
  END LOOP;
  RETURN v_inserted;
END;
$$;

-- pg_cron cada 5 min para recordatorios
DO $$ BEGIN
  PERFORM cron.unschedule('task_reminders_5min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('task_reminders_5min', '*/5 * * * *', $$ SELECT generate_task_reminders(); $$);
