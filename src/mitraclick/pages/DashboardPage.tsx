import { AlertTriangle, Banknote, CheckCircle2, FileSignature, Percent, Receipt, ShoppingCart, Target, Wallet } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Select } from '../components/Controls'
import { EmptyState, KpiCard, PageHeader, Panel } from '../components/Primitives'
import { callFunction } from '../lib/crud'
import { formatDayLabel, localTodayKey } from '../lib/dates'
import { formatCurrency, formatNumber, formatRatio } from '../lib/format'
import { attentionItems, changePct, marginNote, type CommercialKpis, type OperationsKpis } from '../lib/kpis'
import { PERIOD_OPTIONS, isPeriodKey, resolvePeriod, type PeriodKey } from '../lib/period'
import { useQuery } from '../lib/useQuery'

interface FamilyRow { family_id: string | null; family: string; sales: number; units: number; margin: number | null; products: number }
interface ProductRow { product_id: string; sku: string; product: string; family: string | null; sales: number; units: number; orders: number; stock: number }
interface RepRow { rep_id: string; rep: string; sales: number; orders: number; families: number; quotes_issued: number; quotes_won: number; quote_conversion: number | null; pending_follow_ups: number }
interface DayRow { day: string; sales: number; orders: number }

// Mismos valores que los tokens de index.css; Recharts necesita hex literales.
const CHART = { bar: 'var(--color-mc-charcoal)', grid: 'var(--color-mc-line-soft)', axis: 'var(--color-mc-gray-400)' }

