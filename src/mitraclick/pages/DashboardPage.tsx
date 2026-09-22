import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, PackageX, Receipt, ShoppingCart, Store, Truck, UserX } from 'lucide-react'
import { useDashboardFilters } from '../commercial/useDashboardFilters'
import {
  getBusinessUnitSummary,
  getClientActivity,
  getDailySeries,
  getGoalProgress,
  getProductHighlights,
  getProductPerformance,
  getRepLeaderboard,
  getRepsNeedingAttention,
  getStockoutsWithDemand,
  type GoalProgress,
} from '../commercial/selectors'
import { resolvePeriod } from '../commercial/period'
import { BUSINESS_UNIT_LABEL, type BusinessUnit } from '../domain'
import { UNIT_COLOR } from '../chartTheme'
import { FilterBar } from '../components/FilterBar'
import { DailySalesChart } from '../components/Charts'
import { Delta, KpiCard, MeterBar, PageHeader, Panel, ProductBar, Semaforo, SourceStamp, UserAvatar } from '../components/Primitives'
import { formatCurrency, formatRatio } from '../utils'
import { repPath } from '../commercial/links'

function GoalLine({ unit, progress }: { unit: BusinessUnit; progress: GoalProgress }) {
  const onPace = progress.pace >= 1
  return (
    <div data-testid={`goal-${unit}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: UNIT_COLOR[unit] }} aria-hidden="true" />
          {BUSINESS_UNIT_LABEL[unit]}
        </p>
        <p className="text-xs text-white/75 tabular">
          <span className="text-lg font-extrabold text-white">{formatCurrency(progress.monthToDate, true)}</span> de {formatCurrency(progress.goal, true)}
        </p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15" role="meter" aria-label={`Avance de ${BUSINESS_UNIT_LABEL[unit]} contra la meta del mes`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress.monthToDate / Math.max(1, progress.goal)) * 100)}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (progress.monthToDate / Math.max(1, progress.goal)) * 100)}%`, backgroundColor: UNIT_COLOR[unit] }} />
      </div>
      <p className="mt-1.5 text-[11px] text-white/75">
        <span className={`font-bold ${onPace ? 'text-mc-yellow' : 'text-white'}`}>{onPace ? 'En ritmo' : `Al ${formatRatio(progress.pace)} del ritmo`}</span>
        {`. Cierre proyectado: ${formatCurrency(progress.projected, true)} (${formatRatio(progress.projectedAttainment)} de la meta)`}
      </p>
    </div>
  )
}

