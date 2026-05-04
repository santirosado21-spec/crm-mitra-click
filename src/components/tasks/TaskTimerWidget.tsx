import { Play, Pause, Square, Loader2 } from 'lucide-react'
import { useTaskTimer, formatHMS } from '../../hooks/useTaskTimer'
import { useToast } from '../../hooks/useToast'

interface Props {
  taskId:     string
  userEmail:  string
  /** si true, oculta finalizar y muestra solo iniciar/pausar (asignador puede ver pero no controlar) */
  readOnly?:  boolean
}

export function TaskTimerWidget({ taskId, userEmail, readOnly = false }: Props) {
  const { state, elapsedSeconds, loading, error, start, pause, resume, finalize } = useTaskTimer(taskId, userEmail)
  const toast = useToast()

  const wrap = (fn: () => Promise<void>, ok: string) => async () => {
    try { await fn(); toast.success(ok) }
    catch (e: unknown) { toast.error('Error de timer', e instanceof Error ? e.message : 'No se pudo procesar') }
  }
  const onStart = wrap(start, 'Timer iniciado')
  const onPause = wrap(pause, 'Timer pausado')
  const onResume = wrap(resume, 'Timer reanudado')
  const onFinalize = wrap(finalize, 'Tarea finalizada')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tiempo trackeado</p>
          <p className="kpi-number text-3xl sm:text-4xl text-gray-900 mt-1 tabular-nums">
            {formatHMS(elapsedSeconds)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estado</p>
          <p className="text-sm font-semibold mt-1" style={{
            color: state === 'running' ? '#28a745' : state === 'paused' ? '#f59e0b' : state === 'finished' ? '#64748b' : '#94a3b8',
          }}>
            {state === 'running' ? 'En curso' : state === 'paused' ? 'Pausada' : state === 'finished' ? 'Finalizada' : 'Sin iniciar'}
          </p>
        </div>
      </div>

      {!readOnly && (
        <div className="p-4 sm:p-5 grid grid-cols-2 gap-3">
          {state === 'idle' && (
            <button
              type="button"
              disabled={loading}
              onClick={onStart}
              className="col-span-2 inline-flex items-center justify-center gap-2 min-h-[56px] rounded-xl text-base font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
              style={{ background: 'var(--brand-green, #28a745)' }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
              Iniciar tarea
            </button>
          )}

          {state === 'running' && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={onPause}
                className="inline-flex items-center justify-center gap-2 min-h-[56px] rounded-xl text-base font-semibold border-2 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Pause size={20} />}
                Pausar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onFinalize}
                className="inline-flex items-center justify-center gap-2 min-h-[56px] rounded-xl text-base font-semibold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
                style={{ background: 'var(--brand-navy)' }}
              >
                <Square size={20} /> Finalizar
              </button>
            </>
          )}

          {state === 'paused' && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={onResume}
                className="inline-flex items-center justify-center gap-2 min-h-[56px] rounded-xl text-base font-semibold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
                style={{ background: 'var(--brand-green, #28a745)' }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                Reanudar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onFinalize}
                className="inline-flex items-center justify-center gap-2 min-h-[56px] rounded-xl text-base font-semibold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
                style={{ background: 'var(--brand-navy)' }}
              >
                <Square size={20} /> Finalizar
              </button>
            </>
          )}

          {state === 'finished' && (
            <p className="col-span-2 text-center text-sm text-gray-500 py-3">
              Tarea finalizada · tiempo registrado
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="px-5 py-2 border-t border-rose-100 bg-rose-50 text-xs text-rose-700">
          {error}
        </div>
      )}
    </div>
  )
}
