import { useMemo, useState } from 'react'
import { ArrowRight, BadgeDollarSign, GitFork, Megaphone, MousePointerClick, Target, UserRoundCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMitraClick } from '../MitraClickContext'
import { buildAttributionJourneys, selectAttributionChain } from '../selectors'
import { formatCurrency, formatNumber } from '../utils'
import { IntegrationBadge, KpiCard, PageHeader, Panel, StatusBadge } from '../components/Primitives'

export function AttributionPage() {
  const { data } = useMitraClick()
  const [campaignId, setCampaignId] = useState('campaign-1')
  const journeys = useMemo(() => data ? buildAttributionJourneys(data.campaigns, data.leads, data.opportunities, data.sales) : [], [data])
  if (!data) return null
  const selectedCampaign = data.campaigns.find((item) => item.id === campaignId) ?? data.campaigns[0]
  const selectedJourney = journeys.find((item) => item.campaignId === selectedCampaign.id)!
  const selectedChain = selectAttributionChain(
    selectedCampaign,
    data.leads,
    data.opportunities,
    data.sales,
  )
  const totalRevenue = journeys.reduce((sum, item) => sum + item.revenue, 0)
  const totalSpend = journeys.reduce((sum, item) => sum + item.spend, 0)
  const totalSales = journeys.reduce((sum, item) => sum + item.saleCount, 0)

  const chain = [
    { label: 'Canal', value: selectedCampaign.channel, helper: 'Origen normalizado', icon: Megaphone, tone: 'bg-mc-gray-100 text-mc-charcoal' },
    { label: 'Campaña', value: selectedCampaign.name, helper: `${formatNumber(selectedCampaign.clicks)} clics`, icon: MousePointerClick, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Lead', value: selectedChain.lead?.name ?? 'Sin lead asociado', helper: selectedChain.lead ? `ID ${selectedChain.lead.id}` : 'Sin relación por campaignId', icon: UserRoundCheck, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Oportunidad', value: selectedChain.opportunity?.name ?? 'Sin oportunidad relacionada', helper: selectedChain.opportunity ? `Lead ${selectedChain.opportunity.leadId}` : 'Sin relación por leadId', icon: Target, tone: 'bg-mc-warning-soft text-mc-warning' },
    { label: 'Venta', value: selectedChain.sale ? formatCurrency(selectedChain.sale.value) : 'Sin venta relacionada', helper: selectedChain.sale ? `Oportunidad ${selectedChain.sale.opportunityId}` : 'Sin opportunityId resoluble', icon: BadgeDollarSign, tone: 'bg-mc-success-soft text-mc-success' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Trazabilidad comercial" title="Atribución" description="Modelo visual para recorrer Canal → Campaña → Lead → Oportunidad → Venta. No se conecta todavía a plataformas de medios ni analítica." actions={<IntegrationBadge label="Conectores externos pendientes" />} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Ingresos atribuidos" value={formatCurrency(totalRevenue, true)} helper="Escenario sintético" icon={BadgeDollarSign} accent="green" /><KpiCard label="Inversión" value={formatCurrency(totalSpend, true)} helper="Campañas de muestra" icon={Megaphone} accent="coral" /><KpiCard label="Ventas trazadas" value={totalSales} helper="Con cadena íntegra por IDs" icon={GitFork} accent="violet" /><KpiCard label="Retorno estimado" value={totalSpend ? `${(totalRevenue / totalSpend).toFixed(1)}x` : '—'} helper="Ingresos / inversión" icon={Target} accent="amber" /></div>

      <Panel title="Recorrido de atribución" description="Selecciona una campaña para inspeccionar una cadena representativa verificada por IDs" action={<select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="h-9 max-w-[260px] rounded-xl border border-mc-gray-200 bg-white px-3 text-xs font-bold text-mc-gray-600">{data.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>}>
        <div className="overflow-x-auto pb-2"><div className="flex min-w-[1120px] items-stretch gap-2">{chain.map((step, index) => { const Icon = step.icon; return <div key={step.label} className="flex flex-1 items-center gap-2"><article className="h-full min-w-0 flex-1 rounded-2xl border border-mc-gray-200 bg-white p-4"><span className={`grid h-9 w-9 place-items-center rounded-xl ${step.tone}`}><Icon size={17} /></span><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-mc-gray-400">{step.label}</p><p className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-mc-gray-800">{step.value}</p><p className="mt-2 text-[10px] text-mc-gray-400">{step.helper}</p></article>{index < chain.length - 1 && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mc-gray-100 text-mc-gray-400"><ArrowRight size={15} /></span>}</div>})}</div></div>
        <div className="mt-4 rounded-xl border border-mc-warning/30 bg-mc-warning-soft p-3 text-xs leading-5 text-mc-warning"><span className="font-extrabold">Importante:</span> una relación en este escenario demo no representa causalidad real. El modelo definitivo requerirá reglas de identidad, ventanas de atribución, deduplicación y fórmulas aprobadas.</div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Panel title="Ingresos por canal" description="Comparativo de contribución atribuida"><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={journeys} margin={{ left: 0, right: 10, top: 10, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf2" /><XAxis dataKey="channel" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => formatCurrency(Number(value), true)} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={58} /><Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} /><Bar dataKey="revenue" name="Ingresos atribuidos" fill="#23395d" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel title="Lectura de la campaña" description={selectedCampaign.name}><div className="space-y-3"><div className="flex items-center justify-between rounded-xl bg-mc-gray-50 p-3 text-xs"><span className="text-mc-gray-500">Canal</span><StatusBadge status={selectedCampaign.channel} /></div><div className="flex items-center justify-between rounded-xl bg-mc-gray-50 p-3 text-xs"><span className="text-mc-gray-500">Inversión</span><strong className="text-mc-gray-800">{formatCurrency(selectedCampaign.spend)}</strong></div><div className="flex items-center justify-between rounded-xl bg-mc-gray-50 p-3 text-xs"><span className="text-mc-gray-500">Leads</span><strong className="text-mc-gray-800">{selectedJourney.leadCount}</strong></div><div className="flex items-center justify-between rounded-xl bg-mc-gray-50 p-3 text-xs"><span className="text-mc-gray-500">Oportunidades</span><strong className="text-mc-gray-800">{selectedJourney.opportunityCount}</strong></div><div className="flex items-center justify-between rounded-xl bg-mc-gray-50 p-3 text-xs"><span className="text-mc-gray-500">Ventas</span><strong className="text-mc-gray-800">{selectedJourney.saleCount}</strong></div><div className="flex items-center justify-between rounded-xl border border-mc-success-soft bg-mc-success-soft p-3 text-xs"><span className="font-bold text-mc-success">Ingresos atribuidos</span><strong className="text-mc-success">{formatCurrency(selectedJourney.revenue)}</strong></div></div></Panel>
      </div>

      <Panel title="Campañas" description="Conjunto de datos normalizado, listo para sustituir la fuente demo por conectores" padding={false}><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-mc-gray-50 text-[10px] uppercase tracking-wider text-mc-gray-400"><tr><th className="px-5 py-3">Campaña</th><th className="px-4 py-3">Canal</th><th className="px-4 py-3 text-right">Inversión</th><th className="px-4 py-3 text-center">Leads</th><th className="px-4 py-3 text-center">Oportunidades</th><th className="px-4 py-3 text-center">Ventas</th><th className="px-5 py-3 text-right">Ingresos</th></tr></thead><tbody className="divide-y divide-mc-gray-100">{journeys.map((journey) => <tr key={journey.campaignId} className="hover:bg-mc-gray-50"><td className="px-5 py-3 font-extrabold text-mc-gray-800">{journey.campaignName}</td><td className="px-4 py-3"><StatusBadge status={journey.channel} /></td><td className="px-4 py-3 text-right text-mc-gray-600">{formatCurrency(journey.spend)}</td><td className="px-4 py-3 text-center font-bold text-mc-gray-700">{journey.leadCount}</td><td className="px-4 py-3 text-center font-bold text-mc-gray-700">{journey.opportunityCount}</td><td className="px-4 py-3 text-center font-bold text-mc-gray-700">{journey.saleCount}</td><td className="px-5 py-3 text-right font-black text-mc-gray-900">{formatCurrency(journey.revenue)}</td></tr>)}</tbody></table></div></Panel>
    </div>
  )
}
