-- ============================================================================
-- Sprint B · Vínculo Extensiv Transaction ID en operations
-- Ejecutar después de v1, v2, v3 y email_log.
--
-- Por qué: hoy el tipo TypeScript Operation declara `extensiv_order_id` y
-- `extensiv_receipt_id`, pero el schema SQL real no las tiene. Esta migración
-- alinea schema con tipos y agrega columnas para que ExtensivOperationPicker
-- pueda persistir el Transaction ID de Extensiv contra cada operación.
--
-- Modelo simplificado: una operación apunta a UN transaction (order o receipt
-- o adjustment). La columna `extensiv_transaction_type` distingue cuál es.
-- ============================================================================

-- 1. Columnas en operations -------------------------------------------------
ALTER TABLE operations
  ADD COLUMN IF NOT EXISTS extensiv_transaction_type TEXT
    CHECK (extensiv_transaction_type IS NULL
        OR extensiv_transaction_type IN ('order','receipt','adjustment')),
  ADD COLUMN IF NOT EXISTS extensiv_transaction_id   TEXT,
  ADD COLUMN IF NOT EXISTS extensiv_customer_id      INT,
  ADD COLUMN IF NOT EXISTS extensiv_synced_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extensiv_raw              JSONB;
  -- extensiv_raw guarda el payload completo del detalle (orders/:id) para
  -- debug y para reusar campos sin tener que volver a llamar la API.

CREATE INDEX IF NOT EXISTS idx_ops_extensiv_txn      ON operations(extensiv_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ops_extensiv_customer ON operations(extensiv_customer_id);
CREATE INDEX IF NOT EXISTS idx_ops_extensiv_type     ON operations(extensiv_transaction_type)
  WHERE extensiv_transaction_type IS NOT NULL;

-- 2. Columnas en tasks (denormalización) -----------------------------------
-- Permite que una tarea guarde el Transaction Extensiv directamente sin
-- obligar a crear una operation completa primero. Si más tarde se crea la
-- operation desde Bitácora, puede inferir los Extensiv IDs desde la tarea.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS extensiv_transaction_type TEXT
    CHECK (extensiv_transaction_type IS NULL
        OR extensiv_transaction_type IN ('order','receipt','adjustment','manual')),
  ADD COLUMN IF NOT EXISTS extensiv_transaction_id   TEXT,
  ADD COLUMN IF NOT EXISTS extensiv_customer_id      INT,
  ADD COLUMN IF NOT EXISTS extensiv_reference        TEXT,
  ADD COLUMN IF NOT EXISTS extensiv_raw              JSONB;

CREATE INDEX IF NOT EXISTS idx_tasks_extensiv_txn      ON tasks(extensiv_transaction_id);
CREATE INDEX IF NOT EXISTS idx_tasks_extensiv_customer ON tasks(extensiv_customer_id);

-- 3. RPC task_create_safe extendido con campos Extensiv opcionales --------
-- Reemplaza la versión de v3. Los parámetros nuevos tienen DEFAULT NULL así
-- que las llamadas viejas siguen funcionando sin cambios.
CREATE OR REPLACE FUNCTION task_create_safe(
  p_title           TEXT,
  p_description     TEXT,
  p_category_id     UUID,
  p_client_id       UUID,
  p_operation_id    UUID,
  p_assignee_email  TEXT,
  p_scheduled_start TIMESTAMPTZ,
  p_scheduled_end   TIMESTAMPTZ,
  p_extensiv_transaction_type TEXT DEFAULT NULL,
  p_extensiv_transaction_id   TEXT DEFAULT NULL,
  p_extensiv_customer_id      INT  DEFAULT NULL,
  p_extensiv_reference        TEXT DEFAULT NULL,
  p_extensiv_raw              JSONB DEFAULT NULL
) RETURNS tasks LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller   TEXT := current_user_email();
  v_assignee TEXT := lower(p_assignee_email);
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
  IF v_dur_min < 15  THEN RAISE EXCEPTION 'Duración mínima: 15 minutos'; END IF;
  IF v_dur_min > 720 THEN RAISE EXCEPTION 'Duración máxima: 12 horas'; END IF;

  IF NOT EXISTS (SELECT 1 FROM team_members WHERE lower(user_email) = v_assignee AND active) THEN
    RAISE EXCEPTION 'El destinatario no es miembro activo del equipo';
  END IF;

  INSERT INTO tasks (
    title, description, category_id, client_id, operation_id,
    assigner_email, assignee_email, scheduled_start, scheduled_end, status,
    extensiv_transaction_type, extensiv_transaction_id, extensiv_customer_id,
    extensiv_reference, extensiv_raw
  ) VALUES (
    trim(p_title), coalesce(p_description,''), p_category_id, p_client_id, p_operation_id,
    v_caller, v_assignee, p_scheduled_start, p_scheduled_end, 'propuesta',
    p_extensiv_transaction_type, p_extensiv_transaction_id, p_extensiv_customer_id,
    p_extensiv_reference, p_extensiv_raw
  )
  RETURNING * INTO v_inserted;
  RETURN v_inserted;
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Ese horario ya está ocupado para %', v_assignee;
END;
$$;

-- 4. Vista de tareas con info Extensiv (para reportes) ---------------------
-- Mezcla columnas Extensiv directas en tasks con las heredadas de operations.
-- Si la tarea tiene operation_id, prefiere los IDs de operations (más fresco
-- según el flujo Bitácora); si no, usa los de tasks.
CREATE OR REPLACE VIEW v_task_with_extensiv AS
SELECT
  t.id                                                              AS task_id,
  t.ref                                                             AS task_ref,
  t.title,
  t.assignee_email,
  t.scheduled_start,
  t.scheduled_end,
  t.status                                                          AS task_status,
  o.id                                                              AS operation_id,
  o.referencia                                                      AS operation_ref,
  o.cliente_codigo,
  o.cliente_nombre,
  COALESCE(o.extensiv_transaction_type, t.extensiv_transaction_type) AS extensiv_transaction_type,
  COALESCE(o.extensiv_transaction_id,   t.extensiv_transaction_id)   AS extensiv_transaction_id,
  COALESCE(o.extensiv_customer_id,      t.extensiv_customer_id)      AS extensiv_customer_id,
  t.extensiv_reference
FROM tasks t
LEFT JOIN operations o ON o.id = t.operation_id;
