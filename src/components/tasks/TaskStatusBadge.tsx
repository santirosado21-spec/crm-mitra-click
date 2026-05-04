import { TASK_STATUS_LABEL, TASK_STATUS_COLOR, type TaskStatus } from '../../types/tasks'

export function TaskStatusBadge({ status, size = 'sm' }: { status: TaskStatus; size?: 'sm' | 'md' }) {
  const color = TASK_STATUS_COLOR[status]
  const padding = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding}`}
      style={{ background: `${color}1a`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {TASK_STATUS_LABEL[status]}
    </span>
  )
}
