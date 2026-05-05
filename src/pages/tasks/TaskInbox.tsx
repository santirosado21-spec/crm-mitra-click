import { useEffect, useMemo, useState } from 'react'
import { Plus, Inbox, Send, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { TaskCard } from '../../components/tasks/TaskCard'
import { useTasks } from '../../hooks/useTasks'
import { useAuthContext } from '../../context/AuthContext'
import type { TaskStatus } from '../../types/tasks'

const STATUS_FILTERS: { key: 'pending' | 'active' | 'closed' | 'all'; label: string; statuses?: TaskStatus[] }[] = [
  { key: 'pending', label: 'Pendientes', statuses: ['propuesta', 'aceptada'] },
  { key: 'active',  label: 'En curso',   statuses: ['en_curso', 'pausada'] },
  { key: 'closed',  label: 'Cerradas',   statuses: ['finalizada', 'rechazada', 'cancelada'] },
  { key: 'all',     label: 'Todas' },
]

type Period = 'day' | 'week' | 'month' | 'year'

function startOfDay(d: Date)   { const r = new Date(d); r.setHours(0,0,0,0); return r }
function startOfWeek(d: Date)  { const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r }
function startOfMonth(d: Date) { const r = startOfDay(d); r.setDate(1); return r }
function startOfYear(d: Date)  { const r = startOfDay(d); r.setMonth(0,1); return r }
function addDays(d: Date, n: number)   { const r = new Date(d); r.setDate(r.getDate()+n); return r }
function addWeeks(d: Date, n: number)  { return addDays(d, n*7) }
function addMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth()+n); return r }
function addYears(d: Date, n: number)  { const r = new Date(d); r.setFullYear(r.getFullYear()+n); return r }

function rangeFor(period: Period, anchor: Date): { from: Date; to: Date; label: string } {
  const f = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('es-MX', opts)
  if (period === 'day') {
    const from = startOfDay(anchor), to = addDays(from, 1)
    return { from, to, label: f(from, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }
  }
  if (period === 'week') {
    const from = startOfWeek(anchor), to = addDays(from, 7)
    return { from, to, label: `Semana del ${f(from, { day: '2-digit', month: 'short' })} – ${f(addDays(to, -1), { day: '2-digit', month: 'short', year: 'numeric' })}` }
  }
  if (period === 'month') {
    const from = startOfMonth(anchor), to = addMonths(from, 1)
    return { from, to, label: f(from, { month: 'long', year: 'numeric' }) }
  }
  const from = startOfYear(anchor), to = addYears(from, 1)
  return { from, to, label: from.getFullYear().toString() }
}

export function TaskInbox() {
  const { user } = useAuthContext()
  const email = user?.email ?? ''
  const { tasks, loading, list } = useTasks()
  const [tab, setTab]       = useState<'received' | 'sent'>('received')
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]['key']>('pending')
  const [period, setPeriod] = useState<Period>('month')
  const [anchor, setAnchor] = useState<Date>(() => new Date())

  const range = useMemo(() => rangeFor(period, anchor), [period, anchor])

  useEffect(() => {
    if (!email) return
    const f = STATUS_FILTERS.find(s => s.key === filter)
    list({
      ...(tab === 'received' ? { assignee: email } : { assigner: email }),
      statuses: f?.statuses,
      fromDate: range.from.toISOString(),
      toDate:   range.to.toISOString(),
    })
  }, [email, tab, filter, range.from, range.to, list])

  const empty = useMemo(() => !loading && tasks.length === 0, [loading, tasks])

  const stepBack = () => setAnchor(a =>
    period === 'day' ? addDays(a, -1) :
    period === 'week' ? addWeeks(a, -1) :
    period === 'month' ? addMonths(a, -1) :
    addYears(a, -1)
  )
  const stepForward = () => setAnchor(a =>
    period === 'day' ? addDays(a, 1) :
    period === 'week' ? addWeeks(a, 1) :
    period === 'month' ? addMonths(a, 1) :
    addYears(a, 1)
  )

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Mi bandeja de tareas</h1>
              <p className="text-xs text-gray-400 mt-0.5">{email}</p>
            </div>
            <Link
              to="/tasks/new"
              className="inline-flex items-center justify-center gap-2 bg-[#1e3a5f] hover:opacity-90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.3)' }}
            >
              <Plus size={16} /> Nueva tarea
            </Link>
          </div>

          {/* Tab: recibidas vs enviadas */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setTab('received')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                tab === 'received' ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              style={tab === 'received' ? { background: 'var(--brand-navy)' } : undefined}
            >
              <Inbox size={14} /> Recibidas
            </button>
            <button
              type="button"
              onClick={() => setTab('sent')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                tab === 'sent' ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              style={tab === 'sent' ? { background: 'var(--brand-navy)' } : undefined}
            >
              <Send size={14} /> Enviadas
            </button>
          </div>

          {/* Period selector + navigator */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <div className="inline-flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm shrink-0">
              {(['day','week','month','year'] as Period[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPeriod(p); setAnchor(new Date()) }}
                  className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    period === p ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={period === p ? { background: 'var(--brand-navy)' } : undefined}
                >
                  {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm flex-1 sm:flex-none">
              <button
                type="button"
                onClick={stepBack}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                aria-label="Anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <p className="text-xs font-semibold text-gray-700 flex-1 text-center capitalize min-w-[180px]">
                {range.label}
              </p>
              <button
                type="button"
                onClick={stepForward}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                aria-label="Siguiente"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="text-[11px] font-semibold text-[#1e3a5f] hover:underline px-2"
            >
              Hoy
            </button>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_FILTERS.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setFilter(s.key)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-full transition-colors ${
                  filter === s.key
                    ? 'bg-[#1e3a5f] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando tareas...
            </div>
          )}

          {empty && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <p className="text-sm text-gray-400">No hay tareas en este período.</p>
              <Link
                to="/tasks/new"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-[#1e3a5f] hover:underline"
              >
                <Plus size={12} /> Crear una nueva
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {tasks.map(t => (
              <TaskCard key={t.id} task={t} currentEmail={email} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
