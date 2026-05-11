-- ============================================================================
-- Migration: Task Tracker
-- Proyecto: CRM Supply Chain México
-- Reemplaza Calendario_General V2.xlsx
-- ============================================================================
--
-- Modelo:
--   - Auth es localStorage (no auth.users), por eso identificamos usuarios por
--     email (TEXT). El registro de empleados vive en team_members.
--   - Tareas asignables entre cualquier par de usuarios. Modelo Calendly:
--     se ve la disponibilidad real (horario − tareas activas) antes de proponer.
--   - Tracking robusto: timestamps siempre en server (now()). El cliente solo
--     dispara RPC; nunca calcula tiempo en local.
-- ============================================================================

-- 1. Categorías de tarea ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#1e3a5f',
  is_billable  BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

INSERT INTO task_categories (code, name, color, is_billable)
SELECT * FROM (VALUES
  ('almacen',    'Almacén',       '#28a745', true),
  ('sac',        'Servicio al Cliente', '#1e3a5f', true),
  ('transporte', 'Transportes',   '#dc3545', true),
  ('admin',      'Administración', '#6366f1', false),
  ('interno',    'Interno',       '#64748b', false)
) AS v(code, name, color, is_billable)
WHERE NOT EXISTS (SELECT 1 FROM task_categories tc WHERE tc.code = v.code);

-- 2. Estados de la tarea ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'propuesta','aceptada','rechazada',
    'en_curso','pausada','finalizada','cancelada'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Plantillas recurrentes (declaradas antes de tasks por la FK) ────────────
