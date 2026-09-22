import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Boxes, PackageX, Layers, TrendingDown } from 'lucide-react'
import { useDashboardFilters } from '../commercial/useDashboardFilters'
import {
  getCategoryPerformance,
  getProductHighlights,
  getProductPerformance,
  getSlowMovers,
  getStockoutsWithDemand,
  type ProductPerformance,
} from '../commercial/selectors'
import { formatDayLabel } from '../commercial/dates'
import { BUSINESS_UNIT_LABEL } from '../domain'
import { CHART, axisTick } from '../chartTheme'
import { FilterBar, Segmented } from '../components/FilterBar'
import { Delta, EmptyState, KpiCard, PageHeader, Panel, SourceStamp } from '../components/Primitives'
import { formatCurrency, formatNumber, formatRatio } from '../utils'

const SLOW_OPTIONS = [
  { value: '30', label: '30 días' },
  { value: '60', label: '60 días' },
  { value: '90', label: '90 días' },
] as const
type SlowDays = (typeof SLOW_OPTIONS)[number]['value']

function ProductTable({ rows, caption, testId }: { rows: ProductPerformance[]; caption: string; testId: string }) {
  if (!rows.length) return <EmptyState title="Sin productos para mostrar" description="Prueba con otro periodo o unidad de negocio." />
  return (
    <table className="w-full table-fixed text-left text-sm" data-testid={testId}>
      <caption className="sr-only">{caption}</caption>
      <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
        <tr>
          <th scope="col" className="px-5 py-2.5 font-semibold">Producto</th>
          <th scope="col" className="w-24 px-3 py-2.5 text-right font-semibold">Venta</th>
          <th scope="col" className="w-28 px-5 py-2.5 text-right font-semibold">Vs. anterior</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-mc-line-soft">
        {rows.map((row) => (
          <tr key={row.product.id} data-testid={`product-${row.product.id}`}>
            <td className="px-5 py-2.5">
              <span className="block truncate font-semibold text-mc-ink" title={row.product.name}>{row.product.name}</span>
              <span className="block truncate text-[11px] text-mc-muted">
                {formatNumber(row.units)} {row.product.unit}s{row.share > 0 && `, ${formatRatio(row.share, 1)} del total`}. {row.product.brand}, {BUSINESS_UNIT_LABEL[row.product.businessUnit]}
              </span>
            </td>
            <td className="px-3 py-2.5 text-right font-bold text-mc-ink tabular">{formatCurrency(row.revenue, true)}</td>
            <td className="px-5 py-2.5 text-right">{row.deltaPct === null ? <span className="text-xs text-mc-muted">Sin base</span> : <Delta value={row.deltaPct} />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ProductsPage() {
  const { commercial, period, setPeriod, unit, setUnit, params, setParam } = useDashboardFilters()
  const slowParam = params.get('sin-movimiento')
  const slowDays: SlowDays = slowParam === '60' || slowParam === '90' ? slowParam : '30'

  const view = useMemo(() => {
    const rows = getProductPerformance(commercial, period, unit)
    const categories = getCategoryPerformance(commercial, period, unit)
    const inUnit = (businessUnit: string) => unit === 'todas' || unit === businessUnit
    return {
      rows,
      highlights: getProductHighlights(rows, 8),
      categories,
      stockouts: getStockoutsWithDemand(commercial, 30).filter((row) => inUnit(row.product.businessUnit)),
      slow: getSlowMovers(commercial, Number(slowDays)).filter((row) => inUnit(row.product.businessUnit)),
      revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
      sold: rows.filter((row) => row.revenue > 0).length,
    }
  }, [commercial, period, unit, slowDays])

  const topCategory = view.categories[0]
  const chartCategories = view.categories.slice(0, 10).map((item) => ({ ...item, label: unit === 'todas' ? `${item.category} (${item.businessUnit === 'mitra' ? 'B2B' : 'Click'})` : item.category }))

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Material y producto" title="Productos" description="Qué material se vende bien, qué no se mueve y qué se está agotando con demanda." />
      <FilterBar period={period} onPeriodChange={setPeriod} unit={unit} onUnitChange={setUnit} asOf={commercial.asOf} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Venta de productos" value={formatCurrency(view.revenue, true)} helper={period.label} icon={Boxes} testId="products-revenue" />
        <KpiCard label="Productos con venta" value={`${view.sold} de ${view.rows.length}`} helper="En el catálogo filtrado" icon={Layers} />
        <KpiCard label="Categoría líder" value={topCategory ? topCategory.category : 'Sin ventas'} helper={topCategory ? formatCurrency(topCategory.revenue, true) : undefined} icon={TrendingDown} />
        <KpiCard label="Agotados con demanda" value={view.stockouts.length} helper="Vendieron en los últimos 30 días" icon={PackageX} testId="products-stockouts" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Lo que más se vende" description="Top por venta del periodo" padding={false} testId="products-top">
          <ProductTable rows={view.highlights.top} caption="Productos más vendidos" testId="table-products-top" />
        </Panel>
        <Panel title="Lo que menos se vende" description="Catálogo con menor venta del periodo, incluidos los que no vendieron" padding={false} testId="products-bottom">
          <ProductTable rows={view.highlights.bottom} caption="Productos menos vendidos" testId="table-products-bottom" />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Venta por categoría" description="Top 10 categorías del periodo">
          <div style={{ height: Math.max(220, chartCategories.length * 34) }} role="img" aria-label="Venta por categoría">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCategories} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value), true)} axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis type="category" dataKey="label" width={210} axisLine={false} tickLine={false} tick={{ ...axisTick, fill: CHART.ink }} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Venta']} contentStyle={{ borderRadius: 12, border: `1px solid ${CHART.grid}`, fontSize: 12 }} cursor={{ fill: 'rgba(69,74,73,.06)' }} />
                <Bar dataKey="revenue" fill={CHART.neutral} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Caen contra el periodo anterior" description={`Mayor caída porcentual, ${period.comparisonLabel}`} padding={false} testId="products-falling">
          <ProductTable rows={view.highlights.falling} caption="Productos con mayor caída" testId="table-products-falling" />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Agotados que se siguen pidiendo" description="Sin existencia y con venta en los últimos 30 días: prioridad de reabasto" padding={false} testId="products-stockouts-list">
          {view.stockouts.length ? (
            <ul className="divide-y divide-mc-line-soft">
              {view.stockouts.map((row) => (
                <li key={row.product.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-mc-ink">{row.product.name}</span>
                    <span className="block text-[11px] text-mc-muted">{BUSINESS_UNIT_LABEL[row.product.businessUnit]}. Última venta: {formatDayLabel(row.lastSaleDate)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold text-mc-danger tabular">{formatCurrency(row.revenueInWindow, true)}</span>
                    <span className="block text-[11px] text-mc-muted tabular">{formatNumber(row.unitsInWindow)} {row.product.unit}s en 30 días</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Sin agotados con demanda" description="Ningún producto agotado tuvo venta en los últimos 30 días." />}
        </Panel>
        <Panel
          title="Sin movimiento"
          description="Productos con existencia que no se venden, ordenados por valor de inventario detenido"
          action={<Segmented label="Días sin venta" value={slowDays} options={SLOW_OPTIONS.map((option) => ({ ...option }))} onChange={(value) => setParam('sin-movimiento', value, '30')} testId="filter-slow-days" />}
          padding={false}
          testId="products-slow"
        >
          {view.slow.length ? (
            <ul className="divide-y divide-mc-line-soft">
              {view.slow.map((row) => (
                <li key={row.product.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-mc-ink">{row.product.name}</span>
                    <span className="block text-[11px] text-mc-muted">
                      {row.daysSinceLastSale === null ? 'Sin ventas en los últimos 90 días' : `${row.daysSinceLastSale} días sin venta`}, {formatNumber(row.product.stock)} {row.product.unit}s en existencia
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-mc-warning tabular">{formatCurrency(row.stockValue, true)}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Todo se está moviendo" description={`Ningún producto con existencia lleva ${slowDays} días sin venta.`} />}
        </Panel>
      </div>
      <SourceStamp source="Datos simulados de pedidos, órdenes e inventario" period={period.label} updatedAt={commercial.generatedAt} />
    </div>
  )
}
