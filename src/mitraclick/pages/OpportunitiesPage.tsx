import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Search, Target, TrendingUp } from 'lucide-react'
import { useMitraClick } from '../MitraClickContext'
import { OPPORTUNITY_STAGES, type Opportunity } from '../domain'
import { getOpportunityStageNavigation, groupOpportunitiesByStage } from '../selectors'
import { formatCurrency, formatDate } from '../utils'
import { KpiCard, PageHeader, Panel, StatusBadge, UserAvatar } from '../components/Primitives'
import { RecordDrawer } from '../components/RecordDrawer'

const stageColors: Record<Opportunity['stage'], string> = {
  Nuevo: '#64748b', Contactado: '#0284c7', Calificado: '#4f46e5', Cotización: '#7c3aed', Negociación: '#d97706', Ganado: '#059669', Perdido: '#e11d48',
}

function OpportunityDetail({ opportunity, onClose }: { opportunity: Opportunity; onClose: () => void }) {
  const { data, moveOpportunityStage } = useMitraClick()
  if (!data) return null
  const lead = data.leads.find((item) => item.id === opportunity.leadId)
  const quotes = data.quotes.filter((item) => item.opportunityId === opportunity.id)
  const activities = data.activities.filter((item) => item.opportunityId === opportunity.id)
  const products = data.products.filter((item) => opportunity.productIds.includes(item.id))

  return (
    <RecordDrawer open title={opportunity.name} subtitle={opportunity.companyName} onClose={onClose}>
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-mc-gray-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mc-gray-400">Valor</p><p className="mt-1 text-lg font-black text-mc-gray-900">{formatCurrency(opportunity.value)}</p></div><div className="rounded-xl bg-mc-gray-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mc-gray-400">Probabilidad</p><p className="mt-1 text-lg font-black text-mc-gray-900">{opportunity.probability}%</p></div><div className="rounded-xl bg-mc-gray-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mc-gray-400">Cierre esperado</p><p className="mt-1 text-sm font-black text-mc-gray-900">{formatDate(opportunity.expectedCloseAt)}</p></div></div>
        <section><h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-mc-gray-400">Etapa del pipeline</h3><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{OPPORTUNITY_STAGES.map((stage) => <button key={stage} type="button" onClick={() => moveOpportunityStage(opportunity.id, stage)} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${opportunity.stage === stage ? 'border-transparent text-white shadow-sm' : 'border-mc-gray-200 text-mc-gray-500 hover:bg-mc-gray-50'}`} style={opportunity.stage === stage ? { backgroundColor: stageColors[stage] } : undefined}>{stage}</button>)}</div><p className="mt-2 text-[10px] text-mc-gray-400">El cambio se registra en la actividad local, sin escribir en backend.</p></section>
        <section><h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-mc-gray-400">Relaciones</h3><div className="space-y-2"><div className="flex items-center justify-between rounded-xl border border-mc-gray-200 p-3"><div><p className="text-[10px] font-bold uppercase text-mc-gray-400">Lead</p><p className="mt-1 text-sm font-extrabold text-mc-gray-800">{lead?.name ?? 'Sin relación'}</p></div>{lead && <StatusBadge status={lead.status} />}</div><div className="rounded-xl border border-mc-gray-200 p-3"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Productos de interés</p><div className="mt-2 flex flex-wrap gap-2">{products.map((product) => <span key={product.id} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{product.name}</span>)}</div></div><div className="rounded-xl border border-mc-gray-200 p-3"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Cotizaciones</p><div className="mt-2 space-y-2">{quotes.map((quote) => <div key={quote.id} className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-mc-gray-700">{quote.folio} · {formatCurrency(quote.value)}</span><StatusBadge status={quote.status} /></div>)}{!quotes.length && <p className="text-xs text-mc-gray-400">Sin cotización relacionada.</p>}</div></div></div></section>
        <section><h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-mc-gray-400">Actividad</h3><div className="space-y-3">{activities.map((activity) => <div key={activity.id} className="border-l-2 border-blue-200 pl-3"><p className="text-xs font-extrabold text-mc-gray-800">{activity.title}</p><p className="mt-1 text-[11px] leading-5 text-mc-gray-500">{activity.description}</p><p className="mt-1 text-[10px] text-mc-gray-400">{formatDate(activity.occurredAt, true)}</p></div>)}{!activities.length && <p className="text-xs text-mc-gray-400">Sin actividad relacionada.</p>}</div></section>
      </div>
    </RecordDrawer>
  )
}

