import { useMemo, useState } from 'react'
import { CalendarClock, FileCheck2, FileText, Search, TimerReset } from 'lucide-react'
import { useMitraClick } from '../MitraClickContext'
import type { Quote, QuoteStatus } from '../domain'
import { formatCurrency, formatDate } from '../utils'
import { KpiCard, PageHeader, Panel, StatusBadge, UserAvatar } from '../components/Primitives'
import { RecordDrawer } from '../components/RecordDrawer'

const quoteStatuses: (QuoteStatus | 'Todas')[] = ['Todas', 'Borrador', 'Enviada', 'Vista', 'Aceptada', 'Rechazada', 'Vencida']

function QuoteDetail({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const { data } = useMitraClick()
  if (!data) return null
  const opportunity = data.opportunities.find((item) => item.id === quote.opportunityId)
  const company = data.companies.find((item) => item.id === quote.companyId)
  const activities = data.activities.filter((item) => item.quoteId === quote.id || item.opportunityId === quote.opportunityId)

  return (
    <RecordDrawer open title={quote.folio} subtitle={`${quote.companyName} · ${quote.customerName}`} onClose={onClose}>
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#182947] to-[#2a4670] p-5 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">Valor de la cotización</p><p className="mt-2 text-3xl font-black">{formatCurrency(quote.value)}</p></div><StatusBadge status={quote.status} /></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div><p className="text-blue-200">Creada</p><p className="mt-1 font-bold">{formatDate(quote.createdAt)}</p></div><div><p className="text-blue-200">Vence</p><p className="mt-1 font-bold">{formatDate(quote.expiresAt)}</p></div></div></div>
        <section><h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-mc-gray-400">Información comercial</h3><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-mc-gray-200 p-3"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Cliente</p><p className="mt-1 text-sm font-extrabold text-mc-gray-800">{quote.customerName}</p><p className="mt-0.5 text-xs text-mc-gray-500">{company?.name}</p></div><div className="rounded-xl border border-mc-gray-200 p-3"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Responsable</p><div className="mt-2 flex items-center gap-2"><UserAvatar name={quote.owner} size="sm" /><span className="text-sm font-extrabold text-mc-gray-800">{quote.owner}</span></div></div><div className="rounded-xl border border-mc-gray-200 p-3 sm:col-span-2"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Oportunidad relacionada</p><div className="mt-2 flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-mc-gray-800">{opportunity?.name ?? quote.opportunityName}</p><p className="mt-0.5 text-xs text-mc-gray-400">{opportunity ? `${formatCurrency(opportunity.value)} · ${opportunity.probability}% probabilidad` : 'Relación preparada'}</p></div>{opportunity && <StatusBadge status={opportunity.stage} />}</div></div><div className="rounded-xl border border-mc-gray-200 p-3"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Partidas</p><p className="mt-1 text-lg font-black text-mc-gray-800">{quote.itemCount}</p></div><div className="rounded-xl border border-mc-gray-200 p-3"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Fuente</p><p className="mt-1 text-sm font-extrabold text-mc-gray-800">Documento simulado</p></div></div></section>
        <section><h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-mc-gray-400">Actividad relacionada</h3><div className="space-y-3">{activities.map((activity) => <div key={activity.id} className="flex gap-3 rounded-xl border border-mc-gray-100 bg-mc-gray-50/60 p-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" /><div><p className="text-xs font-extrabold text-mc-gray-800">{activity.title}</p><p className="mt-1 text-[11px] leading-5 text-mc-gray-500">{activity.description}</p><p className="mt-1 text-[10px] text-mc-gray-400">{formatDate(activity.occurredAt, true)}</p></div></div>)}</div></section>
      </div>
    </RecordDrawer>
  )
}

export function QuotesPage() {
  const { data } = useMitraClick()
  const [status, setStatus] = useState<QuoteStatus | 'Todas'>('Todas')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const quotes = useMemo(() => data?.quotes.filter((quote) => (status === 'Todas' || quote.status === status) && `${quote.folio} ${quote.customerName} ${quote.companyName} ${quote.owner}`.toLocaleLowerCase('es-MX').includes(query.toLocaleLowerCase('es-MX'))) ?? [], [data, query, status])
  if (!data) return null
  const selected = data.quotes.find((quote) => quote.id === selectedId)
  const openQuotes = data.quotes.filter((quote) => !['Aceptada', 'Rechazada', 'Vencida'].includes(quote.status))
  const accepted = data.quotes.filter((quote) => quote.status === 'Aceptada')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Propuestas comerciales" title="Cotizaciones" description="Consulta cliente, empresa, valor, responsable, estado y la oportunidad que da origen a cada propuesta." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Valor abierto" value={formatCurrency(openQuotes.reduce((sum, quote) => sum + quote.value, 0), true)} helper={`${openQuotes.length} documentos`} icon={FileText} accent="blue" /><KpiCard label="Aceptadas" value={accepted.length} helper={formatCurrency(accepted.reduce((sum, quote) => sum + quote.value, 0), true)} icon={FileCheck2} accent="green" /><KpiCard label="Esperando respuesta" value={data.quotes.filter((quote) => ['Enviada', 'Vista'].includes(quote.status)).length} helper="Enviadas o vistas" icon={TimerReset} accent="amber" /><KpiCard label="Vencimiento próximo" value={3} helper="Escenario de muestra" icon={CalendarClock} accent="coral" /></div>
      <Panel padding={false}>
        <div className="space-y-3 border-b border-mc-gray-100 p-4"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -tranmc-gray-y-1/2 text-mc-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar folio, cliente, empresa o responsable…" className="h-10 w-full rounded-xl border border-mc-gray-200 bg-mc-gray-50/60 pl-9 pr-3 text-sm outline-none focus:border-blue-400" /></div><div className="flex gap-2 overflow-x-auto pb-1">{quoteStatuses.map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${status === item ? 'border-mc-charcoal bg-mc-charcoal text-white' : 'border-mc-gray-200 bg-white text-mc-gray-500 hover:border-mc-gray-300'}`}>{item}</button>)}</div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs"><thead className="bg-mc-gray-50 text-[10px] uppercase tracking-wider text-mc-gray-400"><tr><th className="px-5 py-3">Folio</th><th className="px-4 py-3">Cliente / Empresa</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Responsable</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Oportunidad</th><th className="px-5 py-3">Vencimiento</th></tr></thead><tbody className="divide-y divide-mc-gray-100">{quotes.map((quote) => <tr key={quote.id} onClick={() => setSelectedId(quote.id)} className="group cursor-pointer hover:bg-blue-50/30"><td className="px-5 py-3 font-black text-mc-charcoal">{quote.folio}</td><td className="px-4 py-3"><p className="font-extrabold text-mc-gray-800">{quote.customerName}</p><p className="mt-0.5 text-[10px] text-mc-gray-400">{quote.companyName}</p></td><td className="px-4 py-3 text-right font-black text-mc-gray-900">{formatCurrency(quote.value)}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><UserAvatar name={quote.owner} size="sm" /><span className="font-semibold text-mc-gray-600">{quote.owner}</span></div></td><td className="px-4 py-3"><StatusBadge status={quote.status} /></td><td className="px-4 py-3 font-semibold text-mc-gray-600">{quote.opportunityName}</td><td className="px-5 py-3 text-mc-gray-500">{formatDate(quote.expiresAt)}</td></tr>)}</tbody></table></div>
      </Panel>
      {selected && <QuoteDetail quote={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
