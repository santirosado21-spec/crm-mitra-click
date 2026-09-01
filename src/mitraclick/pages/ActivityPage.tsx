import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Activity as ActivityIcon, CalendarCheck, FileText, History, MessageSquareText, PhoneCall, Plus, Search, Target, UserPlus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useMitraClick } from '../MitraClickContext'
import type { ActivityType } from '../domain'
import { formatDate } from '../utils'
import { PageHeader, Panel, StatusBadge } from '../components/Primitives'

const activityConfig: Record<ActivityType, { label: string; icon: LucideIcon; color: string }> = {
  lead: { label: 'Lead', icon: UserPlus, color: 'bg-blue-100 text-blue-700' },
  llamada: { label: 'Llamada', icon: PhoneCall, color: 'bg-emerald-100 text-emerald-700' },
  nota: { label: 'Nota', icon: MessageSquareText, color: 'bg-violet-100 text-violet-700' },
  seguimiento: { label: 'Seguimiento', icon: CalendarCheck, color: 'bg-amber-100 text-amber-700' },
  cotización: { label: 'Cotización', icon: FileText, color: 'bg-orange-100 text-orange-700' },
  etapa: { label: 'Cambio de etapa', icon: History, color: 'bg-slate-100 text-slate-700' },
  oportunidad: { label: 'Oportunidad', icon: Target, color: 'bg-indigo-100 text-indigo-700' },
}

export function ActivityPage() {
  const { data, addActivity } = useMitraClick()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<ActivityType | 'Todos'>('Todos')
  const [status, setStatus] = useState<'Todos' | 'Pendiente' | 'Completado'>('Todos')
  const [showComposer, setShowComposer] = useState(false)
  const [note, setNote] = useState('')
  const activities = useMemo(() => data?.activities.filter((activity) => (type === 'Todos' || activity.type === type) && (status === 'Todos' || activity.status === status) && `${activity.title} ${activity.description} ${activity.actor}`.toLocaleLowerCase('es-MX').includes(query.toLocaleLowerCase('es-MX'))).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) ?? [], [data, query, status, type])
  if (!data) return null

  const submitNote = () => {
    if (!note.trim()) return
    addActivity({ type: 'nota', title: 'Nota manual', description: note.trim(), actor: 'Usuario demo', status: 'Completado' })
    setNote('')
    setShowComposer(false)
  }

  const pending = data.activities.filter((activity) => activity.status === 'Pendiente').length
  const today = data.activities.filter((activity) => activity.occurredAt.startsWith('2026-08-27')).length

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Seguimiento" title="Actividad" description="Timeline unificado de leads, llamadas, notas, seguimientos, cotizaciones, cambios de etapa y oportunidades." actions={<Button onClick={() => setShowComposer((value) => !value)}><span className="flex items-center gap-2"><Plus size={15} />Nueva nota</span></Button>} />
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-400">Actividad total</p><p className="mt-1 text-2xl font-black text-slate-900">{data.activities.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-400">Pendientes</p><p className="mt-1 text-2xl font-black text-amber-700">{pending}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-400">Movimientos del corte</p><p className="mt-1 text-2xl font-black text-blue-700">{today}</p></div></div>
      {showComposer && <Panel title="Registrar nota local" description="Se añadirá al timeline del escenario demo"><div className="space-y-3"><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Escribe una observación comercial…" className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setShowComposer(false); setNote('') }}>Cancelar</Button><Button onClick={submitNote} disabled={!note.trim()}>Guardar nota</Button></div></div></Panel>}
      <Panel padding={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar título, descripción o responsable…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm outline-none focus:border-blue-400" /></div><div className="flex gap-2"><select value={type} onChange={(event) => setType(event.target.value as ActivityType | 'Todos')} className="h-10 min-w-36 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><option>Todos</option>{Object.entries(activityConfig).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><option>Todos</option><option>Pendiente</option><option>Completado</option></select></div></div>
        <div className="p-4 lg:p-6"><div className="relative mx-auto max-w-4xl space-y-4 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-slate-200">{activities.map((activity) => { const config = activityConfig[activity.type]; const Icon = config.icon; return <article key={activity.id} className="relative flex gap-4"><span className={`z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border-4 border-white ${config.color}`}><Icon size={15} /></span><div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold text-slate-800">{activity.title}</p>{activity.status && <StatusBadge status={activity.status} />}</div><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{config.label}</p></div><time className="shrink-0 text-[10px] font-semibold text-slate-400">{formatDate(activity.occurredAt, true)}</time></div><p className="mt-3 text-xs leading-5 text-slate-500">{activity.description}</p><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400"><span>{activity.actor}</span><span>{activity.opportunityId ? 'Con oportunidad' : activity.leadId ? 'Con lead' : 'Actividad general'}</span></div></div></article>})}{!activities.length && <div className="ml-14 py-12 text-center"><ActivityIcon className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Sin actividad con estos filtros</p></div>}</div></div>
      </Panel>
    </div>
  )
}
