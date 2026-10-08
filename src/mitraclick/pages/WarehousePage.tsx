import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, CheckCircle2, Clock, ListChecks, PackageCheck, Truck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, TextInput } from '../components/Controls'
import { EmptyState, KpiCard, PageHeader, Panel } from '../components/Primitives'
import { callFunction } from '../lib/crud'
import { localTodayKey } from '../lib/dates'
import { formatNumber, formatRatio } from '../lib/format'
import { useQuery } from '../lib/useQuery'

interface ByZone {
  zone: string
  locations: number
  occupied: number
  empty: number
  units: number
  fill_rate: number | null
}

interface ByPerson {
  person: string
  movements: number
  units: number
}

interface ByHour {
  hour: number
  entradas: number
  salidas: number
}

interface WarehouseKpis {
  date: string
  is_today: boolean
  start_hour: number
  order_cutoff_hour: number
  fulfillment_cutoff_hour: number
  minutes_to_cutoff: number | null
  past_order_cutoff: boolean
  open_since_start: boolean
  orders_to_pick: number
  orders_promised_today: number
  orders_overdue: number
  orders_without_list: number
  lists_open: number
  units_to_pick: number
  lines_without_stock: number
  receipts_today: number
  purchases_open: number
  purchases_due: number
  units_received_today: number
  shipments_today: number
  delivered_today: number
  shipments_pending: number
  remissions_to_verify: number
  locations: number
  locations_occupied: number
  stock_negative: number
  counts_pending: number
  incidents_open: number
  movements_today: number
  by_person: ByPerson[]
  by_zone: ByZone[]
  by_hour: ByHour[]
}

/** "2 h 15 min", "en 40 min", "hace 1 h 20 min". */
function describeCutoff(minutes: number | null, hour: number): string {
  if (minutes === null) return `El corte de surtido es a las ${hour}:00.`
  const absolute = Math.abs(minutes)
  const hours = Math.floor(absolute / 60)
  const rest = absolute % 60
  const span = hours > 0 ? `${hours} h${rest ? ` ${rest} min` : ''}` : `${rest} min`
  return minutes >= 0
    ? `Quedan ${span} para el corte de surtido de las ${hour}:00.`
    : `El corte de las ${hour}:00 pasó hace ${span}.`
}

