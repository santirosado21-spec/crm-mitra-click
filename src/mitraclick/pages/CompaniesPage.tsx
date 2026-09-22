import { useMemo, useState } from 'react'
import { Building2, Globe2, MapPin, Search, UsersRound } from 'lucide-react'
import type { Company } from '../domain'
import { useMitraClick } from '../MitraClickContext'
import { formatCurrency, formatDate } from '../utils'
import { PageHeader, Panel, StatusBadge, UserAvatar } from '../components/Primitives'
import { RecordDrawer } from '../components/RecordDrawer'

const tabs = ['Resumen', 'Contactos', 'Leads', 'Oportunidades', 'Cotizaciones', 'Actividad'] as const
type CompanyTab = (typeof tabs)[number]

function CompanyDetail({ company, onClose }: { company: Company; onClose: () => void }) {
  const { data } = useMitraClick()
  const [tab, setTab] = useState<CompanyTab>('Resumen')
  if (!data) return null
  const leads = data.leads.filter((lead) => lead.companyId === company.id)
  const opportunities = data.opportunities.filter((opportunity) => opportunity.companyId === company.id)
  const quotes = data.quotes.filter((quote) => quote.companyId === company.id)
  const activities = data.activities.filter((activity) => activity.companyId === company.id)
  const pipelineValue = opportunities.filter((item) => !['Ganado', 'Perdido'].includes(item.stage)).reduce((sum, item) => sum + item.value, 0)

  return (
    <RecordDrawer open title={company.name} subtitle={`${company.segment} · ${company.industry}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl bg-[#f7f8fb] p-4 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mc-charcoal text-white"><Building2 size={22} /></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-mc-gray-900">{company.name}</h3><StatusBadge status={company.status} /></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mc-gray-500"><span className="flex items-center gap-1.5"><MapPin size={13} />{company.city}</span>{company.website && <span className="flex items-center gap-1.5"><Globe2 size={13} />{company.website}</span>}</div></div>
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-mc-gray-200 px-1">
          {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-bold transition ${tab === item ? 'border-[#e25f45] text-[#c94c35]' : 'border-transparent text-mc-gray-400 hover:text-mc-gray-700'}`}>{item}</button>)}
        </div>

        {tab === 'Resumen' && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-mc-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mc-gray-400">Potencial anual</p><p className="mt-1 text-xl font-black text-mc-gray-900">{formatCurrency(company.annualPotential)}</p></div><div className="rounded-xl border border-mc-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mc-gray-400">Pipeline abierto</p><p className="mt-1 text-xl font-black text-mc-gray-900">{formatCurrency(pipelineValue)}</p></div><div className="rounded-xl border border-mc-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mc-gray-400">Responsable</p><div className="mt-2 flex items-center gap-2"><UserAvatar name={company.owner} size="sm" /><p className="text-sm font-bold text-mc-gray-700">{company.owner}</p></div></div><div className="rounded-xl border border-mc-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mc-gray-400">Última actividad</p><p className="mt-2 text-sm font-bold text-mc-gray-700">{formatDate(company.lastActivityAt, true)}</p></div></div><div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-5 text-blue-900"><span className="font-extrabold">Relación B2B preparada:</span> esta vista conecta contactos, leads, oportunidades, cotizaciones y actividad mediante identificadores comunes del repositorio.</div></div>}

        {tab === 'Contactos' && <div className="space-y-3">{company.contacts.map((contact) => <div key={contact.id} className="flex items-center gap-3 rounded-xl border border-mc-gray-200 p-3"><UserAvatar name={contact.name} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold text-mc-gray-800">{contact.name}</p>{contact.isPrimary && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">Principal</span>}</div><p className="text-[11px] text-mc-gray-400">{contact.role}</p><p className="mt-1 truncate text-xs text-mc-gray-500">{contact.email} · {contact.phone}</p></div></div>)}</div>}

        {tab === 'Leads' && <div className="space-y-2">{leads.map((lead) => <div key={lead.id} className="flex items-center justify-between gap-3 rounded-xl border border-mc-gray-200 p-3"><div><p className="text-sm font-extrabold text-mc-gray-800">{lead.name}</p><p className="mt-0.5 text-[11px] text-mc-gray-400">{lead.interest} · {lead.owner}</p></div><StatusBadge status={lead.status} /></div>)}{!leads.length && <p className="py-8 text-center text-xs text-mc-gray-400">Sin leads relacionados.</p>}</div>}

        {tab === 'Oportunidades' && <div className="space-y-2">{opportunities.map((item) => <div key={item.id} className="rounded-xl border border-mc-gray-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-mc-gray-800">{item.name}</p><p className="mt-0.5 text-[11px] text-mc-gray-400">Cierre esperado: {formatDate(item.expectedCloseAt)}</p></div><StatusBadge status={item.stage} /></div><div className="mt-3 flex items-center justify-between text-xs"><span className="font-black text-mc-gray-900">{formatCurrency(item.value)}</span><span className="text-mc-gray-400">{item.probability}% probabilidad</span></div></div>)}</div>}

        {tab === 'Cotizaciones' && <div className="space-y-2">{quotes.map((quote) => <div key={quote.id} className="flex items-center justify-between gap-3 rounded-xl border border-mc-gray-200 p-3"><div><p className="text-sm font-extrabold text-mc-gray-800">{quote.folio}</p><p className="mt-0.5 text-[11px] text-mc-gray-400">{quote.opportunityName}</p><p className="mt-2 text-sm font-black text-mc-gray-900">{formatCurrency(quote.value)}</p></div><StatusBadge status={quote.status} /></div>)}{!quotes.length && <p className="py-8 text-center text-xs text-mc-gray-400">Sin cotizaciones relacionadas.</p>}</div>}

        {tab === 'Actividad' && <div className="space-y-3">{activities.map((activity) => <div key={activity.id} className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e25f45]" /><div className="min-w-0"><p className="text-xs font-extrabold text-mc-gray-800">{activity.title}</p><p className="mt-1 text-[11px] leading-5 text-mc-gray-500">{activity.description}</p><p className="mt-1 text-[10px] text-mc-gray-400">{activity.actor} · {formatDate(activity.occurredAt, true)}</p></div></div>)}{!activities.length && <p className="py-8 text-center text-xs text-mc-gray-400">Sin actividad relacionada.</p>}</div>}
      </div>
    </RecordDrawer>
  )
}

