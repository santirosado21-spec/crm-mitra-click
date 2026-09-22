import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BadgeDollarSign,
  Building2,
  CircleDollarSign,
  FileText,
  Percent,
  ShoppingBag,
  Target,
  Users,
} from 'lucide-react'
import { useMitraClick } from '../MitraClickContext'
import { buildAttributionJourneys, getExecutiveMetrics, groupOpportunitiesByStage } from '../selectors'
import { formatCurrency, formatNumber, formatPercent } from '../utils'
import { KpiCard, PageHeader, Panel, ProductBar, StatusBadge } from '../components/Primitives'

const chartColors = ['#ffc62a', '#454a49', '#676b69', '#808482', '#9a7700', '#6d5a21', '#747877']

export function DashboardPage() {
  const { data } = useMitraClick()

  const view = useMemo(() => {
    if (!data) return null
    const metrics = getExecutiveMetrics({
      leads: data.leads,
      opportunities: data.opportunities,
      sales: data.sales,
      activeCustomers: data.companies.filter((company) => company.status === 'Cliente').length,
      openQuotes: data.quotes.filter((quote) => !['Aceptada', 'Rechazada', 'Vencida'].includes(quote.status)).length,
    })
    const grouped = groupOpportunitiesByStage(data.opportunities)
    const pipeline = Object.entries(grouped).map(([stage, items]) => ({
      stage,
      oportunidades: items.length,
      valor: items.reduce((sum, item) => sum + item.value, 0),
    }))
    const attribution = buildAttributionJourneys(data.campaigns, data.leads, data.opportunities, data.sales)
    const salesByMonth = [
      { mes: 'Jun', ventas: data.sales.filter((sale) => sale.closedAt.slice(5, 7) === '06').reduce((sum, sale) => sum + sale.value, 0) },
      { mes: 'Jul', ventas: data.sales.filter((sale) => sale.closedAt.slice(5, 7) === '07').reduce((sum, sale) => sum + sale.value, 0) },
      { mes: 'Ago', ventas: data.sales.filter((sale) => sale.closedAt.slice(5, 7) === '08').reduce((sum, sale) => sum + sale.value, 0) },
    ]
    const categories = Object.values(
      data.products.reduce<Record<string, { category: string; sales: number }>>((result, product) => {
        result[product.category] ??= { category: product.category, sales: 0 }
        result[product.category].sales += product.salesValue
        return result
      }, {}),
    ).sort((a, b) => b.sales - a.sales)

    return { metrics, pipeline, attribution, salesByMonth, categories }
  }, [data])

  if (!data || !view) return null
  const maxProductSales = Math.max(...data.products.map((product) => product.salesValue))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vista ejecutiva"
        title="Pulso comercial"
        description="Lectura unificada de ventas, demanda y avance comercial. Las cifras son sintéticas y validan la experiencia antes de conectar fuentes reales."
        actions={
          <div className="rounded-xl border border-mc-line bg-white px-3 py-2 text-xs font-semibold text-mc-muted shadow-sm">
            Periodo de muestra · jun–ago 2026
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <KpiCard label="Ventas" value={formatCurrency(view.metrics.salesValue, true)} delta={14} helper="6 ventas simuladas" icon={CircleDollarSign} accent="green" />
        <KpiCard label="Leads" value={view.metrics.totalLeads} delta={9} helper="Todos los orígenes" icon={Users} accent="blue" />
        <KpiCard label="Conversión" value={formatPercent(view.metrics.conversionRate)} delta={2.4} helper="Leads convertidos / leads" icon={Percent} accent="violet" />
        <KpiCard label="Ticket promedio" value={formatCurrency(view.metrics.averageTicket, true)} delta={6} helper="Sobre ventas ganadas" icon={BadgeDollarSign} accent="coral" />
        <KpiCard label="Clientes" value={view.metrics.activeCustomers} helper="Empresas activas" icon={Building2} accent="blue" />
        <KpiCard label="Pipeline" value={formatCurrency(view.metrics.pipelineValue, true)} delta={11} helper={`${view.metrics.openOpportunities} abiertas`} icon={Target} accent="amber" />
        <KpiCard label="Cotizaciones" value={view.metrics.openQuotes} helper="Abiertas o en borrador" icon={FileText} accent="coral" />
        <KpiCard label="Productos" value={data.products.length} helper="Con señales de demanda" icon={ShoppingBag} accent="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_.85fr]">
        <Panel title="Evolución de ventas" description="Ingresos registrados en el escenario sintético">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={view.salesByMonth} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
                <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffc62a" stopOpacity={0.38} /><stop offset="100%" stopColor="#ffc62a" stopOpacity={0.03} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5df" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#676b69' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(Number(value), true)} tick={{ fontSize: 10, fill: '#676b69' }} width={62} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Ventas']} contentStyle={{ borderRadius: 12, border: '1px solid #deded8', fontSize: 12 }} />
                <Area type="monotone" dataKey="ventas" stroke="#454a49" strokeWidth={3} fill="url(#salesFill)" isAnimationActive={false} dot={{ fill: '#ffc62a', stroke: '#454a49', strokeWidth: 2, r: 4 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Embudo comercial" description="Volumen por etapa, sin duplicar ventas históricas">
          <div className="space-y-3">
            {view.pipeline.map((item, index) => (
              <div key={item.stage} className="rounded-xl border border-[#e6e6e0] bg-[#f8f8f4] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-mc-gray-700"><span className="h-2 w-2 rounded-full ring-1 ring-mc-charcoal ring-offset-1" style={{ backgroundColor: chartColors[index] }} />{item.stage}</span>
                  <span className="text-xs font-black text-mc-gray-900">{formatCurrency(item.valor, true)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-mc-gray-400"><span>{item.oportunidades} oportunidades</span><span>{item.oportunidades ? 'Con actividad' : 'Sin registros'}</span></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Productos con mayor demanda" description="Ventas, leads y tendencia por producto">
          <div className="space-y-4">
            {data.products.slice().sort((a, b) => b.salesValue - a.salesValue).slice(0, 5).map((product) => (
              <ProductBar key={product.id} label={product.name} value={product.salesValue} max={maxProductSales} detail={`${product.leadCount} leads · ${product.trend >= 0 ? '+' : ''}${product.trend}%`} />
            ))}
          </div>
        </Panel>

        <Panel title="Ventas por categoría" description="Lectura comercial; no administra catálogo">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={view.categories} dataKey="sales" nameKey="category" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {view.categories.map((item, index) => <Cell key={item.category} fill={chartColors[index % chartColors.length]} stroke="#454a49" strokeWidth={1.5} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid #deded8', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {view.categories.map((item, index) => <div key={item.category} className="flex items-center gap-2 text-[11px] text-mc-gray-500"><span className="h-2 w-2 rounded-full ring-1 ring-mc-charcoal ring-offset-1" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span className="truncate">{item.category}</span></div>)}
          </div>
        </Panel>

        <Panel title="Canales y atribución" description="Canal → campaña → oportunidad → venta">
          <div className="space-y-3">
            {view.attribution.slice().sort((a, b) => b.revenue - a.revenue).map((journey) => (
                <div key={journey.campaignId} className="rounded-xl border border-[#e6e6e0] p-3">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold text-mc-gray-800">{journey.channel}</p><p className="mt-0.5 text-[10px] text-mc-gray-400">{journey.campaignName}</p></div><p className="text-xs font-black text-mc-gray-900">{formatCurrency(journey.revenue, true)}</p></div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-mc-muted"><span className="rounded bg-mc-gray-100 px-1.5 py-0.5">{journey.leadCount} leads</span><span>→</span><span className="rounded bg-mc-yellow-wash px-1.5 py-0.5 text-[#665000]">{journey.opportunityCount} oportunidades</span><span>→</span><span className="rounded bg-mc-success-soft px-1.5 py-0.5 text-mc-success">{journey.saleCount} ventas</span></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Campañas en observación" description="Rendimiento comercial preparado para datos de medios y analítica" padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-mc-surface-2 text-[10px] uppercase tracking-wider text-mc-muted"><tr><th className="px-5 py-3">Campaña</th><th className="px-4 py-3">Canal</th><th className="px-4 py-3 text-right">Inversión</th><th className="px-4 py-3 text-right">Impresiones</th><th className="px-4 py-3 text-right">Clics</th><th className="px-4 py-3 text-right">Leads</th><th className="px-5 py-3 text-right">Ingresos atribuidos</th></tr></thead>
            <tbody className="divide-y divide-mc-gray-100">
              {view.attribution.map((journey) => {
                const campaign = data.campaigns.find((item) => item.id === journey.campaignId)!
                return <tr key={journey.campaignId} className="hover:bg-mc-gray-50/70"><td className="px-5 py-3 font-bold text-mc-gray-800">{journey.campaignName}</td><td className="px-4 py-3"><StatusBadge status={journey.channel} /></td><td className="px-4 py-3 text-right text-mc-gray-600">{formatCurrency(campaign.spend)}</td><td className="px-4 py-3 text-right text-mc-gray-500">{formatNumber(campaign.impressions)}</td><td className="px-4 py-3 text-right text-mc-gray-500">{formatNumber(campaign.clicks)}</td><td className="px-4 py-3 text-right font-bold text-mc-gray-700">{journey.leadCount}</td><td className="px-5 py-3 text-right font-black text-mc-gray-900">{formatCurrency(journey.revenue)}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
