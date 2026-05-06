import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  History, Search, ChevronDown, ChevronRight, ExternalLink,
  CheckCircle2, XCircle, Ban, Flag, Plus, Edit3, Play, Pause,
} from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { Sidebar } from '../../../components/layout/Sidebar'
import { Spinner } from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'
import {
  AUDIT_ACTION_COLOR, AUDIT_ACTION_LABEL,
  type TaskAuditAction, type TaskAuditEntry,
} from '../../../types/tasks'

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

type RangePreset = 'today' | '7d' | '30d' | 'month' | 'custom'

interface RangeFilter { preset: RangePreset; from: string; to: string }

function rangeFromPreset(preset: RangePreset, custom?: { from: string; to: string }): RangeFilter {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
  const fromIso = (d: Date) => d.toISOString()
  const toEod = (d: Date) => { const r = new Date(d); r.setHours(23,59,59,999); return r.toISOString() }

  if (preset === 'today')   return { preset, from: fromIso(todayStart),                          to: toEod(now) }
  if (preset === '7d')      { const f = new Date(now); f.setDate(f.getDate() - 7);  return { preset, from: fromIso(f), to: toEod(now) } }
  if (preset === '30d')     { const f = new Date(now); f.setDate(f.getDate() - 30); return { preset, from: fromIso(f), to: toEod(now) } }
  if (preset === 'month')   { const f = new Date(now.getFullYear(), now.getMonth(), 1); return { preset, from: fromIso(f), to: toEod(now) } }
  return { preset: 'custom', from: custom?.from ?? '', to: custom?.to ?? '' }
}

const ACTION_FILTERS: Array<{ key: TaskAuditAction | 'all'; label: string; icon: typeof Plus }> = [
  { key: 'all',       label: 'Todas',         icon: History     },
  { key: 'accepted',  label: 'Aceptaciones',  icon: CheckCircle2 },
  { key: 'rejected',  label: 'Rechazos',      icon: XCircle      },
  { key: 'cancelled', label: 'Cancelaciones', icon: Ban          },
  { key: 'finalized', label: 'Finalizaciones',icon: Flag         },
  { key: 'created',   label: 'Creaciones',    icon: Plus         },
  { key: 'edited',    label: 'Ediciones',     icon: Edit3        },
]

