import { useMemo, useState } from 'react'
import { Building2, CalendarClock, Filter, Mail, Phone, Search, SlidersHorizontal, UserRound } from 'lucide-react'
import { Button, Input } from '../components/Controls'

import { useMitraClick } from '../MitraClickContext'
import { OPPORTUNITY_STAGES, type Lead } from '../domain'
import { filterLeads } from '../selectors'
import { formatDate } from '../utils'
import { PageHeader, Panel, StatusBadge, UserAvatar } from '../components/Primitives'
import { RecordDrawer } from '../components/RecordDrawer'

function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { data, updateLead } = useMitraClick()
  const [status, setStatus] = useState(lead.status)
  const [owner, setOwner] = useState(lead.owner)
  const [nextAction, setNextAction] = useState(lead.nextAction)
  const [saved, setSaved] = useState(false)
  const activities = data?.activities.filter((activity) => activity.leadId === lead.id) ?? []
  const owners = Array.from(new Set(data?.leads.map((item) => item.owner) ?? []))

  const save = () => {
    updateLead(lead.id, { status, owner, nextAction })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <RecordDrawer
      open
      title={lead.name}
      subtitle={`${lead.companyName} · ${lead.source}`}
      onClose={onClose}
      footer={<div className="flex items-center justify-between gap-3"><p className="text-xs text-emerald-700">{saved ? 'Cambios guardados localmente' : 'Los cambios sólo afectan esta sesión demo.'}</p><Button onClick={save}>Guardar cambios</Button></div>}
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-2xl bg-[#f7f8fb] p-4">
          <UserAvatar name={lead.name} size="lg" />
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold text-slate-900">{lead.name}</p><StatusBadge status={lead.status} /></div><p className="mt-1 text-xs text-slate-500">Puntuación comercial <span className="font-black text-slate-800">{lead.score}/100</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" style={{ width: `${lead.score}%` }} /></div></div>
        </div>

        <section>
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Datos de contacto</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"><Mail size={16} className="text-blue-600" /><span className="truncate">{lead.email}</span></a>
            <a href={`tel:${lead.phone}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"><Phone size={16} className="text-blue-600" />{lead.phone}</a>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-600"><Building2 size={16} className="text-slate-400" /><span className="truncate">{lead.companyName}</span></div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-600"><CalendarClock size={16} className="text-slate-400" />Alta {formatDate(lead.createdAt)}</div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Gestión comercial</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Estado<select value={status} onChange={(event) => setStatus(event.target.value as Lead['status'])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500">{OPPORTUNITY_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Responsable<select value={owner} onChange={(event) => setOwner(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500">{owners.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="sm:col-span-2"><Input label="Próxima acción" value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></div>
          </div>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><span className="font-extrabold">Fecha programada:</span> {formatDate(lead.nextActionAt, true)}</div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Interés y contexto</h3>
          <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-extrabold text-slate-800">{lead.interest}</p><p className="mt-2 text-xs leading-5 text-slate-500">{lead.notes ?? 'Sin notas adicionales en el escenario de demostración.'}</p><div className="mt-3 flex flex-wrap gap-2">{lead.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{tag}</span>)}</div></div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Actividad relacionada</h3>
          <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-200">
            {activities.map((activity) => <div key={activity.id} className="relative flex gap-3"><span className="z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-blue-500 ring-2 ring-slate-100" /><div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/60 p-3"><div className="flex items-start justify-between gap-3"><p className="text-xs font-extrabold text-slate-800">{activity.title}</p><span className="shrink-0 text-[10px] text-slate-400">{formatDate(activity.occurredAt, true)}</span></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{activity.description}</p></div></div>)}
            {!activities.length && <p className="pl-7 text-xs text-slate-400">Sin actividad relacionada.</p>}
          </div>
        </section>
      </div>
    </RecordDrawer>
  )
}

export function LeadsPage() {
  const { data } = useMitraClick()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Lead['status'] | 'Todos'>('Todos')
  const [owner, setOwner] = useState('Todos')
  const [source, setSource] = useState('Todos')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const leads = useMemo(() => data ? filterLeads(data.leads, { query, status, owner, source }) : [], [data, owner, query, source, status])
  if (!data) return null
  const owners = ['Todos', ...Array.from(new Set(data.leads.map((lead) => lead.owner)))]
  const sources = ['Todos', ...Array.from(new Set(data.leads.map((lead) => lead.source)))]
  const selected = data.leads.find((lead) => lead.id === selectedId)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM" title="Leads" description="Centraliza origen, interés, responsable, estado y próxima acción. Selecciona un registro para consultar y actualizar su detalle completo." actions={<span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">{leads.length} de {data.leads.length} registros</span>} />

      <Panel padding={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar por nombre, empresa, interés o etiqueta" placeholder="Buscar leads…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm outline-none placeholder:text-slate-500 focus:border-blue-400 focus:bg-white" /></div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 xl:flex"><SlidersHorizontal size={14} />Filtros</span>
            <select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value as Lead['status'] | 'Todos')} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><option value="Todos">Estado: Todos</option>{OPPORTUNITY_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select>
            <select aria-label="Filtrar por responsable" value={owner} onChange={(event) => setOwner(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">{owners.map((item) => <option key={item} value={item}>{item === 'Todos' ? 'Responsable: Todos' : item}</option>)}</select>
            <select aria-label="Filtrar por origen" value={source} onChange={(event) => setSource(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">{sources.map((item) => <option key={item} value={item}>{item === 'Todos' ? 'Origen: Todos' : item}</option>)}</select>
          </div>
        </div>
        <p className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-500 lg:hidden">Desliza horizontalmente para consultar todas las columnas.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Lead</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Responsable</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Interés</th><th className="px-4 py-3">Próxima acción</th><th className="px-4 py-3">Puntuación</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => <tr key={lead.id} className="group cursor-pointer hover:bg-blue-50/30" onClick={() => setSelectedId(lead.id)}><td className="px-5 py-3"><div className="flex items-center gap-3"><UserAvatar name={lead.name} /><div><p className="font-extrabold text-slate-800 group-hover:text-blue-800">{lead.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{lead.companyName}</p></div></div></td><td className="px-4 py-3"><StatusBadge status={lead.status} /></td><td className="px-4 py-3"><span className="flex items-center gap-2 font-semibold text-slate-600"><UserRound size={14} className="text-slate-400" />{lead.owner}</span></td><td className="px-4 py-3 text-slate-500">{lead.source}</td><td className="px-4 py-3 font-semibold text-slate-700">{lead.interest}</td><td className="px-4 py-3"><p className="font-semibold text-slate-700">{lead.nextAction}</p><p className="mt-0.5 text-[10px] text-slate-500">{formatDate(lead.nextActionAt, true)}</p></td><td className="px-4 py-3"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-black text-slate-700">{lead.score}</span></td><td className="px-5 py-3 text-right"><button type="button" className="min-h-11 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-500 group-hover:border-blue-200 group-hover:text-blue-700">Ver detalle</button></td></tr>)}
            </tbody>
          </table>
        </div>
        {!leads.length && <div className="px-6 py-14 text-center"><Filter className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">No hay leads con estos filtros</p><p className="mt-1 text-xs text-slate-400">Ajusta la búsqueda o restablece los filtros.</p></div>}
      </Panel>
      {selected && <LeadDetail key={selected.id} lead={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
