import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Receipt, Truck, Users } from 'lucide-react'
import { useDashboardFilters } from '../commercial/useDashboardFilters'
import { getBusinessUnitSummary, getCategoryPerformance, getClientActivity, getDailySeries, getGoalProgress, getRepLeaderboard } from '../commercial/selectors'
import { FilterBar } from '../components/FilterBar'
import { DailySalesChart } from '../components/Charts'
import { Delta, KpiCard, PageHeader, Panel, ProductBar, SourceStamp } from '../components/Primitives'
import { formatCurrency, formatRatio } from '../utils'
import { repPath } from '../commercial/links'

export function MitraWholesalePage() {
  const { commercial, period, setPeriod, params } = useDashboardFilters()
  const search = params.toString()

  const view = useMemo(() => {
    const clients = getClientActivity(commercial, period)
    const repName = new Map(commercial.reps.map((rep) => [rep.id, rep.name]))
    const openQuotes = commercial.quotes.filter((quote) => (quote.status === 'enviada' || quote.status === 'negociacion') && quote.date <= period.end)
    const reps = getRepLeaderboard(commercial, period)
    return {
      summary: getBusinessUnitSummary(commercial, period).mitra,
      goal: getGoalProgress(commercial).mitra,
      categories: getCategoryPerformance(commercial, period, 'mitra'),
      topClients: clients.filter((client) => client.sales > 0).slice(0, 8),
      staleClients: clients.filter((client) => (client.daysSincePurchase ?? Infinity) > 30).sort((a, b) => (b.daysSincePurchase ?? 999) - (a.daysSincePurchase ?? 999)),
      activeClients: clients.filter((client) => client.orders > 0).length,
      openQuotes,
      openQuotesValue: openQuotes.reduce((sum, quote) => sum + quote.amount, 0),
      reps,
      repName,
      series: getDailySeries(commercial, period),
    }
  }, [commercial, period])

  const maxCategory = view.categories[0]?.revenue ?? 0

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Negocio B2B" title="Mitra mayorista" description="Ventas de material industrial por pedido, categoría, cliente y cotización." />
      <FilterBar period={period} onPeriodChange={setPeriod} asOf={commercial.asOf} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Venta mayorista" value={formatCurrency(view.summary.sales, true)} delta={view.summary.deltaPct ?? undefined} helper={period.comparisonLabel} icon={Truck} testId="kpi-mitra-sales" />
        <KpiCard label="Meta del mes" value={formatRatio(view.goal.pace)} helper={`del ritmo. Proyección ${formatCurrency(view.goal.projected, true)} de ${formatCurrency(view.goal.goal, true)}`} icon={Receipt} testId="kpi-mitra-goal" />
        <KpiCard label="Clientes con compra" value={`${view.activeClients} de ${commercial.clients.length}`} helper={`Ticket promedio ${formatCurrency(view.summary.averageTicket, true)}`} icon={Users} />
        <KpiCard label="Cotizaciones abiertas" value={view.openQuotes.length} helper={`${formatCurrency(view.openQuotesValue, true)} en negociación o enviadas`} icon={FileText} testId="kpi-mitra-quotes" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Venta diaria mayorista" description={period.label}>
          <DailySalesChart points={view.series} units={['mitra']} />
        </Panel>
        <Panel title="Venta por categoría" description="Material industrial del periodo">
          <div className="space-y-3">
            {view.categories.map((category) => (
              <ProductBar key={category.category} label={category.category} value={category.revenue} max={maxCategory} detail={`${formatCurrency(category.revenue, true)}${category.deltaPct !== null ? `, ${category.deltaPct >= 0 ? '+' : '−'}${Math.abs(category.deltaPct)}%` : ''}`} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Clientes que más compran" description={period.label} padding={false} testId="mitra-top-clients">
          <ul className="divide-y divide-mc-line-soft">
            {view.topClients.map((client) => (
              <li key={client.clientId} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-mc-ink">{client.name}</span>
                  <span className="block text-[11px] text-mc-muted">{client.client.type}. Vendedor: {view.repName.get(client.repId)}</span>
                </span>
                <span className="shrink-0 text-right"><span className="block font-bold text-mc-ink tabular">{formatCurrency(client.sales, true)}</span><span className="block text-[11px] text-mc-muted tabular">{client.orders} pedidos</span></span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Clientes sin comprar en 30+ días" description="Cuentas a recuperar, con su vendedor asignado" padding={false} testId="mitra-stale-clients">
          {view.staleClients.length ? (
            <ul className="divide-y divide-mc-line-soft">
              {view.staleClients.map((client) => (
                <li key={client.clientId} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-mc-ink">{client.name}</span>
                    <Link to={repPath(client.repId, search)} className="block text-[11px] text-mc-muted hover:underline">Vendedor: {view.repName.get(client.repId)}</Link>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-mc-danger tabular">{client.daysSincePurchase === null ? 'Sin compras' : `${client.daysSincePurchase} días`}</span>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-8 text-center text-sm text-mc-muted">Todos los clientes compraron en los últimos 30 días.</p>}
        </Panel>
      </div>

      <Panel title="Cotizaciones por vendedor" description="Abiertas a la fecha y tasa de cierre del periodo" padding={false} testId="mitra-quotes-by-rep">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Cotizaciones por vendedor</caption>
            <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Vendedor</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Abiertas</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Valor abierto</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Tasa de cierre</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Venta vs. anterior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mc-line-soft">
              {view.reps.map((row) => (
                <tr key={row.repId}>
                  <td className="px-5 py-2.5"><Link to={repPath(row.repId, search)} className="font-semibold text-mc-ink hover:underline">{row.name}</Link></td>
                  <td className="px-3 py-2.5 text-right tabular">{row.openQuotes}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-mc-ink tabular">{formatCurrency(row.openQuotesValue, true)}</td>
                  <td className="px-3 py-2.5 text-right tabular">{row.quoteWinRate === null ? <span className="text-xs text-mc-muted">Sin cierres</span> : formatRatio(row.quoteWinRate)}</td>
                  <td className="px-5 py-2.5">{row.deltaPct === null ? <span className="text-xs text-mc-muted">Sin base</span> : <Delta value={row.deltaPct} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <SourceStamp source="Datos simulados del sistema interno de Mitra" period={period.label} updatedAt={commercial.generatedAt} />
    </div>
  )
}