const th = 'px-4 py-2.5 font-semibold'
const td = 'px-4 py-2.5'

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const periodKey: PeriodKey = isPeriodKey(params.get('periodo')) ? (params.get('periodo') as PeriodKey) : 'mes'
  const familyId = params.get('familia') ?? ''
  const period = resolvePeriod(periodKey, localTodayKey())
  const range = { p_start: period.start, p_end: period.end }

  const setParam = (key: string, value: string) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  const query = useQuery(`dashboard|${period.start}|${period.end}`, async () => {
    const [commercial, previous, operations, days, families, reps] = await Promise.all([
      callFunction<CommercialKpis>('kpi_commercial', range),
      callFunction<CommercialKpis>('kpi_commercial', { p_start: period.previousStart, p_end: period.previousEnd }),
      callFunction<OperationsKpis>('kpi_operations', range),
      callFunction<DayRow[]>('kpi_sales_by_day', range),
      callFunction<FamilyRow[]>('kpi_by_family', range),
      callFunction<RepRow[]>('kpi_by_rep', range),
    ])
    return { commercial, previous, operations, days, families, reps }
  })
  const products = useQuery(`dashboard-products|${period.start}|${period.end}|${familyId}`, () => callFunction<ProductRow[]>('kpi_by_product', { ...range, p_family_id: familyId || null }))

  const header = (
    <PageHeader
      eyebrow="Dirección"
      title="Dashboard ejecutivo"
      description={`${period.label}. Comparaciones ${period.comparisonLabel}. Ventas antes de IVA y envío, de pedidos no cancelados.`}
      actions={
        <Select aria-label="Periodo" className="!w-auto" value={periodKey} onChange={(event) => setParam('periodo', event.target.value === 'mes' ? '' : event.target.value)} data-testid="period-select">
          {PERIOD_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </Select>
      }
    />
  )

  if (query.error) return <div className="space-y-5">{header}<p className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft px-4 py-3 text-sm font-semibold text-mc-danger" role="alert">{query.error}</p></div>
  if (!query.data) return <div className="space-y-5">{header}<p className="py-10 text-center text-sm text-mc-muted" role="status">Calculando indicadores…</p></div>

  const { commercial: now, previous, operations, days, families, reps } = query.data
  const attention = attentionItems(operations)
  const note = marginNote(now.margin_pct, Number(now.margin_coverage))
  const productRows = products.data ?? []
  const moving = productRows.filter((row) => Number(row.units) > 0)
  const top = moving.slice(0, 8)
  const idle = productRows.filter((row) => Number(row.units) === 0)
  const family = families.find((row) => row.family_id === familyId)
  const maxFamily = Math.max(1, ...families.map((row) => Number(row.sales)))
  const chart = days.map((row) => ({ ...row, sales: Number(row.sales), label: formatDayLabel(row.day) }))

  return (
    <div className={`space-y-5 ${query.loading ? 'opacity-70' : ''}`}>
      {header}

      <section aria-label="Qué está pasando" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Ventas" value={formatCurrency(Number(now.sales), true)} delta={changePct(Number(now.sales), Number(previous.sales))} helper={`${formatNumber(now.orders)} pedidos`} icon={ShoppingCart} testId="kpi-ventas" emphasis link={{ to: '/pedidos', label: 'Ver pedidos' }} />
        <KpiCard label="Facturación" value={formatCurrency(Number(now.invoiced), true)} delta={changePct(Number(now.invoiced), Number(previous.invoiced))} icon={Receipt} testId="kpi-facturacion" link={{ to: '/facturas', label: 'Ver facturas' }} />
        <KpiCard label="Cobranza" value={formatCurrency(Number(now.collected), true)} delta={changePct(Number(now.collected), Number(previous.collected))} helper={`Por cobrar ${formatCurrency(Number(now.receivable), true)}`} icon={Wallet} testId="kpi-cobranza" link={{ to: '/pagos', label: 'Ver pagos' }} />
        <KpiCard label="Ticket promedio" value={formatCurrency(Number(now.avg_ticket))} delta={changePct(Number(now.avg_ticket), Number(previous.avg_ticket))} icon={Banknote} testId="kpi-ticket" link={{ to: '/pedidos', label: 'Ver pedidos' }} />
        <KpiCard label="Cotizaciones emitidas" value={formatNumber(now.quotes_issued)} delta={changePct(now.quotes_issued, previous.quotes_issued)} helper={`${formatNumber(now.quotes_won)} ganadas`} icon={FileSignature} testId="kpi-cotizaciones" link={{ to: '/cotizaciones', label: 'Ver cotizaciones' }} />
        <KpiCard label="Conversión a pedido" value={now.quote_conversion === null ? '—' : formatRatio(Number(now.quote_conversion))} helper={now.quote_conversion === null ? 'Sin cotizaciones cerradas en el periodo' : 'De las cotizaciones cerradas'} icon={Target} testId="kpi-conversion" link={{ to: '/cotizaciones', label: 'Ver cotizaciones' }} />
        <KpiCard label="Pipeline abierto" value={formatCurrency(Number(now.pipeline_value), true)} helper={`${formatNumber(now.pipeline_count)} cotizaciones por cerrar, hoy`} icon={FileSignature} testId="kpi-pipeline" link={{ to: '/cotizaciones', label: 'Ver cotizaciones' }} />
        <KpiCard label="Margen" value={now.margin_pct === null ? '—' : formatRatio(Number(now.margin_pct), 1)} helper={note ?? formatCurrency(Number(now.margin), true)} icon={Percent} testId="kpi-margen" link={{ to: '/pedidos', label: 'Ver pedidos' }} />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Qué requiere atención" description="Foto de hoy. Cada renglón lleva a los casos." padding={false} testId="attention">
          {attention.length === 0 ? (
            <div className="flex items-center gap-3 p-5 text-sm text-mc-ink"><CheckCircle2 size={20} className="shrink-0 text-mc-success" aria-hidden="true" />Nada pendiente de intervención.</div>
          ) : (
            <ul className="divide-y divide-mc-line-soft">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="flex min-h-12 items-center gap-3 px-5 py-2.5 text-sm hover:bg-mc-surface-2">
                    {item.urgent && <AlertTriangle size={16} className="shrink-0 text-mc-danger" aria-label="Urgente" />}
                    <span className="min-w-0 flex-1 text-mc-ink">{item.label}</span>
                    <strong className={`tabular ${item.urgent ? 'text-mc-danger' : 'text-mc-ink'}`}>{formatNumber(item.count)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-2 gap-px border-t border-mc-line-soft bg-mc-line-soft text-sm" data-testid="operations">
            {[
              ['Pedidos en proceso', operations.orders_in_process, '/pedidos'],
              ['Entregas pendientes', operations.shipments_pending, '/envios'],
              ['Compras por recibir', operations.purchases_pending, '/compras'],
              ['Pendientes abiertos', operations.issues_open, '/pendientes?estado=abierto'],
            ].map(([label, value, to]) => (
              <Link key={String(label)} to={String(to)} className="bg-mc-surface px-5 py-3 hover:bg-mc-surface-2">
                <dt className="text-xs text-mc-muted">{label}</dt>
                <dd className="text-lg font-extrabold tabular text-mc-ink">{formatNumber(Number(value))}</dd>
              </Link>
            ))}
          </dl>
        </Panel>

        <Panel title="Ventas por día" description={`Shopify ${formatCurrency(Number(now.sales_shopify), true)} · Venta directa ${formatCurrency(Number(now.sales_direct), true)}`} className="lg:col-span-2" testId="sales-by-day">
          {Number(now.sales) === 0 ? <EmptyState title="Sin ventas en el periodo" description="Cuando haya pedidos aparecerán aquí por día." /> : (
            <>
              <div className="h-56" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(value: number) => formatCurrency(value, true)} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Ventas']} cursor={{ fill: CHART.grid }} />
                    <Bar dataKey="sales" fill={CHART.bar} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="sr-only">
                <caption>Ventas por día</caption>
                <thead><tr><th scope="col">Día</th><th scope="col">Ventas</th><th scope="col">Pedidos</th></tr></thead>
                <tbody>{chart.map((row) => <tr key={row.day}><th scope="row">{row.label}</th><td>{formatCurrency(row.sales)}</td><td>{row.orders}</td></tr>)}</tbody>
              </table>
            </>
          )}
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-mc-line-soft pt-4 text-sm">
            {[
              ['Pedido → entrega', operations.days_order_to_delivery],
              ['Compra → recepción', operations.days_purchase_to_receipt],
              ['Factura → pago', operations.days_invoice_to_payment],
            ].map(([label, value]) => (
              <div key={String(label)}><dt className="text-xs text-mc-muted">{label}</dt><dd className="font-bold tabular text-mc-ink">{value === null ? 'Sin datos' : `${String(value)} días`}</dd></div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Ventas por familia" description="Elige una familia para ver sus productos." padding={false} testId="by-family">
          {families.length === 0 ? <EmptyState title="Sin ventas en el periodo" description="No hay renglones vendidos que agrupar." /> : (
            <ul className="divide-y divide-mc-line-soft">
              {families.map((row) => {
                const id = row.family_id ?? ''
                const active = id !== '' && id === familyId
                return (
                  <li key={id || 'sin-familia'}>
                    <button type="button" disabled={!id} aria-pressed={active} onClick={() => setParam('familia', active ? '' : id)} className={`w-full px-5 py-3 text-left ${active ? 'bg-mc-yellow-wash' : 'hover:bg-mc-surface-2'} disabled:cursor-default`}>
                      <span className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-semibold text-mc-ink">{row.family}</span>
                        <span className="shrink-0 font-bold tabular text-mc-ink">{formatCurrency(Number(row.sales))}</span>
                      </span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-mc-surface-2" aria-hidden="true"><span className="block h-full rounded-full bg-mc-charcoal" style={{ width: `${(Number(row.sales) / maxFamily) * 100}%` }} /></span>
                      <span className="mt-1 block text-xs text-mc-muted">{formatNumber(Number(row.units))} unidades · {formatNumber(row.products)} productos{row.margin === null ? '' : ` · Margen ${formatCurrency(Number(row.margin), true)}`}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title={family ? `Productos de ${family.family}` : 'Productos con mayor movimiento'} description={family ? 'Quita la selección de familia para ver todo el catálogo.' : 'Por venta del periodo.'} padding={false} testId="top-products">
          {products.error ? <p className="p-5 text-sm text-mc-danger" role="alert">{products.error}</p> : top.length === 0 ? <EmptyState title="Sin movimiento" description="Ningún producto de esta selección se vendió en el periodo." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Productos con mayor movimiento</caption>
                <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted"><tr><th scope="col" className={th}>Producto</th><th scope="col" className={`${th} text-right`}>Unidades</th><th scope="col" className={`${th} text-right`}>Ventas</th><th scope="col" className={`${th} text-right`}>Existencia</th></tr></thead>
                <tbody className="divide-y divide-mc-line-soft">
                  {top.map((row) => (
                    <tr key={row.product_id}>
                      <td className={td}><Link to={`/productos?q=${encodeURIComponent(row.sku)}`} className="font-semibold text-mc-ink underline decoration-mc-yellow decoration-2 underline-offset-2">{row.product}</Link><span className="block text-xs text-mc-muted">{row.sku}</span></td>
                      <td className={`${td} text-right tabular`}>{formatNumber(Number(row.units))}</td>
                      <td className={`${td} text-right font-semibold tabular text-mc-ink`}>{formatCurrency(Number(row.sales))}</td>
                      <td className={`${td} text-right tabular`}>{formatNumber(Number(row.stock))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {idle.length > 0 && (
            <div className="border-t border-mc-line-soft p-5" data-testid="idle-products">
              <p className="text-sm font-bold text-mc-ink">{formatNumber(idle.length)} productos sin venta en el periodo</p>
              <p className="mt-1 text-xs leading-5 text-mc-muted">Con existencia: {idle.filter((row) => Number(row.stock) > 0).slice(0, 6).map((row) => `${row.product} (${formatNumber(Number(row.stock))})`).join(', ') || 'ninguno'}.</p>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Vendedores" description="Venta, actividad y seguimiento pendiente en el periodo." padding={false} testId="by-rep">
        {reps.length === 0 ? <EmptyState title="Sin vendedores" description="Da de alta vendedores en Ventas → Vendedores." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Desempeño por vendedor</caption>
              <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
                <tr><th scope="col" className={th}>Vendedor</th><th scope="col" className={`${th} text-right`}>Ventas</th><th scope="col" className={`${th} text-right`}>Pedidos</th><th scope="col" className={`${th} text-right`}>Familias</th><th scope="col" className={`${th} text-right`}>Cotizaciones</th><th scope="col" className={`${th} text-right`}>Conversión</th><th scope="col" className={`${th} text-right`}>Sin seguimiento</th></tr>
              </thead>
              <tbody className="divide-y divide-mc-line-soft">
                {reps.map((row) => (
                  <tr key={row.rep_id} data-testid={`rep-${row.rep_id}`}>
                    <td className={td}><Link to={`/cotizaciones?vendedor=${row.rep_id}`} className="font-semibold text-mc-ink underline decoration-mc-yellow decoration-2 underline-offset-2">{row.rep}</Link></td>
                    <td className={`${td} text-right font-semibold tabular text-mc-ink`}>{formatCurrency(Number(row.sales))}</td>
                    <td className={`${td} text-right tabular`}>{formatNumber(row.orders)}</td>
                    <td className={`${td} text-right tabular`}>{formatNumber(row.families)}</td>
                    <td className={`${td} text-right tabular`}>{formatNumber(row.quotes_issued)}</td>
                    <td className={`${td} text-right tabular`}>{row.quote_conversion === null ? '—' : formatRatio(Number(row.quote_conversion))}</td>
                    <td className={`${td} text-right tabular ${row.pending_follow_ups > 0 ? 'font-bold text-mc-danger' : ''}`}>{formatNumber(row.pending_follow_ups)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
