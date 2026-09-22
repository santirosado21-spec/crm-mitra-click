import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BadgeDollarSign, FileBarChart, Percent, Target, Users } from 'lucide-react'
import { useMitraClick } from '../MitraClickContext'
import { buildAttributionJourneys, getExecutiveMetrics, groupOpportunitiesByStage } from '../selectors'
import { formatCurrency, formatNumber, formatPercent } from '../utils'
import { IntegrationBadge, KpiCard, PageHeader, Panel } from '../components/Primitives'

const reports = ['Ejecutivo', 'Ventas', 'Leads', 'Pipeline', 'Productos', 'Atribución', 'Cotizaciones'] as const
type ReportName = (typeof reports)[number]

interface ChartRow { label: string; volumen: number; valor: number }

export function ReportsPage() {
  const { data } = useMitraClick()
  const [report, setReport] = useState<ReportName>('Ejecutivo')

  const view = useMemo(() => {
    if (!data) return null
    const metrics = getExecutiveMetrics({ leads: data.leads, opportunities: data.opportunities, sales: data.sales, activeCustomers: data.companies.filter((item) => item.status === 'Cliente').length, openQuotes: data.quotes.filter((item) => !['Aceptada', 'Rechazada', 'Vencida'].includes(item.status)).length })
    const pipeline = groupOpportunitiesByStage(data.opportunities)
    const attribution = buildAttributionJourneys(data.campaigns, data.leads, data.opportunities, data.sales)
    let rows: ChartRow[] = []
    let title = ''
    let description = ''

    if (report === 'Ejecutivo' || report === 'Pipeline') {
      rows = Object.entries(pipeline).map(([label, items]) => ({ label, volumen: items.length, valor: items.reduce((sum, item) => sum + item.value, 0) }))
      title = report === 'Ejecutivo' ? 'Valor por etapa comercial' : 'Distribución del pipeline'
      description = 'Oportunidades y valor agregado por etapa'
    } else if (report === 'Ventas') {
      rows = ['06', '07', '08'].map((month, index) => { const monthSales = data.sales.filter((sale) => sale.closedAt.slice(5, 7) === month); return { label: ['Junio', 'Julio', 'Agosto'][index], volumen: monthSales.length, valor: monthSales.reduce((sum, sale) => sum + sale.value, 0) } })
      title = 'Ventas por mes'
      description = 'Ingresos y operaciones del escenario sintético'
    } else if (report === 'Leads') {
      rows = Object.entries(data.leads.reduce<Record<string, typeof data.leads>>((result, lead) => { (result[lead.source] ??= []).push(lead); return result }, {})).map(([label, leads]) => ({ label, volumen: leads.length, valor: leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length }))
      title = 'Leads por origen'
      description = 'Volumen y puntuación promedio por fuente'
    } else if (report === 'Productos') {
      rows = data.products.map((product) => ({ label: product.name, volumen: product.leadCount, valor: product.salesValue })).sort((a, b) => b.valor - a.valor)
      title = 'Desempeño por producto'
      description = 'Ventas atribuidas y leads con interés'
    } else if (report === 'Atribución') {
      rows = attribution.map((item) => ({ label: item.channel, volumen: item.leadCount, valor: item.revenue }))
      title = 'Ingresos por canal'
      description = 'Recorrido trazado desde campaña hasta venta'
    } else {
      rows = Object.entries(data.quotes.reduce<Record<string, typeof data.quotes>>((result, quote) => { (result[quote.status] ??= []).push(quote); return result }, {})).map(([label, quotes]) => ({ label, volumen: quotes.length, valor: quotes.reduce((sum, quote) => sum + quote.value, 0) }))
      title = 'Cotizaciones por estado'
      description = 'Volumen y valor agregado de propuestas'
    }

    return { metrics, rows, title, description }
  }, [data, report])

  if (!data || !view) return null
  const volumeLabel = report === 'Leads' || report === 'Productos' || report === 'Atribución' ? 'Leads' : 'Registros'
  const valueLabel = report === 'Leads' ? 'Puntuación promedio' : 'Valor'

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analítica" title="Reportes" description="Vistas preparadas para dirección, ventas, leads, pipeline, productos, atribución y cotizaciones." actions={<IntegrationBadge label="Exportación y agenda pendientes" />} />
      <div className="flex gap-2 overflow-x-auto pb-1">{reports.map((item) => <button key={item} type="button" onClick={() => setReport(item)} className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition ${report === item ? 'border-mc-charcoal bg-mc-charcoal text-white shadow-sm' : 'border-mc-gray-200 bg-white text-mc-gray-500 hover:border-mc-gray-300'}`}>{item}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Ventas" value={formatCurrency(view.metrics.salesValue, true)} helper="Periodo de muestra" icon={BadgeDollarSign} accent="green" /><KpiCard label="Leads" value={view.metrics.totalLeads} helper="Escenario actual" icon={Users} accent="blue" /><KpiCard label="Conversión" value={formatPercent(view.metrics.conversionRate)} helper="Leads convertidos / leads" icon={Percent} accent="violet" /><KpiCard label="Pipeline" value={formatCurrency(view.metrics.pipelineValue, true)} helper={`${view.metrics.openOpportunities} abiertas`} icon={Target} accent="amber" /></div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Panel title={view.title} description={view.description}><div className="h-[360px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={view.rows} margin={{ left: 0, right: 10, top: 10, bottom: 44 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf2" /><XAxis dataKey="label" angle={view.rows.length > 5 ? -28 : 0} textAnchor={view.rows.length > 5 ? 'end' : 'middle'} interval={0} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis yAxisId="value" tickFormatter={(value) => report === 'Leads' ? formatNumber(Number(value)) : formatCurrency(Number(value), true)} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={58} /><YAxis yAxisId="volume" orientation="right" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={26} /><Tooltip formatter={(value, name) => [name === 'valor' ? (report === 'Leads' ? formatNumber(Number(value)) : formatCurrency(Number(value))) : formatNumber(Number(value)), name === 'valor' ? valueLabel : volumeLabel]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} /><Bar yAxisId="value" dataKey="valor" fill="#23395d" radius={[6, 6, 0, 0]} /><Bar yAxisId="volume" dataKey="volumen" fill="#e25f45" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel title={`Lectura · ${report}`} description="Resumen de la vista seleccionada"><div className="space-y-3"><div className="rounded-2xl border border-mc-gray-200 bg-mc-gray-50/60 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-mc-charcoal shadow-sm"><FileBarChart size={18} /></span><p className="mt-4 text-sm font-extrabold text-mc-gray-900">{view.title}</p><p className="mt-1 text-xs leading-5 text-mc-gray-500">{view.description}. Esta composición se alimentará del repositorio normalizado cuando existan conectores.</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-mc-gray-200 p-3"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Dimensiones</p><p className="mt-1 text-lg font-black text-mc-gray-900">{view.rows.length}</p></div><div className="rounded-xl border border-mc-gray-200 p-3"><p className="text-[10px] font-bold uppercase text-mc-gray-400">Fuente</p><p className="mt-1 text-xs font-extrabold text-mc-gray-700">Datos simulados</p></div></div><div className="rounded-xl border border-mc-warning/30 bg-mc-warning-soft p-3 text-xs leading-5 text-mc-warning"><span className="font-extrabold">Pendiente:</span> fórmulas aprobadas, rangos reales, exportación, suscripciones y control de acceso por reporte.</div></div></Panel>
      </div>
      <Panel title="Detalle del reporte" description="Tabla preparada para exportación futura" padding={false}><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-mc-gray-50 text-[10px] uppercase tracking-wider text-mc-gray-400"><tr><th className="px-5 py-3">Dimensión</th><th className="px-4 py-3 text-right">{volumeLabel}</th><th className="px-5 py-3 text-right">{valueLabel}</th></tr></thead><tbody className="divide-y divide-mc-gray-100">{view.rows.map((row) => <tr key={row.label} className="hover:bg-mc-gray-50"><td className="px-5 py-3 font-extrabold text-mc-gray-800">{row.label}</td><td className="px-4 py-3 text-right font-bold text-mc-gray-600">{formatNumber(row.volumen)}</td><td className="px-5 py-3 text-right font-black text-mc-gray-900">{report === 'Leads' ? formatNumber(row.valor) : formatCurrency(row.valor)}</td></tr>)}</tbody></table></div></Panel>
    </div>
  )
}
