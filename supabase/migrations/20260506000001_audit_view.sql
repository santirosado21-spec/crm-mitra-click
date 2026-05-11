-- ============================================================================
-- Sprint H · Vista para audit log con contexto enriquecido
-- Ejecutar después de v3 (que crea task_audit_log y trigger).
--
-- Une task_audit_log + tasks + team_members en una sola vista lista para
-- consumir desde la UI admin. Deriva action_category para filtros rápidos
-- ('accepted','rejected','cancelled','finalized','created','edited','other').
--
-- RLS pasthru: la vista hereda los permisos de las tablas base
-- (task_audit_log policies tal_select admin O participantes).
-- ============================================================================

CREATE OR REPLACE VIEW v_task_audit_full AS
SELECT
  a.id                                    AS audit_id,
  a.created_at                            AS audit_at,
  a.action,
  a.before,
  a.after,
  a.actor_email,
  COALESCE(tm.user_name, a.actor_email)   AS actor_name,
  tm.role                                 AS actor_role,
  t.id                                    AS task_id,
  t.ref                                   AS task_ref,
  t.title                                 AS task_title,
  t.status                                AS task_current_status,
  t.assigner_email,
  t.assignee_email,
  -- Categoría derivada para filtros rápidos en UI
  CASE
    WHEN a.action = 'created'                 THEN 'created'
    WHEN a.action = 'edited'                  THEN 'edited'
    WHEN a.action LIKE 'status:%→aceptada'    THEN 'accepted'
    WHEN a.action LIKE 'status:%→rechazada'   THEN 'rejected'
    WHEN a.action LIKE 'status:%→cancelada'   THEN 'cancelled'
    WHEN a.action LIKE 'status:%→finalizada'  THEN 'finalized'
    WHEN a.action LIKE 'status:%→en_curso'    THEN 'started'
    WHEN a.action LIKE 'status:%→pausada'     THEN 'paused'
    ELSE 'other'
  END                                     AS action_category
FROM task_audit_log a
LEFT JOIN tasks         t  ON t.id          = a.task_id
LEFT JOIN team_members  tm ON tm.user_email = a.actor_email;

-- Garantiza que la vista respete RLS al consultarla con anon/authenticated
ALTER VIEW v_task_audit_full SET (security_invoker = true);
