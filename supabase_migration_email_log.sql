-- ============================================================================
-- Sprint A · Email log + endurecimiento de db_send_task_email
-- Ejecutar DESPUÉS de v1, v2, v3 (que ya tienes aplicados).
--
-- Por qué: hoy el trigger db_send_task_email tiene `EXCEPTION WHEN OTHERS THEN
-- NULL` y traga errores silenciosos. Si Resend rechaza un correo (dominio no
-- verificado, API key inválida, payload malformado), nunca te enteras. Esta
-- migración crea una tabla de log y refactoriza la función para que cada
-- intento deje rastro consultable.
-- ============================================================================

-- 1. Tabla de log -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email      TEXT NOT NULL,
  subject       TEXT,
  status        TEXT NOT NULL CHECK (status IN ('pending','sent','failed')),
  http_status   INT,
  error_message TEXT,
  task_id       UUID REFERENCES tasks(id) ON DELETE SET NULL,
  request_id    BIGINT,                      -- pg_net request_id (para correlación)
  attempted_at  TIMESTAMPTZ DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_email_log_status   ON email_log(status, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_task     ON email_log(task_id);
CREATE INDEX IF NOT EXISTS idx_email_log_request  ON email_log(request_id);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY el_admin_select ON email_log FOR SELECT TO authenticated
    USING (current_user_is_admin());
  CREATE POLICY el_insert       ON email_log FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY el_update       ON email_log FOR UPDATE TO authenticated
    USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. db_send_task_email reescrita con logging persistente -------------------
-- Recibe un task_id opcional para correlacionar el log con la tarea.
CREATE OR REPLACE FUNCTION db_send_task_email(
  p_to       TEXT,
  p_subject  TEXT,
  p_html     TEXT,
  p_task_id  UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url        TEXT;
  v_secret     TEXT;
  v_log_id     UUID;
  v_request_id BIGINT;
BEGIN
  -- Lee URL y secret del Vault
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'edge_email_url'    LIMIT 1;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'edge_email_secret' LIMIT 1;

  -- Inserta log en estado 'pending' antes de cualquier cosa
  INSERT INTO email_log (to_email, subject, status, task_id)
  VALUES (p_to, p_subject, 'pending', p_task_id)
  RETURNING id INTO v_log_id;

  IF v_url IS NULL OR v_url = '' THEN
    UPDATE email_log
       SET status = 'failed',
           error_message = 'edge_email_url no configurado en Vault',
           resolved_at = now()
     WHERE id = v_log_id;
    RETURN;
  END IF;

  BEGIN
    SELECT net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(v_secret, '')
      ),
      body    := jsonb_build_object('to', p_to, 'subject', p_subject, 'html', p_html)
    ) INTO v_request_id;

    -- pg_net es asíncrono: retornó request_id, la respuesta real se ve en
    -- net._http_response. Marcamos 'sent' tentativamente y guardamos el
    -- request_id; el monitor (paso 3) actualiza a 'failed' si HTTP no fue 2xx.
    UPDATE email_log
       SET status = 'sent',
           request_id = v_request_id,
           resolved_at = now()
     WHERE id = v_log_id;

  EXCEPTION WHEN OTHERS THEN
    UPDATE email_log
       SET status = 'failed',
           error_message = SQLERRM,
           resolved_at = now()
     WHERE id = v_log_id;
  END;
END;
$$;

-- 3. Reconciliador: corre cada minuto, lee net._http_response y actualiza
-- el email_log con los códigos HTTP reales que llegaron de la Edge Function.
CREATE OR REPLACE FUNCTION reconcile_email_log() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_updated INT := 0;
BEGIN
  WITH updated AS (
    UPDATE email_log el
       SET http_status = r.status_code,
           status      = CASE WHEN r.status_code BETWEEN 200 AND 299 THEN 'sent' ELSE 'failed' END,
           error_message = CASE WHEN r.status_code BETWEEN 200 AND 299 THEN NULL ELSE coalesce(r.content::TEXT, 'HTTP ' || r.status_code) END,
           resolved_at = now()
      FROM net._http_response r
     WHERE el.request_id = r.id
       AND el.http_status IS NULL          -- solo los que aún no se reconciliaron
    RETURNING 1
  )
  SELECT count(*) INTO v_updated FROM updated;
  RETURN v_updated;
END;
$$;

DO $$ BEGIN PERFORM cron.unschedule('reconcile_email_log_1min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('reconcile_email_log_1min', '* * * * *', $$ SELECT reconcile_email_log(); $$);

-- 4. Trigger notify_task_event: pasar task_id al log
-- Sobrescribe la versión de v3 para incluir el task_id en cada llamada.
CREATE OR REPLACE FUNCTION notify_task_event() RETURNS TRIGGER AS $$
DECLARE
  v_assigner_name TEXT;
  v_assignee_name TEXT;
BEGIN
  SELECT user_name INTO v_assigner_name FROM team_members WHERE user_email = NEW.assigner_email;
  SELECT user_name INTO v_assignee_name FROM team_members WHERE user_email = NEW.assignee_email;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_email, type, title, body, link, payload)
    VALUES (NEW.assignee_email, 'task_proposed',
      'Nueva tarea: ' || NEW.title,
      'De ' || coalesce(v_assigner_name, NEW.assigner_email),
      '/tasks/' || NEW.id,
      jsonb_build_object('task_id', NEW.id, 'ref', NEW.ref));

    PERFORM db_send_task_email(
      NEW.assignee_email,
      '[Supply Chain] Nueva tarea: ' || NEW.title,
      '<p>Hola ' || coalesce(v_assignee_name, '') || ',</p>' ||
      '<p><strong>' || coalesce(v_assigner_name, NEW.assigner_email) ||
        '</strong> te asignó una nueva tarea: <strong>' || NEW.title || '</strong>.</p>' ||
      '<p>Programada: ' || to_char(NEW.scheduled_start AT TIME ZONE 'America/Mexico_City', 'DD Mon YYYY HH24:MI') ||
      ' → ' || to_char(NEW.scheduled_end AT TIME ZONE 'America/Mexico_City', 'HH24:MI') || ' (CDMX)</p>' ||
      CASE WHEN coalesce(NEW.description,'') <> '' THEN '<p>' || NEW.description || '</p>' ELSE '' END ||
      '<p>Revísala en el CRM para aceptarla o rechazarla.</p>',
      NEW.id
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
             THEN '<p>Motivo: ' || NEW.rejection_reason || '</p>' ELSE '' END,
        NEW.id
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
        '<p>Revisa el detalle en el CRM.</p>',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
