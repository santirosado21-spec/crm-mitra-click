import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, MapPin, Plus, Truck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { Button, Checkbox, Field, Select, TextInput } from '../components/Controls'
import { ActionDrawer, Notice } from '../components/DocumentParts'
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge } from '../components/Primitives'
import { callFunction, selectRows } from '../lib/crud'
import { formatDate, formatNumber } from '../lib/format'
import { useChoices } from '../lib/useChoices'
import { useQuery } from '../lib/useQuery'

interface ListRow {
  id: string
  folio: string
  status: string
  assigned_name: string | null
  orders: string | null
  lines: number
  confirmed: number
  missing: number
  units_requested: number
  units_picked: number
  created_at: string
  completed_at: string | null
}

interface PickLine {
  id: string
  pick_order: number
  quantity_requested: number
  quantity_picked: number | null
  status: string
  notes: string | null
  location: { code: string; zone: string } | null
  product: { sku: string; name: string } | null
  order_line: { order_id: string } | null
}

interface OpenOrder {
  id: string
  folio: string | null
  shopify_order_name: string | null
  status: string
  promised_on: string | null
  customer: { name: string } | null
}

const STATUS_LABEL: Record<string, string> = { pendiente: 'Pendiente', en_proceso: 'En proceso', surtida: 'Surtida', cancelada: 'Cancelada' }
const LINE_LABEL: Record<string, string> = { pendiente: 'Pendiente', surtido: 'Surtido', parcial: 'Parcial', sin_existencia: 'Sin existencia' }
const PICK_ROLES = ['direccion', 'admin', 'almacen', 'logistica'] as const

const LIST_SELECT = 'id,folio,status,assigned_name,orders,lines,confirmed,missing,units_requested,units_picked,created_at,completed_at'
const LINE_SELECT = 'id,pick_order,quantity_requested,quantity_picked,status,notes,location:locations(code,zone),product:products(sku,name),order_line:sales_order_lines(order_id)'

/** Arma una lista con los pedidos confirmados que estén esperando surtido. */
function NewListDrawer({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const people = useChoices('app_users', 'display_name')
  const [selected, setSelected] = useState<string[]>([])
  const [assigned, setAssigned] = useState('')
  const [notes, setNotes] = useState('')

  const orders = useQuery('pickable-orders', async () => {
    const rows = await selectRows<OpenOrder>('sales_orders', 'id,folio,shopify_order_name,status,promised_on,customer:customers(name)', {
      orderBy: { column: 'promised_on' },
      limit: 200,
    })
    // Solo lo confirmado y sin lista abierta; la base vuelve a validarlo al crear.
    const open = await selectRows<{ sales_order_id: string }>('pick_list_orders', 'sales_order_id,pick_lists!inner(status)', {
      filters: { 'pick_lists.status': undefined },
      limit: 500,
    }).catch(() => [])
    const busy = new Set(open.map((row) => row.sales_order_id))
    return rows.filter((row) => ['confirmado', 'en_compra', 'en_surtido'].includes(row.status) && !busy.has(row.id))
  })

  const submit = async () => {
    if (!selected.length) throw new Error('Elige al menos un pedido.')
    onDone(await callFunction<string>('create_pick_list', { p_order_ids: selected, p_assigned_to: assigned || null, p_notes: notes || null }))
  }

  const rows = orders.data ?? []
  return (
    <ActionDrawer
      title="Nueva lista de surtido"
      subtitle="Varios pedidos en una sola vuelta: el recorrido se arma por pasillo, no por pedido."
      submitLabel="Armar lista"
      onClose={onClose}
      onSubmit={submit}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-mc-muted" role="status">{orders.loading ? 'Buscando pedidos…' : 'No hay pedidos confirmados esperando surtido.'}</p>
      ) : (
        <fieldset className="space-y-1">
          <legend className="mb-2 text-xs font-semibold text-mc-muted">Pedidos por surtir</legend>
          {rows.map((order) => (
            <div key={order.id} className="rounded-xl px-1 hover:bg-mc-surface-2">
              <Checkbox
                label={`${order.folio ?? order.shopify_order_name ?? 'Sin folio'} · ${order.customer?.name ?? 'Sin cliente'}${order.promised_on ? ` · prometido ${formatDate(order.promised_on)}` : ''}`}
                checked={selected.includes(order.id)}
                onChange={(event) => setSelected((previous) => (event.target.checked ? [...previous, order.id] : previous.filter((id) => id !== order.id)))}
              />
            </div>
          ))}
        </fieldset>
      )}
      <Field id="pick-assigned" label="Quién va a surtir" hint="Opcional; se puede asignar después.">
        <Select id="pick-assigned" value={assigned} onChange={(event) => setAssigned(event.target.value)}>
          <option value="">Sin asignar</option>
          {people.map((person) => <option key={person.value} value={person.value}>{person.label}</option>)}
        </Select>
      </Field>
      <Field id="pick-notes" label="Notas">
        <TextInput id="pick-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </ActionDrawer>
  )
}