export function CompaniesPage() {
  const { data } = useMitraClick()
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState('Todos')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const companies = useMemo(() => data?.companies.filter((company) => (segment === 'Todos' || company.segment === segment) && `${company.name} ${company.industry} ${company.city}`.toLocaleLowerCase('es-MX').includes(query.toLocaleLowerCase('es-MX'))) ?? [], [data, query, segment])
  if (!data) return null
  const selected = data.companies.find((company) => company.id === selectedId)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Cuentas" title="Empresas" description="Vista B2B centrada en la relación comercial: contactos, oportunidades, cotizaciones y actividad en un solo registro." actions={<div className="flex items-center gap-2 rounded-xl border border-mc-gray-200 bg-white px-3 py-2 text-xs font-bold text-mc-gray-600"><UsersRound size={15} />{data.companies.filter((company) => company.segment === 'B2B').length} cuentas B2B</div>} />
      <Panel padding={false}>
        <div className="flex flex-col gap-3 border-b border-mc-gray-100 p-4 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -tranmc-gray-y-1/2 text-mc-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, industria o ciudad…" className="h-10 w-full rounded-xl border border-mc-gray-200 bg-mc-gray-50/50 pl-9 pr-3 text-sm outline-none focus:border-blue-400" /></div><select value={segment} onChange={(event) => setSegment(event.target.value)} className="h-10 rounded-xl border border-mc-gray-200 bg-white px-3 text-xs font-bold text-mc-gray-600"><option>Todos</option><option>B2B</option><option>B2C</option></select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-mc-gray-50 text-[10px] uppercase tracking-wider text-mc-gray-400"><tr><th className="px-5 py-3">Empresa</th><th className="px-4 py-3">Segmento</th><th className="px-4 py-3">Responsable</th><th className="px-4 py-3 text-center">Contactos</th><th className="px-4 py-3 text-center">Leads</th><th className="px-4 py-3 text-center">Oportunidades</th><th className="px-4 py-3 text-right">Potencial anual</th><th className="px-5 py-3">Estado</th></tr></thead><tbody className="divide-y divide-mc-gray-100">{companies.map((company) => { const leadCount = data.leads.filter((lead) => lead.companyId === company.id).length; const opportunityCount = data.opportunities.filter((item) => item.companyId === company.id).length; return <tr key={company.id} onClick={() => setSelectedId(company.id)} className="group cursor-pointer hover:bg-blue-50/30"><td className="px-5 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-mc-gray-100 text-mc-charcoal"><Building2 size={17} /></span><div><p className="font-extrabold text-mc-gray-800 group-hover:text-blue-800">{company.name}</p><p className="mt-0.5 text-[10px] text-mc-gray-400">{company.industry} · {company.city}</p></div></div></td><td className="px-4 py-3"><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">{company.segment}</span></td><td className="px-4 py-3 font-semibold text-mc-gray-600">{company.owner}</td><td className="px-4 py-3 text-center font-bold text-mc-gray-700">{company.contacts.length}</td><td className="px-4 py-3 text-center font-bold text-mc-gray-700">{leadCount}</td><td className="px-4 py-3 text-center font-bold text-mc-gray-700">{opportunityCount}</td><td className="px-4 py-3 text-right font-black text-mc-gray-900">{formatCurrency(company.annualPotential)}</td><td className="px-5 py-3"><StatusBadge status={company.status} /></td></tr>})}</tbody></table></div>
      </Panel>
      {selected && <CompanyDetail company={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