const CATEGORY_ICON: Record<TaskAuditAction, typeof Plus> = {
  created:   Plus,
  edited:    Edit3,
  accepted:  CheckCircle2,
  rejected:  XCircle,
  cancelled: Ban,
  finalized: Flag,
  started:   Play,
  paused:    Pause,
  other:     History,
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export function AuditLog() {
  const [actionFilter, setActionFilter] = useState<TaskAuditAction | 'all'>('all')
  const [range, setRange]               = useState<RangeFilter>(() => rangeFromPreset('7d'))
  const [customFrom, setCustomFrom]     = useState('')
  const [customTo, setCustomTo]         = useState('')
  const [search, setSearch]             = useState('')

  const [entries, setEntries] = useState<TaskAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /* Carga */
  useEffect(() => {
    setLoading(true); setError(null)
    let q = supabase
      .from('v_task_audit_full')
      .select('*')
      .gte('audit_at', range.from)
      .lte('audit_at', range.to)
      .order('audit_at', { ascending: false })
      .limit(500)

    if (actionFilter !== 'all') q = q.eq('action_category', actionFilter)

    q.then(({ data, error }) => {
      if (error) setError(error.message)
      else setEntries((data ?? []) as TaskAuditEntry[])
      setLoading(false)
    })
  }, [actionFilter, range])

  /* Búsqueda libre por TASK ref / actor */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e =>
      (e.task_ref ?? '').toLowerCase().includes(q) ||
      (e.task_title ?? '').toLowerCase().includes(q) ||
      e.actor_email.toLowerCase().includes(q) ||
      e.actor_name.toLowerCase().includes(q),
    )
  }, [entries, search])

  /* KPIs */
  const kpis = useMemo(() => {
    let total = 0, accepted = 0, rejected = 0, cancelled = 0
    for (const e of entries) {
      total++
      if (e.action_category === 'accepted')  accepted++
      if (e.action_category === 'rejected')  rejected++
      if (e.action_category === 'cancelled') cancelled++
    }
    return { total, accepted, rejected, cancelled }
  }, [entries])

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <History size={20} /> Auditoría de tareas
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Solo administradores · Quién aceptó, rechazó, canceló, editó cada tarea
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KPI title="Total acciones" value={String(kpis.total)}     color="#1e3a5f" icon={<History size={14}/>} />
            <KPI title="Aceptaciones"   value={String(kpis.accepted)}  color="#28a745" icon={<CheckCircle2 size={14}/>} />
            <KPI title="Rechazos"       value={String(kpis.rejected)}  color="#dc3545" icon={<XCircle size={14}/>} />
            <KPI title="Cancelaciones"  value={String(kpis.cancelled)} color="#f59e0b" icon={<Ban size={14}/>} />
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 mb-4 space-y-3">
            {/* Acción chips */}
            <div className="flex flex-wrap gap-1.5">
              {ACTION_FILTERS.map(f => {
                const Icon = f.icon
                const active = actionFilter === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActionFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#1e3a5f] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={11} /> {f.label}
                  </button>
                )
              })}
            </div>

            {/* Rango fechas + búsqueda */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="inline-flex bg-gray-100 rounded-lg overflow-hidden text-[11px] font-semibold">
                {(['today','7d','30d','month','custom'] as RangePreset[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      if (p === 'custom') return setRange({ preset: 'custom', from: customFrom, to: customTo })
                      setRange(rangeFromPreset(p))
                    }}
                    className={`px-3 py-1.5 transition-colors ${
                      range.preset === p ? 'bg-[#1e3a5f] text-white' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p === 'today' ? 'Hoy' : p === '7d' ? '7 días' : p === '30d' ? '30 días' : p === 'month' ? 'Mes' : 'Custom'}
                  </button>
                ))}
              </div>

              {range.preset === 'custom' && (
                <div className="flex gap-1.5 items-center">
                  <input
                    type="date"
                    value={customFrom.slice(0,10)}
                    onChange={e => { const v = e.target.value; setCustomFrom(v); setRange({ preset: 'custom', from: new Date(v).toISOString(), to: customTo }) }}
                    className="text-[11px] border border-gray-200 rounded px-2 py-1.5 bg-white focus:border-[#1e3a5f] focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400">→</span>
                  <input
                    type="date"
                    value={customTo.slice(0,10)}
                    onChange={e => { const v = e.target.value; const eod = new Date(v); eod.setHours(23,59,59,999); setCustomTo(eod.toISOString()); setRange({ preset: 'custom', from: customFrom, to: eod.toISOString() }) }}
                    className="text-[11px] border border-gray-200 rounded px-2 py-1.5 bg-white focus:border-[#1e3a5f] focus:outline-none"
                  />
                </div>
              )}

              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por TASK ref, título o actor..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Resultados */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-xs">
              <Spinner size={20} /> Cargando registro de auditoría...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
              <History size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin acciones registradas en este período / filtro</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="lg:hidden space-y-2">
                {filtered.map(e => (
                  <AuditCard
                    key={e.audit_id}
                    entry={e}
                    expanded={expandedId === e.audit_id}
                    onToggle={() => setExpandedId(expandedId === e.audit_id ? null : e.audit_id)}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500 w-[120px]">Cuándo</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500 w-[180px]">Actor</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500 w-[140px]">Acción</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Tarea</th>
                      <th className="px-2 w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <AuditRow
                        key={e.audit_id}
                        entry={e}
                        expanded={expandedId === e.audit_id}
                        onToggle={() => setExpandedId(expandedId === e.audit_id ? null : e.audit_id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-gray-400 mt-3 text-center">
                Mostrando {filtered.length} {filtered.length === 1 ? 'acción' : 'acciones'}
                {entries.length > filtered.length && ` (filtrado de ${entries.length})`}
                {entries.length === 500 && ' · Límite 500 — refina filtros para ver más'}
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

/* ─── Subcomponentes ───────────────────────────────────────────────────── */
function KPI({ title, value, color, icon }: { title: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 inline-flex items-center gap-1">
        {icon} {title}
      </p>
      <p className="kpi-number text-2xl mt-1" style={{ color }}>{value}</p>
    </div>
  )
}

function ActionBadge({ category, raw }: { category: TaskAuditAction; raw: string }) {
  const color = AUDIT_ACTION_COLOR[category]
  const label = AUDIT_ACTION_LABEL[category]
  const Icon  = CATEGORY_ICON[category]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}1a`, color }}
      title={raw}
    >
      <Icon size={10} /> {label}
    </span>
  )
}