function Attention({ items }: { items: { label: string; count: number; to: string; urgent: boolean }[] }) {
  const live = items.filter((item) => item.count > 0)
  if (!live.length) {
    return (
      <div className="flex items-center gap-3 p-5 text-sm text-mc-ink">
        <CheckCircle2 size={20} className="shrink-0 text-mc-success" aria-hidden="true" />
        Nada pendiente en la bodega.
      </div>
    )
  }
  return (
    <ul className="divide-y divide-mc-line-soft">
      {live.map((item) => (
        <li key={item.label}>
          <Link to={item.to} className="flex min-h-12 items-center gap-3 px-5 py-2.5 text-sm hover:bg-mc-surface-2">
            {item.urgent && <AlertTriangle size={16} className="shrink-0 text-mc-danger" aria-label="Urgente" />}
            <span className="min-w-0 flex-1 text-mc-ink">{item.label}</span>
            <strong className={`tabular ${item.urgent ? 'text-mc-danger' : 'text-mc-ink'}`}>{formatNumber(item.count)}</strong>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function WarehousePage() {
  const [params, setParams] = useSearchParams()
  const date = params.get('dia') ?? localTodayKey()
  const query = useQuery(`warehouse|${date}`, () => callFunction<WarehouseKpis>('kpi_warehouse', { p_date: date }))

  const header = (
    <PageHeader
      eyebrow="Bodega"
      title="Operación del día"
      description="Qué falta por surtir antes de que se vaya la moto, qué entró y qué salió. Las horas de corte se ajustan en Pendientes → Umbrales."
      actions={
        <TextInput
          type="date"
          aria-label="Día"
          className="!w-auto"
          value={date}
          max={localTodayKey()}
          onChange={(event) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('dia', event.target.value); return next }, { replace: true })}
          data-testid="warehouse-date"
        />
      }
    />
  )

  if (query.error) return <div className="space-y-5">{header}<p className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft px-4 py-3 text-sm font-semibold text-mc-danger" role="alert">{query.error}</p></div>
  if (!query.data) return <div className="space-y-5">{header}<p className="py-10 text-center text-sm text-mc-muted" role="status">Cargando la operación…</p></div>

  const kpi = query.data
  const late = kpi.minutes_to_cutoff !== null && kpi.minutes_to_cutoff < 0 && kpi.orders_to_pick > 0
  const maxHour = Math.max(1, ...kpi.by_hour.map((row) => row.entradas + row.salidas))

  return (
    <div className={`space-y-5 ${query.loading ? 'opacity-70' : ''}`}>
      {header}

      <section
        className={`rounded-2xl border p-5 shadow-mc-card ${late ? 'border-mc-danger/30 bg-mc-danger-soft' : 'border-mc-line bg-mc-surface'}`}
        data-testid="cutoff"
        aria-live="polite"
      >
        <p className="flex items-center gap-2 text-xs font-semibold text-mc-muted">
          <Clock size={14} aria-hidden="true" />
          {kpi.is_today ? describeCutoff(kpi.minutes_to_cutoff, kpi.fulfillment_cutoff_hour) : `Día cerrado. La bodega abre a las ${kpi.start_hour}:00 y surte hasta las ${kpi.fulfillment_cutoff_hour}:00.`}
        </p>
        <p className="mt-2 text-3xl font-extrabold text-mc-ink lg:text-4xl" data-testid="orders-to-pick">
          {formatNumber(kpi.orders_to_pick)} {kpi.orders_to_pick === 1 ? 'pedido por surtir' : 'pedidos por surtir'}
        </p>
        <p className="mt-1 text-sm leading-6 text-mc-gray-700">
          {formatNumber(kpi.units_to_pick)} unidades en {formatNumber(kpi.lists_open)} {kpi.lists_open === 1 ? 'lista abierta' : 'listas abiertas'}
          {kpi.orders_without_list > 0 && <> · <strong className="text-mc-ink">{formatNumber(kpi.orders_without_list)} sin lista todavía</strong></>}
          {kpi.is_today && kpi.past_order_cutoff && <> · ya pasó el corte de pedidos de las {kpi.order_cutoff_hour}:00</>}
        </p>
        {(kpi.orders_without_list > 0 || kpi.lists_open > 0) && (
          <div className="mt-4"><Link to="/surtido"><Button variant={late ? 'primary' : 'secondary'}><ListChecks size={16} aria-hidden="true" />Ir a surtido</Button></Link></div>
        )}
      </section>

      <section aria-label="Entrada y salida" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Recepciones del día" value={formatNumber(kpi.receipts_today)} helper={`${formatNumber(kpi.units_received_today)} unidades`} icon={ArrowDownToLine} testId="kpi-recepciones" />
        <KpiCard label="Compras por recibir" value={formatNumber(kpi.purchases_open)} helper={kpi.purchases_due > 0 ? `${formatNumber(kpi.purchases_due)} ya debieron llegar` : undefined} icon={PackageCheck} testId="kpi-compras" />
        <KpiCard label="Envíos del día" value={formatNumber(kpi.shipments_today)} helper={`${formatNumber(kpi.delivered_today)} entregados`} icon={ArrowUpFromLine} testId="kpi-envios" />
        <KpiCard label="Movimientos del día" value={formatNumber(kpi.movements_today)} helper="Entradas, salidas, traspasos y ajustes" icon={Boxes} testId="kpi-movimientos" />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Qué requiere atención" description="Cada renglón lleva a los casos." padding={false} testId="warehouse-attention">
          <Attention
            items={[
              { label: 'Existencias en negativo', count: kpi.stock_negative, to: '/inventario?estado=negativo', urgent: true },
              { label: 'Renglones de surtido sin existencia', count: kpi.lines_without_stock, to: '/surtido', urgent: true },
              { label: 'Pedidos atrasados contra su fecha prometida', count: kpi.orders_overdue, to: '/pedidos', urgent: true },
              { label: 'Compras que ya debieron llegar', count: kpi.purchases_due, to: '/compras?estado=enviada', urgent: false },
              { label: 'Diferencias de conteo por resolver', count: kpi.counts_pending, to: '/conteos?estado=pendiente', urgent: false },
              { label: 'Incidencias de bodega abiertas', count: kpi.incidents_open, to: '/inventario', urgent: false },
              { label: 'Remisiones por verificar', count: kpi.remissions_to_verify, to: '/remisiones?estado=entregada', urgent: false },
              { label: 'Envíos pendientes de entregar', count: kpi.shipments_pending, to: '/envios', urgent: false },
            ]}
          />
        </Panel>

        <Panel title="Ocupación por zona" description="Unidades reales del libro de movimientos." className="lg:col-span-2" padding={false} testId="warehouse-zones">
          {kpi.by_zone.length === 0 ? (
            <EmptyState title="Todavía no hay ubicaciones" description="Crea el layout de la bodega en Ubicaciones y etiquetas → Generar ubicaciones." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Ocupación por zona</caption>
                <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Zona</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Ocupadas</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Vacías</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Unidades</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Qué tan llena</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mc-line-soft">
                  {kpi.by_zone.map((zone) => (
                    <tr key={zone.zone} data-testid={`zone-${zone.zone}`}>
                      <th scope="row" className="px-4 py-2.5 font-semibold text-mc-ink">{zone.zone}</th>
                      <td className="px-4 py-2.5 text-right tabular text-mc-gray-700">{formatNumber(zone.occupied)} / {formatNumber(zone.locations)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-mc-gray-700">{formatNumber(zone.empty)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular text-mc-ink">{formatNumber(Number(zone.units))}</td>
                      <td className="px-4 py-2.5">
                        {zone.fill_rate === null ? (
                          <span className="text-xs text-mc-muted">Sin capacidad capturada</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-mc-surface-2" aria-hidden="true">
                              <span className="block h-full rounded-full bg-mc-charcoal" style={{ width: `${Math.min(100, Number(zone.fill_rate) * 100)}%` }} />
                            </span>
                            <span className="tabular text-mc-ink">{formatRatio(Number(zone.fill_rate))}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-mc-line-soft px-4 py-3 text-xs leading-5 text-mc-muted">
                El porcentaje solo aparece donde se capturó la capacidad en unidades de la ubicación. Donde no, se muestran
                las unidades y se dice que falta el dato: no se estima.
              </p>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Ritmo del día" description="Movimientos por hora: a qué ritmo entró y salió la mercancía." testId="warehouse-hours">
          {kpi.by_hour.length === 0 ? (
            <p className="py-6 text-center text-sm text-mc-muted">Sin movimientos registrados este día.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Movimientos por hora</caption>
              <thead className="text-xs text-mc-muted">
                <tr><th scope="col" className="py-1 pr-3 font-semibold">Hora</th><th scope="col" className="py-1 font-semibold">Entradas y salidas</th><th scope="col" className="py-1 pl-3 text-right font-semibold">Total</th></tr>
              </thead>
              <tbody>
                {kpi.by_hour.map((row) => (
                  <tr key={row.hour}>
                    <th scope="row" className="py-1 pr-3 text-xs tabular text-mc-muted">{String(row.hour).padStart(2, '0')}:00</th>
                    <td className="py-1">
                      <span className="flex h-3 items-center gap-0.5" aria-hidden="true">
                        <span className="block h-full rounded-l bg-mc-success" style={{ width: `${(row.entradas / maxHour) * 100}%` }} />
                        <span className="block h-full rounded-r bg-mc-charcoal" style={{ width: `${(row.salidas / maxHour) * 100}%` }} />
                      </span>
                    </td>
                    <td className="py-1 pl-3 text-right tabular text-mc-ink">{formatNumber(row.entradas + row.salidas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 flex gap-4 border-t border-mc-line-soft pt-3 text-xs text-mc-muted">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-mc-success" aria-hidden="true" />Entradas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-mc-charcoal" aria-hidden="true" />Salidas</span>
          </p>
        </Panel>

        <Panel title="Quién movió qué" description="Movimientos del libro por persona, en el día." padding={false} testId="warehouse-people">
          {kpi.by_person.length === 0 ? (
            <EmptyState title="Sin movimientos" description="Cuando alguien registre entradas, salidas o conteos aparecerá aquí." />
          ) : (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Productividad por persona</caption>
              <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
                <tr><th scope="col" className="px-4 py-2.5 font-semibold">Persona</th><th scope="col" className="px-4 py-2.5 text-right font-semibold">Movimientos</th><th scope="col" className="px-4 py-2.5 text-right font-semibold">Unidades</th></tr>
              </thead>
              <tbody className="divide-y divide-mc-line-soft">
                {kpi.by_person.map((person) => (
                  <tr key={person.person}>
                    <th scope="row" className="px-4 py-2.5 font-semibold text-mc-ink">{person.person}</th>
                    <td className="px-4 py-2.5 text-right tabular text-mc-gray-700">{formatNumber(person.movements)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-mc-gray-700">{formatNumber(Number(person.units))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel testId="warehouse-shortcuts">
        <div className="flex flex-wrap gap-2">
          <Link to="/surtido"><Button variant="outline"><ListChecks size={16} aria-hidden="true" />Surtido</Button></Link>
          <Link to="/inventario"><Button variant="outline"><Boxes size={16} aria-hidden="true" />Inventario</Button></Link>
          <Link to="/inventario/carga-inicial"><Button variant="outline"><ArrowDownToLine size={16} aria-hidden="true" />Carga inicial</Button></Link>
          <Link to="/conteos"><Button variant="outline"><PackageCheck size={16} aria-hidden="true" />Conteos</Button></Link>
          <Link to="/envios"><Button variant="outline"><Truck size={16} aria-hidden="true" />Envíos</Button></Link>
        </div>
      </Panel>
    </div>
  )
}