export function DashboardPage() {
  const { commercial, period, setPeriod, params } = useDashboardFilters()
  const search = params.toString()

  const view = useMemo(() => {
    const reps = getRepLeaderboard(commercial, period)
    const products = getProductPerformance(commercial, period, 'todas')
    const highlights = getProductHighlights(products, 5)
    const today = getBusinessUnitSummary(commercial, resolvePeriod('hoy', commercial.asOf))
    const staleClients = getClientActivity(commercial, period).filter((client) => (client.daysSincePurchase ?? Infinity) > 30)
    return {
      summary: getBusinessUnitSummary(commercial, period),
      today,
      goals: getGoalProgress(commercial),
      reps,
      attention: getRepsNeedingAttention(reps),
      highlights,
      maxTop: highlights.top[0]?.revenue ?? 0,
      stockouts: getStockoutsWithDemand(commercial, 30),
      staleClients,
      series: getDailySeries(commercial, period.key === 'hoy' ? resolvePeriod('semana', commercial.asOf) : period),
    }
  }, [commercial, period])

  const { summary, today, goals, reps, attention, highlights } = view

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Dirección comercial" title="Resumen" description="Ventas de Mitra mayorista y Mitra Click, vendedores, material y alertas en una sola vista." />

      <section className="grid gap-4 rounded-2xl bg-mc-charcoal p-5 text-white shadow-mc-card lg:grid-cols-[1fr_1.35fr] lg:p-6" aria-label="Avance del mes contra meta" data-testid="goal-progress">
        <div className="flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-mc-yellow">Mes en curso</p>
            <p className="mt-1 text-4xl font-extrabold leading-none tabular lg:text-5xl" data-testid="month-total">{formatCurrency(goals.mitra.monthToDate + goals.mitraclick.monthToDate, true)}</p>
            <p className="mt-2 text-sm text-white/75 tabular">de {formatCurrency(goals.mitra.goal + goals.mitraclick.goal, true)} de meta combinada</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm" data-testid="today-sales">
            <div><dt className="text-[11px] text-white/75">Venta de hoy</dt><dd className="text-lg font-extrabold tabular">{formatCurrency(today.total.sales, true)}</dd></div>
            <div><dt className="text-[11px] text-white/75">Vs. mismo día semana pasada</dt><dd className="mt-1">{today.total.deltaPct === null ? <span className="text-xs text-white/75">Sin base</span> : <Delta value={today.total.deltaPct} />}</dd></div>
          </dl>
        </div>
        <div className="flex flex-col justify-center gap-5">
          <GoalLine unit="mitra" progress={goals.mitra} />
          <GoalLine unit="mitraclick" progress={goals.mitraclick} />
        </div>
      </section>

      <FilterBar period={period} onPeriodChange={setPeriod} asOf={commercial.asOf} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Venta Mitra mayorista" value={formatCurrency(summary.mitra.sales, true)} delta={summary.mitra.deltaPct ?? undefined} helper={period.comparisonLabel} icon={Truck} testId="kpi-mitra" />
        <KpiCard label="Venta Mitra Click" value={formatCurrency(summary.mitraclick.sales, true)} delta={summary.mitraclick.deltaPct ?? undefined} helper={period.comparisonLabel} icon={Store} testId="kpi-mitraclick" />
        <KpiCard label="Pedidos y órdenes" value={summary.total.orders.toLocaleString('es-MX')} helper={`${summary.mitra.orders} mayoristas, ${summary.mitraclick.orders} en línea`} icon={ShoppingCart} testId="kpi-orders" />
        <KpiCard label="Ticket promedio mayorista" value={formatCurrency(summary.mitra.averageTicket, true)} helper={`Mitra Click: ${formatCurrency(summary.mitraclick.averageTicket)}`} icon={Receipt} testId="kpi-ticket" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Venta diaria" description={period.key === 'hoy' ? 'Últimos 7 días' : period.label}>
          <DailySalesChart points={view.series} />
        </Panel>
        <Panel title="Vendedores" description={`Mejores del periodo y quién requiere atención`} action={<Link to={`/vendedores${search ? `?${search}` : ''}`} className="inline-flex items-center gap-1 text-xs font-semibold text-mc-ink hover:underline">Ver ranking <ArrowRight size={13} aria-hidden="true" /></Link>} testId="summary-reps">
          <p className="text-xs font-semibold text-mc-muted">Más venden</p>
          <ol className="mt-2 space-y-2">
            {reps.slice(0, 3).map((row, index) => (
              <li key={row.repId}>
                <Link to={repPath(row.repId, search)} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-mc-surface-2">
                  <span className="w-4 text-xs font-bold text-mc-muted tabular">{index + 1}</span>
                  <UserAvatar name={row.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-mc-ink">{row.name}</span>
                    <MeterBar value={row.attainment * 100} status={row.status} label={`Avance de ${row.name}`} />
                  </span>
                  <span className="w-20 text-right text-sm font-bold text-mc-ink tabular">{formatCurrency(row.sales, true)}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs font-semibold text-mc-muted">Requieren atención</p>
          {attention.length ? (
            <ul className="mt-2 space-y-1.5">
              {attention.slice(0, 4).map((row) => (
                <li key={row.repId}>
                  <Link to={repPath(row.repId, search)} className="flex items-center justify-between gap-3 rounded-xl p-1.5 text-sm hover:bg-mc-surface-2">
                    <span className="min-w-0 truncate font-semibold text-mc-ink">{row.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-mc-muted tabular">{row.status === 'sin-ventas' ? `${row.daysSinceLastSale ?? '—'} días sin vender` : formatRatio(row.attainment)}<Semaforo status={row.status} compact /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-mc-muted">Todo el equipo va en cuota.</p>}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Material más vendido" description="Ambos negocios, por venta del periodo" action={<Link to={`/productos${search ? `?${search}` : ''}`} className="inline-flex items-center gap-1 text-xs font-semibold text-mc-ink hover:underline">Productos <ArrowRight size={13} aria-hidden="true" /></Link>} testId="summary-top-products">
          <div className="space-y-3">{highlights.top.map((row) => <ProductBar key={row.product.id} label={row.product.name} value={row.revenue} max={view.maxTop} detail={`${formatCurrency(row.revenue, true)}${row.deltaPct !== null ? `, ${row.deltaPct >= 0 ? '+' : '−'}${Math.abs(row.deltaPct)}%` : ''}`} />)}</div>
        </Panel>
        <Panel title="Material que cae" description={`Mayor caída ${period.comparisonLabel}`} testId="summary-falling-products">
          <ul className="space-y-2.5">
            {highlights.falling.map((row) => (
              <li key={row.product.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0"><span className="block truncate font-semibold text-mc-ink">{row.product.name}</span><span className="block text-[11px] text-mc-muted">{BUSINESS_UNIT_LABEL[row.product.businessUnit]}</span></span>
                {row.deltaPct !== null && <Delta value={row.deltaPct} />}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Alertas" description="Lo que conviene revisar hoy" testId="summary-alerts">
          <ul className="space-y-2">
            <AlertItem icon={AlertTriangle} tone="warning" to={`/vendedores${search ? `?${search}` : ''}`} title={`${attention.length} ${attention.length === 1 ? 'vendedor' : 'vendedores'} fuera de cuota o sin vender`} />
            <AlertItem icon={PackageX} tone="danger" to="/productos" title={`${view.stockouts.length} ${view.stockouts.length === 1 ? 'producto agotado' : 'productos agotados'} con demanda`} detail={view.stockouts.slice(0, 2).map((row) => row.product.name).join(', ')} />
            <AlertItem icon={UserX} tone="warning" to="/mitra" title={`${view.staleClients.length} ${view.staleClients.length === 1 ? 'cliente mayorista' : 'clientes mayoristas'} sin comprar en 30+ días`} detail={view.staleClients.slice(0, 2).map((client) => client.name).join(', ')} />
          </ul>
        </Panel>
      </div>
      <SourceStamp source="Datos simulados de pedidos mayoristas y órdenes de Mitra Click" period={period.label} updatedAt={commercial.generatedAt} />
    </div>
  )
}

function AlertItem({ icon: Icon, tone, title, detail, to }: { icon: typeof AlertTriangle; tone: 'warning' | 'danger'; title: string; detail?: string; to: string }) {
  return (
    <li>
      <Link to={to} className="flex items-start gap-3 rounded-xl border border-mc-line-soft p-3 hover:border-mc-line hover:bg-mc-surface-2/60">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone === 'danger' ? 'bg-mc-danger-soft text-mc-danger' : 'bg-mc-warning-soft text-mc-warning'}`}><Icon size={16} aria-hidden="true" /></span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-mc-ink">{title}</span>
          {detail && <span className="block truncate text-[11px] text-mc-muted">{detail}</span>}
        </span>
      </Link>
    </li>
  )
}