function AuditRow({ entry, expanded, onToggle }: { entry: TaskAuditEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-2 text-xs text-gray-600 tabular-nums" title={fmtDateTime(entry.audit_at)}>
          {fmtTime(entry.audit_at)}
          <p className="text-[10px] text-gray-400">{new Date(entry.audit_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p>
        </td>
        <td className="px-3 py-2">
          <p className="text-xs font-semibold text-gray-800">{entry.actor_name}</p>
          {entry.actor_role && <p className="text-[10px] text-gray-400">{entry.actor_role}</p>}
        </td>
        <td className="px-3 py-2">
          <ActionBadge category={entry.action_category} raw={entry.action} />
        </td>
        <td className="px-3 py-2">
          {entry.task_ref ? (
            <Link
              to={`/tasks/${entry.task_id}`}
              onClick={ev => ev.stopPropagation()}
              className="text-xs font-semibold text-[#1e3a5f] hover:underline inline-flex items-center gap-1"
            >
              {entry.task_ref} <ExternalLink size={10} />
            </Link>
          ) : (
            <span className="text-xs text-gray-400">— sin tarea —</span>
          )}
          {entry.task_title && (
            <p className="text-[11px] text-gray-500 line-clamp-1">{entry.task_title}</p>
          )}
        </td>
        <td className="px-2 py-2 text-gray-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/40">
          <td colSpan={5} className="px-4 py-3">
            <DetailPanel entry={entry} />
          </td>
        </tr>
      )}
    </>
  )
}

function AuditCard({ entry, expanded, onToggle }: { entry: TaskAuditEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <ActionBadge category={entry.action_category} raw={entry.action} />
        <span className="text-[10px] text-gray-400 tabular-nums">{fmtDateTime(entry.audit_at)}</span>
      </div>
      <p className="text-sm font-semibold text-gray-800">{entry.actor_name}</p>
      {entry.actor_role && <p className="text-[10px] text-gray-400 mb-1">{entry.actor_role}</p>}
      {entry.task_ref && (
        <Link to={`/tasks/${entry.task_id}`} className="text-xs font-semibold text-[#1e3a5f] hover:underline inline-flex items-center gap-1 mt-1">
          {entry.task_ref} <ExternalLink size={10} />
        </Link>
      )}
      {entry.task_title && <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{entry.task_title}</p>}
      <button type="button" onClick={onToggle} className="text-[10px] text-gray-400 mt-2 inline-flex items-center gap-1">
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {expanded ? 'Ocultar detalle' : 'Ver detalle'}
      </button>
      {expanded && (
        <div className="mt-2">
          <DetailPanel entry={entry} />
        </div>
      )}
    </div>
  )
}

function DetailPanel({ entry }: { entry: TaskAuditEntry }) {
  const hasBefore = entry.before && Object.keys(entry.before).length > 0
  const hasAfter  = entry.after  && Object.keys(entry.after).length > 0
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Email actor</p>
        <p className="text-gray-700 font-mono">{entry.actor_email}</p>
        {entry.assigner_email && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-2 mb-1">Tarea asignada por → a</p>
            <p className="text-gray-700">{entry.assigner_email} → {entry.assignee_email}</p>
          </>
        )}
      </div>
      <div className="md:col-span-1 space-y-2">
        {hasBefore && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">Antes</p>
            <pre className="bg-rose-50 border border-rose-100 rounded p-2 text-[10px] text-gray-700 overflow-x-auto">
{JSON.stringify(entry.before, null, 2)}
            </pre>
          </div>
        )}
        {hasAfter && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Después</p>
            <pre className="bg-emerald-50 border border-emerald-100 rounded p-2 text-[10px] text-gray-700 overflow-x-auto">
{JSON.stringify(entry.after, null, 2)}
            </pre>
          </div>
        )}
        {!hasBefore && !hasAfter && (
          <p className="text-[10px] text-gray-400 italic">Sin payload de cambios para esta acción</p>
        )}
      </div>
    </div>
  )
}