CREATE TABLE IF NOT EXISTS task_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT DEFAULT '',
  category_id           UUID REFERENCES task_categories(id),
  client_id             UUID REFERENCES clients(id),
  default_assignee_email TEXT NOT NULL,
  duration_minutes      INT  NOT NULL,
  recurrence_rule       TEXT NOT NULL,        -- RFC5545 RRULE simplificado
  start_time            TIME NOT NULL,        -- hora del día de la ocurrencia
  active                BOOLEAN NOT NULL DEFAULT true,
  created_by            TEXT NOT NULL,
  last_materialized_until DATE,                -- hasta qué día se materializó
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 4. Tareas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                 TEXT UNIQUE,           -- 'TASK00042'
  title               TEXT NOT NULL,
  description         TEXT DEFAULT '',
  category_id         UUID REFERENCES task_categories(id),
  client_id           UUID REFERENCES clients(id),
  operation_id        UUID REFERENCES operations(id),
  assigner_email      TEXT NOT NULL,
  assignee_email      TEXT NOT NULL,
  scheduled_start     TIMESTAMPTZ NOT NULL,
  scheduled_end       TIMESTAMPTZ NOT NULL,
  status              task_status NOT NULL DEFAULT 'propuesta',
  rejection_reason    TEXT,
  template_id         UUID REFERENCES task_templates(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT tasks_time_range CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee  ON tasks(assignee_email, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_tasks_assigner  ON tasks(assigner_email, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_client    ON tasks(client_id);

-- Auto-referencia TASK00001, TASK00002…
CREATE OR REPLACE FUNCTION generate_task_ref() RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(ref,'\D','','g'),'')::INT), 0) + 1
      INTO next_num FROM tasks;
    NEW.ref := 'TASK' || lpad(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_ref ON tasks;
CREATE TRIGGER trg_tasks_ref BEFORE INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION generate_task_ref();

-- 5. Time tracking (server-time autoritativo) ────────────────────────────────
CREATE TABLE IF NOT EXISTS task_time_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_email    TEXT NOT NULL,
  segment_type  TEXT NOT NULL DEFAULT 'work' CHECK (segment_type IN ('work','pause')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  CONSTRAINT tte_range CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_tte_task  ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_tte_user  ON task_time_entries(user_email, started_at);
CREATE INDEX IF NOT EXISTS idx_tte_open  ON task_time_entries(task_id) WHERE ended_at IS NULL;

-- 6. Notas ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_task ON task_notes(task_id, created_at);

-- 7. Horarios laborales (Calendly base) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_work_schedule (
  user_email   TEXT NOT NULL,
  day_of_week  INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  PRIMARY KEY (user_email, day_of_week, start_time),
  CONSTRAINT uws_range CHECK (end_time > start_time)
);

-- 8. Miembros del equipo (registro simple email + nombre) ────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  user_email   TEXT PRIMARY KEY,
  user_name    TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 9. Notificaciones in-app ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  payload     JSONB,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_email, read_at, created_at DESC);

-- ============================================================================
-- RPC: Timer atómico (start / pause / resume / finalize)
-- ============================================================================

CREATE OR REPLACE FUNCTION task_start_timer(p_task_id UUID, p_user_email TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql AS $$
DECLARE v_started TIMESTAMPTZ;
BEGIN
  UPDATE task_time_entries
     SET ended_at = now()
   WHERE task_id = p_task_id AND ended_at IS NULL;

  INSERT INTO task_time_entries (task_id, user_email, segment_type, started_at)
  VALUES (p_task_id, p_user_email, 'work', now())
  RETURNING started_at INTO v_started;

  UPDATE tasks SET status = 'en_curso' WHERE id = p_task_id;
  RETURN v_started;
END;
$$;

CREATE OR REPLACE FUNCTION task_pause_timer(p_task_id UUID, p_user_email TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql AS $$
DECLARE v_started TIMESTAMPTZ;
BEGIN
  UPDATE task_time_entries
     SET ended_at = now()
   WHERE task_id = p_task_id AND ended_at IS NULL AND segment_type = 'work';

  INSERT INTO task_time_entries (task_id, user_email, segment_type, started_at)
  VALUES (p_task_id, p_user_email, 'pause', now())
  RETURNING started_at INTO v_started;

  UPDATE tasks SET status = 'pausada' WHERE id = p_task_id;
  RETURN v_started;
END;
$$;

CREATE OR REPLACE FUNCTION task_resume_timer(p_task_id UUID, p_user_email TEXT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql AS $$
DECLARE v_started TIMESTAMPTZ;
BEGIN
  UPDATE task_time_entries
     SET ended_at = now()
   WHERE task_id = p_task_id AND ended_at IS NULL;

  INSERT INTO task_time_entries (task_id, user_email, segment_type, started_at)
  VALUES (p_task_id, p_user_email, 'work', now())
  RETURNING started_at INTO v_started;

  UPDATE tasks SET status = 'en_curso' WHERE id = p_task_id;
  RETURN v_started;
END;
$$;

CREATE OR REPLACE FUNCTION task_finalize_timer(p_task_id UUID, p_user_email TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE task_time_entries
     SET ended_at = now()
   WHERE task_id = p_task_id AND ended_at IS NULL;

  UPDATE tasks SET status = 'finalizada' WHERE id = p_task_id;
END;
$$;

-- ============================================================================
-- View: minutos trabajados por tarea (solo segmentos work)
-- ============================================================================
CREATE OR REPLACE VIEW task_work_minutes AS
SELECT
  t.id                                     AS task_id,
  t.client_id,
  t.assignee_email,
  COALESCE(SUM(EXTRACT(EPOCH FROM (
      COALESCE(tte.ended_at, now()) - tte.started_at)) / 60), 0)::NUMERIC(12,2) AS minutes
FROM tasks t
LEFT JOIN task_time_entries tte
  ON tte.task_id = t.id AND tte.segment_type = 'work'
GROUP BY t.id;

-- ============================================================================
-- RPC: Materializar plantillas recurrentes
--   Soporta:  FREQ=DAILY
--             FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
--             FREQ=MONTHLY;BYMONTHDAY=1
-- ============================================================================
CREATE OR REPLACE FUNCTION materialize_task_templates(p_until DATE DEFAULT (CURRENT_DATE + 7))
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  tmpl       RECORD;
  cursor_dt  DATE;
  freq       TEXT;
  byday      TEXT[];
  bymonthday INT;
  weekday_codes TEXT[] := ARRAY['SU','MO','TU','WE','TH','FR','SA'];
  inserted   INT := 0;
  start_ts   TIMESTAMPTZ;
  end_ts     TIMESTAMPTZ;
  exists_already BOOLEAN;
BEGIN
  FOR tmpl IN SELECT * FROM task_templates WHERE active = true LOOP
    cursor_dt := COALESCE(tmpl.last_materialized_until, CURRENT_DATE - 1) + 1;

    -- Parse RRULE
    freq := COALESCE((regexp_match(tmpl.recurrence_rule, 'FREQ=([A-Z]+)'))[1], 'DAILY');
    byday := string_to_array(COALESCE((regexp_match(tmpl.recurrence_rule, 'BYDAY=([A-Z,]+)'))[1], ''), ',');
    bymonthday := COALESCE(NULLIF((regexp_match(tmpl.recurrence_rule, 'BYMONTHDAY=(\d+)'))[1], '')::INT, 0);

    WHILE cursor_dt <= p_until LOOP
      IF (freq = 'DAILY')
         OR (freq = 'WEEKLY' AND weekday_codes[EXTRACT(DOW FROM cursor_dt)::INT + 1] = ANY(byday))
         OR (freq = 'MONTHLY' AND EXTRACT(DAY FROM cursor_dt)::INT = bymonthday)
      THEN
        start_ts := (cursor_dt + tmpl.start_time)::TIMESTAMPTZ;
        end_ts   := start_ts + (tmpl.duration_minutes || ' minutes')::INTERVAL;

        SELECT EXISTS (
          SELECT 1 FROM tasks
           WHERE template_id = tmpl.id AND scheduled_start = start_ts
        ) INTO exists_already;

        IF NOT exists_already THEN
          INSERT INTO tasks (
            title, description, category_id, client_id, assigner_email, assignee_email,
            scheduled_start, scheduled_end, status, template_id
          ) VALUES (
            tmpl.title, tmpl.description, tmpl.category_id, tmpl.client_id,
            tmpl.created_by, tmpl.default_assignee_email,
            start_ts, end_ts, 'aceptada', tmpl.id
          );
          inserted := inserted + 1;
        END IF;
      END IF;
      cursor_dt := cursor_dt + 1;
    END LOOP;

    UPDATE task_templates SET last_materialized_until = p_until WHERE id = tmpl.id;
  END LOOP;

  RETURN inserted;
END;
$$;

-- ============================================================================
-- Trigger: notificaciones automáticas
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_task_event() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_email, type, title, body, link, payload)
    VALUES (
      NEW.assignee_email,
      'task_proposed',
      'Nueva tarea: ' || NEW.title,
      'De ' || NEW.assigner_email,
      '/tasks/' || NEW.id,
      jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'aceptada' THEN
      INSERT INTO notifications (user_email, type, title, body, link, payload)
      VALUES (
        NEW.assigner_email, 'task_accepted',
        NEW.assignee_email || ' aceptó: ' || NEW.title,
        NULL, '/tasks/' || NEW.id,
        jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref)
      );
    ELSIF NEW.status = 'rechazada' THEN
      INSERT INTO notifications (user_email, type, title, body, link, payload)
      VALUES (
        NEW.assigner_email, 'task_rejected',
        NEW.assignee_email || ' rechazó: ' || NEW.title,
        NEW.rejection_reason, '/tasks/' || NEW.id,
        jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref)
      );
    ELSIF NEW.status = 'finalizada' THEN
      INSERT INTO notifications (user_email, type, title, body, link, payload)
      VALUES (
        NEW.assigner_email, 'task_finalized',
        NEW.assignee_email || ' finalizó: ' || NEW.title,
        NULL, '/tasks/' || NEW.id,
        jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_task ON tasks;
CREATE TRIGGER trg_notify_task AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_event();

-- ============================================================================
-- RLS — siguiendo el patrón abierto del resto del CRM
-- ============================================================================
ALTER TABLE task_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_work_schedule  ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY tc_all  ON task_categories     FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY ts_all  ON tasks               FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY tte_all ON task_time_entries   FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY tn_all  ON task_notes          FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY tpl_all ON task_templates      FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY uws_all ON user_work_schedule  FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY tm_all  ON team_members        FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY n_all   ON notifications       FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Realtime publication (para suscripciones de notificaciones)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
