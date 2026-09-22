import { useMemo } from 'react'
import { MousePointerClick, Receipt, Store } from 'lucide-react'
import { useDashboardFilters } from '../commercial/useDashboardFilters'
import { getBusinessUnitSummary, getChannelMix, getDailySeries, getFunnel, getGoalProgress, getProductHighlights, getProductPerformance, getStockoutsWithDemand } from '../commercial/selectors'
import { FilterBar } from '../components/FilterBar'
import { DailySalesChart } from '../components/Charts'
import { IntegrationBadge, KpiCard, PageHeader, Panel, ProductBar, SourceStamp } from '../components/Primitives'
import { formatCurrency, formatNumber, formatRatio } from '../utils'

export function MitraClickPage() {
  const { commercial, period, setPeriod } = useDashboardFilters()

  const view = useMemo(() => {
    const funnel = getFunnel(commercial, period)
    const products = getProductPerformance(commercial, period, 'mitraclick')
    return {
      summary: getBusinessUnitSummary(commercial, period).mitraclick,
      goal: getGoalProgress(commercial).mitraclick,
      channels: getChannelMix(commercial, period),
      funnel,
      steps: [
        { label: 'Visitas', value: funnel.visits },
        { label: 'Vieron producto', value: funnel.productViews },
        { label: 'Agregaron al carrito', value: funnel.carts },
        { label: 'Iniciaron pago', value: funnel.checkouts },
        { label: 'Compraron', value: funnel.orders },
      ],
      top: getProductHighlights(products, 6).top,
      stockouts: getStockoutsWithDemand(commercial, 30).filter((row) => row.product.businessUnit === 'mitraclick'),
      series: getDailySeries(commercial, period),
    }
  }, [commercial, period])

  const maxChannel = view.channels[0]?.sales ?? 0
  const maxTop = view.top[0]?.revenue ?? 0

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Negocio B2C" title="Mitra Click" description="Ventas de la tienda en línea por canal, embudo de compra y producto." actions={<IntegrationBadge label="Shopify y GA4 pendientes" />} />
      <FilterBar period={period} onPeriodChange={setPeriod} asOf={commercial.asOf} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Venta en línea" value={formatCurrency(view.summary.sales, true)} delta={view.summary.deltaPct ?? undefined} helper={period.comparisonLabel} icon={Store} testId="kpi-click-sales" />
        <KpiCard label="Meta del mes" value={formatRatio(view.goal.pace)} helper={`del ritmo. Proyección ${formatCurrency(view.goal.projected, true)} de ${formatCurrency(view.goal.goal, true)}`} icon={Receipt} testId="kpi-click-goal" />
        <KpiCard label="Conversión" value={formatRatio(view.funnel.conversionRate, 2)} helper={`${formatNumber(view.funnel.orders)} órdenes de ${formatNumber(view.funnel.visits)} visitas`} icon={MousePointerClick} testId="kpi-click-conversion" />
        <KpiCard label="Ticket promedio" value={formatCurrency(view.summary.averageTicket)} helper={`${formatNumber(view.summary.orders)} órdenes`} icon={Receipt} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Venta diaria en línea" description={period.label}>
          <DailySalesChart points={view.series} units={['mitraclick']} />
        </Panel>
        <Panel title="Embudo de compra" description="Del tráfico a la compra, con la tasa de paso entre etapas" testId="click-funnel">
          <ol className="space-y-3">
            {view.steps.map((step, index) => {
              const previous = index ? view.steps[index - 1].value : step.value
              return (
                <li key={step.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-mc-ink">{step.label}</span>
                    <span className="tabular"><span className="font-bold text-mc-ink">{formatNumber(step.value)}</span>{index > 0 && <span className="ml-2 text-xs text-mc-muted">{formatRatio(previous ? step.value / previous : 0)} pasa</span>}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-mc-gray-100"><div className="h-full rounded-full bg-mc-series-2" style={{ width: `${Math.max(2, (step.value / Math.max(1, view.funnel.visits)) * 100)}%` }} /></div>
                </li>
              )
            })}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Venta por canal" description="Origen de las órdenes">
          <div className="space-y-3">{view.channels.map((channel) => <ProductBar key={channel.channel} label={channel.channel} value={channel.sales} max={maxChannel} detail={`${formatCurrency(channel.sales, true)}, ${formatRatio(channel.share)}`} />)}</div>
        </Panel>
        <Panel title="Más vendidos en línea" description={period.label}>
          <div className="space-y-3">{view.top.map((row) => <ProductBar key={row.product.id} label={row.product.name} value={row.revenue} max={maxTop} detail={`${formatCurrency(row.revenue, true)}, ${row.units} pzas`} />)}</div>
        </Panel>
        <Panel title="Agotados con demanda" description="Sin existencia en la tienda y con venta reciente" padding={false}>
          <ul className="divide-y divide-mc-line-soft">
            {view.stockouts.map((row) => (
              <li key={row.product.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-mc-ink">{row.product.name}</span>
                <span className="shrink-0 text-xs font-bold text-mc-danger tabular">{row.unitsInWindow} pzas en 30 días</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <SourceStamp source="Datos simulados de órdenes Shopify y tráfico GA4" period={period.label} updatedAt={commercial.generatedAt} />
    </div>
  )
}
