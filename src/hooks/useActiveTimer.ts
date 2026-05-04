import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface ActiveTimerInfo {
  taskId:    string
  ref:       string | null
  title:     string
  startedAt: string  // ISO del segmento WORK abierto
}

/**
 * Devuelve la tarea + segmento de tiempo abierto (work) del usuario actual.
 * Se refresca al montar y cada 30 s. Si no hay timer activo, devuelve null.
 */
export function useActiveTimer(userEmail: string | undefined) {
  const [active, setActive] = useState<ActiveTimerInfo | null>(null)
  const [, setTick] = useState(0)

  const reload = useCallback(async () => {
    if (!userEmail) { setActive(null); return }
    const { data } = await supabase
      .from('task_time_entries')
      .select('task_id, started_at, segment_type, ended_at, tasks!inner(id, ref, title)')
      .eq('user_email', userEmail)
      .eq('segment_type', 'work')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) { setActive(null); return }
    type Row = {
      task_id: string
      started_at: string
      tasks: { id: string; ref: string | null; title: string } | { id: string; ref: string | null; title: string }[]
    }
    const row = data as unknown as Row
    const task = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks
    setActive({
      taskId:    row.task_id,
      ref:       task?.ref ?? null,
      title:     task?.title ?? '',
      startedAt: row.started_at,
    })
  }, [userEmail])

  useEffect(() => { reload() }, [reload])
  // tick cada 1s para refrescar el cronómetro visible
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(i)
  }, [])
  // poll cada 30s para detectar cambios externos (otra pestaña, RPC server-side)
  useEffect(() => {
    const i = setInterval(reload, 30_000)
    return () => clearInterval(i)
  }, [reload])

  const elapsedSeconds = active
    ? Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000))
    : 0

  return { active, elapsedSeconds, reload }
}

export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':')
}
