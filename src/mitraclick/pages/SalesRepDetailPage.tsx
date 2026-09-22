import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, FileText, Receipt, ShoppingCart, Users } from 'lucide-react'
import { useDashboardFilters } from '../commercial/useDashboardFilters'
import { getClientActivity, getProductPerformance, getRepDailySeries, getRepLeaderboard } from '../commercial/selectors'
import { formatDayLabel } from '../commercial/dates'
import { FilterBar } from '../components/FilterBar'
import { SingleSeriesBars } from '../components/Charts'
import { Delta, EmptyState, KpiCard, MeterBar, PageHeader, Panel, ProductBar, Semaforo, UserAvatar } from '../components/Primitives'
import { formatCurrency, formatRatio } from '../utils'

const QUOTE_STATUS_LABEL = { enviada: 'Enviada', negociacion: 'En negociación', ganada: 'Ganada', perdida: 'Perdida' } as const

export function SalesRepDetailPage() {
  const { repId = '' } = useParams()
  const { commercial, period, setPeriod, params } = useDashboardFilters()
  const search = params.toString()

  const view = useMemo(() => {
    const row = getRepLeaderboard(commercial, period).find((item) => item.repId === repId)
    if (!row) return null
    const products = getProductPerformance(commercial, period, 'mitra', { repId }).filter((item) => item.revenue > 0)
    const clients = getClientActivity(commercial, period).filter((client) => client.repId === repId)
    const openQuotes = commercial.quotes
      .filter((quote) => quote.repId === repId && (quote.status === 'enviada' || quote.status === 'negociacion') && quote.date <= period.end)
      .sort((a, b) => b.amount - a.amount)
    return { row, products, clients, openQuotes, series: getRepDailySeries(commercial, repId, period) }
  }, [commercial, period, repId])

  if (!view) {
    return (
      <Panel>
        <EmptyState title="No encontramos a este vendedor" description="Revisa el enlace o vuelve al ranking de vendedores." />
        <div className="text-center"><Link to="/vendedores" className="text-sm font-semibold text-mc-ink underline">Ir a Vendedores</Link></div>
      </Panel>
    )
  }

  const { row, products, clients, openQuotes, series } = view
  const clientName = new Map(commercial.clients.map((client) => [client.id, client.name]))
  const maxProduct = products[0]?.revenue ?? 0

  return (
    <div className="space-y-5">
      <Link to={`/vendedores${search ? `?${search}` : ''}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-mc-muted hover:text-mc-ink">
        <ArrowLeft size={14} aria-hidden="true" /> Volver al ranking
      </Link>
      <PageHeader
        eyebrow={row.zone}
        title={row.name}
        description={`Desempeño de ${row.name.split(' ')[0]} contra su cuota mensual de ${formatCurrency(row.rep.monthlyQuota)}.`}
        actions={<div className="flex items-center gap-3"><UserAvatar name={row.name} size="lg" /><Semaforo status={row.status} /></div>}
      />
      <FilterBar period={period} onPeriodChange={setPeriod} asOf={commercial.asOf} />

      <section className="rounded-2xl border border-mc-line bg-mc-surface p-5 shadow-mc-card" aria-label="Avance contra cuota" data-testid="rep-attainment">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-mc-muted">Venta del periodo</p>
            <p className="flex flex-wrap items-center gap-2 text-3xl font-extrabold text-mc-ink tabular" data-testid="rep-sales">{formatCurrency(row.sales)}{row.deltaPct !== null && <Delta value={row.deltaPct} />}</p>
          </div>
          <p className="text-sm text-mc-muted tabular"><span className="text-xl font-extrabold text-mc-ink">{formatRatio(row.attainment)}</span> de {formatCurrency(row.quota)} de cuota</p>
        </div>
        <div className="mt-4"><MeterBar value={row.attainment * 100} status={row.status} label="Avance contra cuota" /></div>
        <p className="mt-2 text-xs text-mc-muted">{row.gapToQuota > 0 ? `Le faltan ${formatCurrency(row.gapToQuota)} para cumplir la cuota del periodo.` : 'Cumplió la cuota del periodo.'}</p>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Pedidos" value={row.orders} helper={`${row.openQuotes} cotizaciones abiertas`} icon={ShoppingCart} testId="rep-orders" />
        <KpiCard label="Ticket promedio" value={formatCurrency(row.averageTicket, true)} icon={Receipt} />
        <KpiCard label="Clientes con compra" value={row.activeClients} helper={`de ${clients.length} en su cartera`} icon={Users} />
        <KpiCard label="Última venta" value={row.lastSaleDate ? formatDayLabel(row.lastSaleDate) : 'Sin ventas'} helper={row.daysSinceLastSale !== null ? `Hace ${row.daysSinceLastSale} días` : undefined} icon={CalendarClock} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Venta diaria" description={period.label}>
          {series.some((point) => point.sales > 0) ? <SingleSeriesBars points={series} label={`Venta diaria de ${row.name}`} /> : <EmptyState title="Sin ventas en el periodo" description={row.lastSaleDate ? `Su última venta fue el ${formatDayLabel(row.lastSaleDate, { day: 'numeric', month: 'long' })}.` : 'No tiene ventas registradas.'} />}
        </Panel>
        <Panel title="Qué material vende" description="Productos con venta en el periodo">
          {products.length ? (
            <div className="space-y-3">{products.slice(0, 8).map((item) => <ProductBar key={item.product.id} label={item.product.name} value={item.revenue} max={maxProduct} detail={`${formatCurrency(item.revenue, true)}, ${item.units} ${item.product.unit}s`} />)}</div>
          ) : (
            <EmptyState title="Sin ventas en el periodo" description="Cambia el periodo para ver su mezcla de productos." />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Cartera de clientes" description="Venta del periodo y días desde la última compra" padding={false}>
          <ul className="divide-y divide-mc-line-soft">
            {clients.map((client) => (
              <li key={client.clientId} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-mc-ink">{client.name}</span>
                  <span className={`block text-[11px] ${client.daysSincePurchase !== null && client.daysSincePurchase > 30 ? 'font-bold text-mc-danger' : 'text-mc-muted'}`}>
                    {client.daysSincePurchase === null ? 'Sin compras registradas' : `Última compra hace ${client.daysSincePurchase} días`}
                  </span>
                </span>
                <span className="shrink-0 font-bold text-mc-ink tabular">{formatCurrency(client.sales, true)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Cotizaciones abiertas" description="Enviadas o en negociación, de mayor a menor valor" padding={false}>
          {openQuotes.length ? (
            <ul className="divide-y divide-mc-line-soft">
              {openQuotes.map((quote) => (
                <li key={quote.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-mc-ink"><FileText size={14} className="text-mc-muted" aria-hidden="true" />{quote.id}</span>
                    <span className="block truncate text-[11px] text-mc-muted">{clientName.get(quote.clientId)}, {QUOTE_STATUS_LABEL[quote.status]} desde el {formatDayLabel(quote.date)}</span>
                  </span>
                  <span className="shrink-0 font-bold text-mc-ink tabular">{formatCurrency(quote.amount, true)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin cotizaciones abiertas" description="Todas sus cotizaciones del periodo están cerradas." />
          )}
        </Panel>
      </div>
    </div>
  )
}
