// Task Tracker — types

export type TaskStatus =
  | 'propuesta'
  | 'aceptada'
  | 'rechazada'
  | 'en_curso'
  | 'pausada'
  | 'finalizada'
  | 'cancelada'

export type TaskCategoryCode = 'almacen' | 'sac' | 'transporte' | 'admin' | 'interno'

export interface TaskCategory {
  id:           string
  code:         TaskCategoryCode | string
  name:         string
  color:        string
  is_billable:  boolean
  created_at?:  string
}

export interface Task {
  id:               string
  ref:              string | null
  title:            string
  description:      string
  category_id:      string | null
  client_id:        string | null
  operation_id:     string | null
  assigner_email:   string
  assignee_email:   string
  scheduled_start:  string
  scheduled_end:    string
  status:           TaskStatus
  rejection_reason: string | null
  template_id:      string | null
  created_at:       string
  // joins (opcionales según query)
  category?:        TaskCategory | null
  client?:          { id: string; name: string; codigo: string | null } | null
}

export interface TaskTimeEntry {
  id:            string
  task_id:       string
  user_email:    string
  segment_type:  'work' | 'pause'
  started_at:    string
  ended_at:      string | null
}

export interface TaskNote {
  id:          string
  task_id:     string
  user_email:  string
  content:     string
  created_at:  string
}

export interface TaskTemplate {
  id:                       string
  title:                    string
  description:              string
  category_id:              string | null
  client_id:                string | null
  default_assignee_email:   string
  duration_minutes:         number
  recurrence_rule:          string
  start_time:               string  // 'HH:MM:SS'
  active:                   boolean
  created_by:               string
  last_materialized_until:  string | null
  created_at:               string
}

export interface UserWorkSchedule {
  user_email:   string
  day_of_week:  number  // 0 = Domingo … 6 = Sábado
  start_time:   string
  end_time:     string
}

export interface TeamMember {
  user_email:  string
  user_name:   string | null
  role:        'admin' | 'almacen' | 'servicio_cliente' | 'cobranza'
  active:      boolean
  created_at:  string
}

export interface Notification {
  id:          string
  user_email:  string
  type:        string
  title:       string
  body:        string | null
  link:        string | null
  payload:     Record<string, unknown> | null
  read_at:     string | null
  created_at:  string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  propuesta:   'Propuesta',
  aceptada:    'Aceptada',
  rechazada:   'Rechazada',
  en_curso:    'En curso',
  pausada:     'Pausada',
  finalizada:  'Finalizada',
  cancelada:   'Cancelada',
}

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  propuesta:   '#ffc107',
  aceptada:    '#1e3a5f',
  rechazada:   '#dc3545',
  en_curso:    '#28a745',
  pausada:     '#f59e0b',
  finalizada:  '#64748b',
  cancelada:   '#94a3b8',
}

export const DAY_OF_WEEK_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const
export const DAY_OF_WEEK_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const