/** Recorrido: una ubicación a la vez, pensado para el teléfono con una mano. */
function WalkView({ listId, onBack }: { listId: string; onBack: () => void }) {
  const { can } = useSession()
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [version, setVersion] = useState(0)
  const canPick = can([...PICK_ROLES])

  const list = useQuery(`pick-list|${listId}|${version}`, async () => {
    const [head] = await selectRows<ListRow>('pick_list_progress', LIST_SELECT, { filters: { id: listId }, limit: 1 })
    const lines = await selectRows<PickLine>('pick_list_lines', LINE_SELECT, { filters: { pick_list_id: listId }, orderBy: { column: 'pick_order' }, limit: 500 })
    return { head, lines }
  })

  const lines = list.data?.lines ?? []
  const head = list.data?.head
  const line = lines[Math.min(index, Math.max(0, lines.length - 1))]
  const done = lines.filter((item) => item.quantity_picked !== null).length

  const act = async (action: () => Promise<unknown>, text: string, advance: boolean) => {
    setBusy(true)
    setNotice(null)
    try {
      await action()
      setNotice({ tone: 'ok', text })
      setVersion((value) => value + 1)
      setTyped('')
      if (advance) setIndex((value) => Math.min(value + 1, lines.length - 1))
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  if (list.error) return <Notice tone="error">{list.error}</Notice>
  if (!head) return <p className="py-10 text-center text-sm text-mc-muted" role="status">Cargando…</p>

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Bodega · Surtido"
        title={head.folio}
        description={`${head.orders ?? 'Sin pedidos'} · ${done} de ${lines.length} renglones confirmados.`}
        actions={
          <>
            <Button variant="outline" onClick={onBack}><ChevronLeft size={16} aria-hidden="true" />Todas las listas</Button>
            {canPick && head.status !== 'surtida' && head.status !== 'cancelada' && done > 0 && (
              <Button onClick={() => { void act(() => callFunction('set_pick_list_status', { p_id: listId, p_status: 'surtida' }), 'Lista cerrada. Ya se puede enviar el pedido.', false) }} disabled={busy} data-testid="close-list">
                <Check size={16} aria-hidden="true" />Cerrar lista
              </Button>
            )}
          </>
        }
      />
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {head.status === 'surtida' && (
        <Notice tone="ok">
          Lista cerrada. El inventario baja al registrar el envío del pedido, no aquí.{' '}
          <Link to="/pedidos" className="underline">Ir a pedidos</Link> para surtir y enviar.
        </Notice>
      )}

      {lines.length === 0 ? (
        <EmptyState title="Lista vacía" description="Esta lista no tiene renglones." />
      ) : (
        <>
          <Panel testId="walk-step">
            <div className="text-center">
              <p className="text-xs font-semibold text-mc-muted">Parada {Math.min(index + 1, lines.length)} de {lines.length}</p>
              <p className="mt-2 flex items-center justify-center gap-2 text-4xl font-extrabold tracking-tight text-mc-ink">
                <MapPin size={28} className="text-mc-yellow-ink" aria-hidden="true" />
                {line.location?.code ?? '—'}
              </p>
              <p className="mt-3 text-lg font-bold text-mc-ink">{line.product?.name ?? '—'}</p>
              <p className="text-sm text-mc-muted">{line.product?.sku}</p>
              <p className="mt-4 text-sm text-mc-muted">Toma</p>
              <p className="text-5xl font-extrabold tabular text-mc-ink" data-testid="walk-quantity">{formatNumber(Number(line.quantity_requested))}</p>
              {line.status === 'sin_existencia' && line.quantity_picked === null && (
                <p className="mt-3 rounded-xl bg-mc-warning-soft px-3 py-2 text-sm text-mc-ink">No hay existencia registrada para este renglón. Confírmalo en cero si de verdad no está.</p>
              )}
              {line.quantity_picked !== null && (
                <p className="mt-3 text-sm font-semibold text-mc-success">Ya confirmado: {formatNumber(Number(line.quantity_picked))}</p>
              )}
            </div>

            {canPick && head.status !== 'surtida' && head.status !== 'cancelada' && (
              <div className="mx-auto mt-6 max-w-sm space-y-3">
                <Button className="w-full !py-3 !text-base" disabled={busy} onClick={() => { void act(() => callFunction('confirm_pick', { p_line_id: line.id, p_quantity: Number(line.quantity_requested) }), 'Renglón completo.', true) }} data-testid="pick-full">
                  <Check size={18} aria-hidden="true" />Tomé las {formatNumber(Number(line.quantity_requested))}
                </Button>
                <div className="flex gap-2">
                  <TextInput inputMode="decimal" aria-label="Cantidad distinta" placeholder="Otra cantidad" value={typed} onChange={(event) => setTyped(event.target.value)} disabled={busy} />
                  <Button variant="outline" disabled={busy || typed.trim() === ''} onClick={() => { void act(() => callFunction('confirm_pick', { p_line_id: line.id, p_quantity: Number(typed.replace(/[,\s]/g, '')) }), 'Cantidad registrada.', true) }}>Confirmar</Button>
                </div>
                <Button variant="outline" className="w-full" disabled={busy} onClick={() => { void act(() => callFunction('confirm_pick', { p_line_id: line.id, p_quantity: 0, p_notes: 'No estaba en la ubicación' }), 'Marcado como no encontrado.', true) }}>No está</Button>
              </div>
            )}

            <nav className="mt-6 flex items-center justify-between gap-3 border-t border-mc-line-soft pt-4" aria-label="Recorrido">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}><ChevronLeft size={15} aria-hidden="true" />Anterior</Button>
              <Button variant="outline" disabled={index >= lines.length - 1} onClick={() => setIndex((value) => value + 1)}>Siguiente<ChevronRight size={15} aria-hidden="true" /></Button>
            </nav>
          </Panel>

          <Panel title="Todo el recorrido" padding={false} testId="walk-all">
            <ol className="divide-y divide-mc-line-soft">
              {lines.map((item, position) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setIndex(position)} aria-current={position === index ? 'step' : undefined} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${position === index ? 'bg-mc-yellow-wash' : 'hover:bg-mc-surface-2'}`}>
                    <span className="w-6 shrink-0 text-xs text-mc-muted tabular">{position + 1}</span>
                    <span className="w-24 shrink-0 font-semibold text-mc-ink">{item.location?.code}</span>
                    <span className="min-w-0 flex-1 truncate text-mc-gray-700">{item.product?.name}</span>
                    <span className="shrink-0 tabular text-mc-ink">{item.quantity_picked === null ? formatNumber(Number(item.quantity_requested)) : `${formatNumber(Number(item.quantity_picked))} / ${formatNumber(Number(item.quantity_requested))}`}</span>
                    <StatusBadge status={LINE_LABEL[item.status] ?? item.status} />
                  </button>
                </li>
              ))}
            </ol>
          </Panel>
        </>
      )}
    </div>
  )
}

function ListsView({ onOpen }: { onOpen: (id: string) => void }) {
  const { can } = useSession()
  const [creating, setCreating] = useState(false)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  const query = useQuery(`pick-lists|${version}`, () =>
    selectRows<ListRow>('pick_list_progress', LIST_SELECT, { orderBy: { column: 'created_at', ascending: false }, limit: 100 }),
  )
  const rows = query.data ?? []
  const open = rows.filter((row) => ['pendiente', 'en_proceso'].includes(row.status))
  const pendingUnits = open.reduce((sum, row) => sum + (Number(row.units_requested) - Number(row.units_picked)), 0)
  const missing = open.reduce((sum, row) => sum + Number(row.missing), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Bodega"
        title="Surtido"
        description="Qué recoger, cuánto y de qué ubicación, en orden de recorrido. La lista es un plan: el inventario baja al registrar el envío del pedido, no al surtir."
        actions={can([...PICK_ROLES, 'ventas']) ? <Button onClick={() => setCreating(true)} data-testid="new-pick-list"><Plus size={16} aria-hidden="true" />Nueva lista</Button> : undefined}
      />
      {notice && <Notice tone="ok">{notice}</Notice>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label="Listas abiertas" value={formatNumber(open.length)} icon={Truck} testId="kpi-listas" emphasis />
        <KpiCard label="Unidades por recoger" value={formatNumber(pendingUnits)} icon={MapPin} testId="kpi-unidades" />
        <KpiCard label="Renglones sin existencia" value={formatNumber(missing)} helper={missing > 0 ? 'Revisa el inventario de esos productos' : undefined} icon={Check} testId="kpi-faltantes" />
      </div>

      <Panel padding={false} testId="pick-lists">
        {query.error ? (
          <p className="p-5 text-sm text-mc-danger" role="alert">{query.error}</p>
        ) : rows.length === 0 ? (
          <EmptyState title={query.loading ? 'Cargando…' : 'Todavía no hay listas de surtido'} description="Arma una con los pedidos confirmados que estén esperando." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Listas de surtido</caption>
              <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Lista</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Pedidos</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Avance</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Unidades</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Surte</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Creada</th>
                  <th scope="col" className="px-4 py-2.5"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mc-line-soft">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-mc-surface-2/60" data-testid={`list-${row.folio}`}>
                    <td className="px-4 py-2.5 font-semibold text-mc-ink">{row.folio}</td>
                    <td className="px-4 py-2.5 text-mc-gray-700">{row.orders ?? '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={STATUS_LABEL[row.status] ?? row.status} /></td>
                    <td className="px-4 py-2.5 text-right tabular">{row.confirmed} / {row.lines}{Number(row.missing) > 0 && <span className="ml-1 text-mc-danger">({row.missing} sin existencia)</span>}</td>
                    <td className="px-4 py-2.5 text-right tabular">{formatNumber(Number(row.units_picked))} / {formatNumber(Number(row.units_requested))}</td>
                    <td className="px-4 py-2.5 text-mc-gray-700">{row.assigned_name ?? 'Sin asignar'}</td>
                    <td className="px-4 py-2.5 text-mc-muted">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => onOpen(row.id)} aria-label={`Abrir la lista ${row.folio}`}>Abrir</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {creating && (
        <NewListDrawer
          onClose={() => setCreating(false)}
          onDone={(id) => { setCreating(false); setNotice('Lista armada: el recorrido va ordenado por pasillo.'); setVersion((value) => value + 1); onOpen(id) }}
        />
      )}
    </div>
  )
}

export function PickingPage() {
  const [params, setParams] = useSearchParams()
  const listId = params.get('lista')

  const open = (id: string) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('lista', id); return next })
  const back = () => setParams((previous) => { const next = new URLSearchParams(previous); next.delete('lista'); return next })

  return listId ? <WalkView key={listId} listId={listId} onBack={back} /> : <ListsView onOpen={open} />
}
