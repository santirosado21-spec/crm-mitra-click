import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { useActiveTimer, formatHMS } from '../../hooks/useActiveTimer'

export function TimerPill() {
  const { user } = useAuthContext()
  const { active, elapsedSeconds } = useActiveTimer(user?.email)

  if (!active) return null

  return (
    <Link
      to={`/tasks/${active.taskId}`}
      title={`En curso: ${active.title}`}
      className="hidden sm:inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors text-emerald-800 group"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <Play size={12} />
      <span className="text-[11px] font-mono font-bold tabular-nums">
        {formatHMS(elapsedSeconds)}
      </span>
      <span className="text-[11px] font-semibold max-w-[120px] truncate group-hover:underline">
        {active.ref ?? active.title}
      </span>
    </Link>
  )
}