function OpportunityCard({ opportunity, onSelect }: { opportunity: Opportunity; onSelect: () => void }) {
  const { moveOpportunityStage } = useMitraClick()
  const { previous, next } = getOpportunityStageNavigation(opportunity.stage)
  return (
    <article className="group rounded-2xl border border-mc-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <button type="button" onClick={onSelect} className="w-full text-left"><p className="line-clamp-2 text-xs font-extrabold leading-5 text-mc-gray-800 group-hover:text-blue-800">{opportunity.name}</p><p className="mt-1 truncate text-[10px] text-mc-gray-400">{opportunity.companyName}</p><p className="mt-3 text-base font-black text-mc-gray-950">{formatCurrency(opportunity.value)}</p><div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-mc-gray-400"><span className="flex items-center gap-1"><CalendarDays size={12} />{formatDate(opportunity.expectedCloseAt)}</span><span>{opportunity.probability}%</span></div></button>
      <div className="mt-3 flex items-center justify-between border-t border-mc-gray-100 pt-3"><UserAvatar name={opportunity.owner} size="sm" /><div className="flex gap-1"><button type="button" disabled={!previous} onClick={() => previous && moveOpportunityStage(opportunity.id, previous)} className="grid h-11 w-11 place-items-center rounded-xl border border-mc-gray-200 text-mc-gray-500 hover:bg-mc-gray-50 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Mover a etapa anterior"><ChevronLeft size={14} /></button><button type="button" disabled={!next} onClick={() => next && moveOpportunityStage(opportunity.id, next)} className="grid h-11 w-11 place-items-center rounded-xl border border-mc-gray-200 text-mc-gray-500 hover:bg-mc-gray-50 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Mover a etapa siguiente"><ChevronRight size={14} /></button></div></div>
    </article>
  )
}

export function OpportunitiesPage() {
  const { data } = useMitraClick()
  const [owner, setOwner] = useState('Todos')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = useMemo(() => data?.opportunities.filter((item) => (owner === 'Todos' || item.owner === owner) && `${item.name} ${item.companyName}`.toLocaleLowerCase('es-MX').includes(query.toLocaleLowerCase('es-MX'))) ?? [], [data, owner, query])
  const grouped = useMemo(() => groupOpportunitiesByStage(filtered), [filtered])
  if (!data) return null
  const owners = ['Todos', ...Array.from(new Set(data.opportunities.map((item) => item.owner)))]
  const selected = data.opportunities.find((item) => item.id === selectedId)
  const open = filtered.filter((item) => !['Ganado', 'Perdido'].includes(item.stage))
  const weighted = open.reduce((sum, item) => sum + item.value * (item.probability / 100), 0)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pipeline comercial" title="Oportunidades" description="Avanza negocios por siete etapas. Los controles de cada tarjeta modifican el estado local y generan trazabilidad en Actividad." />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><KpiCard label="Pipeline abierto" value={formatCurrency(open.reduce((sum, item) => sum + item.value, 0), true)} helper={`${open.length} oportunidades`} icon={Target} accent="blue" /><KpiCard label="Pipeline ponderado" value={formatCurrency(weighted, true)} helper="Valor × probabilidad" icon={TrendingUp} accent="violet" /><KpiCard label="Ganadas" value={grouped.Ganado.length} helper={formatCurrency(grouped.Ganado.reduce((sum, item) => sum + item.value, 0), true)} icon={Target} accent="green" /><KpiCard label="En negociación" value={grouped.Negociación.length} helper={formatCurrency(grouped.Negociación.reduce((sum, item) => sum + item.value, 0), true)} icon={Target} accent="amber" /></div>
      <Panel padding={false}>
        <div className="flex flex-col gap-3 border-b border-mc-gray-100 p-4 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mc-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar oportunidad o empresa…" className="h-11 w-full rounded-xl border border-mc-gray-200 bg-mc-gray-50/60 pl-9 pr-3 text-sm outline-none placeholder:text-mc-gray-500 focus:border-blue-400" /></div><select aria-label="Filtrar por responsable" value={owner} onChange={(event) => setOwner(event.target.value)} className="h-11 rounded-xl border border-mc-gray-200 bg-white px-3 text-xs font-bold text-mc-gray-600">{owners.map((item) => <option key={item} value={item}>{item === 'Todos' ? 'Responsable: Todos' : item}</option>)}</select></div>
        <p className="border-b border-mc-gray-100 px-4 py-2 text-[11px] font-semibold text-mc-gray-500">Tablero desplazable: desliza horizontalmente para recorrer las siete etapas.</p>
        <div className="overflow-x-auto p-4"><div className="grid min-w-[1960px] grid-cols-7 gap-3">{OPPORTUNITY_STAGES.map((stage) => { const items = grouped[stage]; return <section key={stage} className="flex min-h-[520px] flex-col rounded-2xl border border-mc-gray-200 bg-mc-gray-50/70 p-2.5"><header className="mb-3 flex items-center justify-between gap-2 px-1"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stageColors[stage] }} /><h2 className="text-xs font-extrabold text-mc-gray-700">{stage}</h2></div><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-mc-gray-500 shadow-sm">{items.length}</span></header><div className="space-y-2.5">{items.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} onSelect={() => setSelectedId(opportunity.id)} />)}</div><div className="mt-auto border-t border-dashed border-mc-gray-200 px-1 pt-3 text-[10px] text-mc-gray-400"><span className="font-bold text-mc-gray-600">{formatCurrency(items.reduce((sum, item) => sum + item.value, 0), true)}</span> en esta etapa</div></section>})}</div></div>
      </Panel>
      {selected && <OpportunityDetail opportunity={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
