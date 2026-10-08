import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { Button, Checkbox, Field, Select, TextArea, TextInput } from '../components/Controls'
import { ActionDrawer, DocumentHeader, LineEditor, LinesTable, Notice, TotalsBox } from '../components/DocumentParts'
import { EmptyState, Panel, StatusBadge } from '../components/Primitives'
import { callFunction, selectRows } from '../lib/crud'
import { ACTION_LABEL, documentTotals, emptyLine, nextStatuses, pendingQuantity, statusLabel, toLinePayload, validateLines, type DraftLine } from '../lib/documents'
import { formatDate, formatMoney, formatNumber } from '../lib/format'
import { useChoices, useProductOptions } from '../lib/useChoices'
import { useQuery } from '../lib/useQuery'

interface OrderLine {
  id: string
  line_number: number
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  amount: number
  quantity_fulfilled: number
}

interface OrderRow {
  id: string
  folio: string | null
  channel: string
  status: string
  payment_status: string
  customer_id: string | null
  rep_id: string | null
  ordered_on: string
  promised_on: string | null
  subtotal: number
  tax: number
  shipping: number
  total: number
  shopify_order_name: string | null
  shipping_address: string | null
  notes: string | null
  quote: { id: string; folio: string | null } | null
  customer: { name: string } | null
  lines: OrderLine[]
  purchases: { id: string; folio: string | null; status: string; total: number }[]
  shipments: { id: string; folio: string | null; status: string; scheduled_on: string | null; carrier: string | null }[]
  invoices: { id: string; folio: string; series: string | null; status: string; total: number }[]
}

interface TimelineRow {
  occurred_at: string
  kind: string
  title: string
  detail: string | null
}

const SELECT =
  'id,folio,channel,status,payment_status,customer_id,rep_id,ordered_on,promised_on,subtotal,tax,shipping,total,shopify_order_name,shipping_address,notes,' +
  'quote:quotes(id,folio),customer:customers(name),' +
  'lines:sales_order_lines(id,line_number,product_id,description,quantity,unit_price,amount,quantity_fulfilled),' +
  'purchases:purchase_orders(id,folio,status,total),shipments(id,folio,status,scheduled_on,carrier),invoices(id,folio,series,status,total)'

/** Surtir y programar un envío: cuánto sale de cada renglón y de qué ubicación. */
interface ShipmentLine {
  sales_order_line_id: string
  location_id: string
  quantity: number
}

function ShipDrawer({ order, onClose, onSaved }: { order: OrderRow; onClose: () => void; onSaved: () => void }) {
  const locations = useChoices('locations', 'code')
  const pending = order.lines.filter((line) => line.product_id && pendingQuantity(Number(line.quantity), Number(line.quantity_fulfilled)) > 0)
  const [rows, setRows] = useState(() => Object.fromEntries(pending.map((line) => [line.id, { quantity: String(pendingQuantity(Number(line.quantity), Number(line.quantity_fulfilled))), locationId: '' }])))
  const [header, setHeader] = useState({ carrier: '', route: '', driver: '', tracking_number: '', scheduled_on: '' })
  const [fromList, setFromList] = useState<string | null>(null)
  const set = (id: string, changes: Partial<{ quantity: string; locationId: string }>) => setRows((previous) => ({ ...previous, [id]: { ...previous[id], ...changes } }))

  // Si ya se surtió con una lista, la ubicación y la cantidad salen de ahí: no se
  // vuelven a capturar. Es el único punto donde el surtido alimenta al envío.
  const picked = useQuery(`picked|${order.id}`, async () => {
    const lists = await selectRows<{ pick_list_id: string; pick_lists: { folio: string; status: string } | null }>(
      'pick_list_orders', 'pick_list_id,pick_lists(folio,status)', { filters: { sales_order_id: order.id }, limit: 20 })
    const closed = lists.find((row) => row.pick_lists?.status === 'surtida')
    if (!closed) return null
    const lines = await callFunction<ShipmentLine[]>('pick_list_shipment_lines', { p_list_id: closed.pick_list_id, p_order_id: order.id })
    return lines.length ? { folio: closed.pick_lists?.folio ?? '', lines } : null
  })

  const submit = async () => {
    let lines: ShipmentLine[]
    if (fromList && picked.data) {
      lines = picked.data.lines
    } else {
      lines = pending
        .map((line) => ({ sales_order_line_id: line.id, location_id: rows[line.id].locationId, quantity: Number(rows[line.id].quantity) }))
        .filter((line) => line.quantity > 0)
      if (!lines.length) throw new Error('Indica al menos una cantidad a enviar.')
      if (lines.some((line) => !line.location_id)) throw new Error('Elige de qué ubicación sale cada renglón.')
      if (lines.some((line) => !Number.isFinite(line.quantity))) throw new Error('Las cantidades deben ser números.')
    }
    await callFunction('ship_order', { p_order_id: order.id, p_header: header, p_lines: lines })
    onSaved()
  }

  return (
    <ActionDrawer title="Surtir y programar envío" subtitle={`${order.folio ?? ''} · Al guardar se registra la salida de bodega y se crea la remisión.`} submitLabel="Registrar envío" onClose={onClose} onSubmit={submit}>
      {picked.data && (
        <div className="rounded-xl border border-mc-success/30 bg-mc-success-soft p-3" data-testid="ship-from-pick">
          <p className="text-sm font-semibold text-mc-ink">Ya se surtió con la lista {picked.data.folio}</p>
          <p className="mt-0.5 text-xs leading-5 text-mc-gray-700">
            {picked.data.lines.length} {picked.data.lines.length === 1 ? 'renglón' : 'renglones'} con su ubicación y cantidad.
            Usarlos evita volver a capturar y evita diferencias con lo que se recogió.
          </p>
          <div className="mt-2">
            <Checkbox label="Enviar lo que dice la lista de surtido" checked={fromList !== null} onChange={(event) => setFromList(event.target.checked ? picked.data!.folio : null)} />
          </div>
        </div>
      )}
      {fromList ? null : pending.length === 0 ? <p className="text-sm text-mc-muted">No queda nada por surtir en este pedido.</p> : pending.map((line) => (
        <fieldset key={line.id} className="rounded-xl border border-mc-line-soft bg-mc-surface-2/50 p-3">
          <legend className="px-1 text-xs font-semibold text-mc-muted">{line.description} · pendiente {formatNumber(pendingQuantity(Number(line.quantity), Number(line.quantity_fulfilled)))}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`ship-qty-${line.id}`} label="Cantidad a enviar" hint="Deja 0 para no enviar este renglón ahora.">
              <TextInput id={`ship-qty-${line.id}`} inputMode="decimal" value={rows[line.id].quantity} onChange={(event) => set(line.id, { quantity: event.target.value })} />
            </Field>
            <Field id={`ship-loc-${line.id}`} label="Sale de la ubicación" required>
              <Select id={`ship-loc-${line.id}`} value={rows[line.id].locationId} onChange={(event) => set(line.id, { locationId: event.target.value })}>
                <option value="">Selecciona…</option>
                {locations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
            </Field>
          </div>
        </fieldset>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="ship-date" label="Fecha programada"><TextInput id="ship-date" type="date" value={header.scheduled_on} onChange={(event) => setHeader({ ...header, scheduled_on: event.target.value })} /></Field>
        <Field id="ship-carrier" label="Paquetería o transporte"><TextInput id="ship-carrier" value={header.carrier} onChange={(event) => setHeader({ ...header, carrier: event.target.value })} /></Field>
        <Field id="ship-route" label="Ruta"><TextInput id="ship-route" value={header.route} onChange={(event) => setHeader({ ...header, route: event.target.value })} /></Field>
        <Field id="ship-driver" label="Chofer"><TextInput id="ship-driver" value={header.driver} onChange={(event) => setHeader({ ...header, driver: event.target.value })} /></Field>
        <div className="sm:col-span-2"><Field id="ship-tracking" label="Guía o número de rastreo"><TextInput id="ship-tracking" value={header.tracking_number} onChange={(event) => setHeader({ ...header, tracking_number: event.target.value })} /></Field></div>
      </div>
    </ActionDrawer>
  )
}

function InvoiceDrawer({ order, onClose, onSaved }: { order: OrderRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ folio: '', series: '', issued_on: '', due_on: '', cfdi_uuid: '' })
  const submit = async () => {
    if (!form.folio.trim()) throw new Error('Escribe el folio de la factura.')
    await callFunction('register_invoice', { p_order_id: order.id, p_folio: form.folio, p_series: form.series || null, p_issued_on: form.issued_on || null, p_due_on: form.due_on || null, p_cfdi_uuid: form.cfdi_uuid || null })
    onSaved()
  }
  return (
    <ActionDrawer title="Registrar factura" subtitle={`${order.folio ?? ''} · Total ${formatMoney(Number(order.total))}. La factura se emite fuera del sistema; aquí solo se registra.`} submitLabel="Registrar factura" onClose={onClose} onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="inv-series" label="Serie"><TextInput id="inv-series" value={form.series} onChange={(event) => setForm({ ...form, series: event.target.value })} /></Field>
        <Field id="inv-folio" label="Folio" required><TextInput id="inv-folio" value={form.folio} onChange={(event) => setForm({ ...form, folio: event.target.value })} /></Field>
        <Field id="inv-issued" label="Fecha de emisión" hint="Vacío: hoy."><TextInput id="inv-issued" type="date" value={form.issued_on} onChange={(event) => setForm({ ...form, issued_on: event.target.value })} /></Field>
        <Field id="inv-due" label="Vence"><TextInput id="inv-due" type="date" value={form.due_on} onChange={(event) => setForm({ ...form, due_on: event.target.value })} /></Field>
        <div className="sm:col-span-2"><Field id="inv-uuid" label="Folio fiscal (UUID del CFDI)"><TextInput id="inv-uuid" value={form.cfdi_uuid} onChange={(event) => setForm({ ...form, cfdi_uuid: event.target.value })} /></Field></div>
      </div>
    </ActionDrawer>
  )
}

function Timeline({ orderId, version }: { orderId: string; version: number }) {
  const query = useQuery(`timeline|${orderId}|${version}`, () => callFunction<TimelineRow[]>('order_timeline', { p_order_id: orderId }))
  if (query.error) return <p className="text-sm text-mc-danger" role="alert">{query.error}</p>
  const rows = query.data ?? []
  if (!rows.length) return <p className="text-sm text-mc-muted" role="status">{query.loading ? 'Cargando…' : 'Sin eventos.'}</p>
  return (
    <ol className="space-y-3" data-testid="order-timeline">
      {rows.map((event, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-mc-yellow" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mc-ink">{event.title}</p>
            <p className="text-xs text-mc-muted">{formatDate(event.occurred_at, true)}{event.detail ? ` · ${event.detail}` : ''}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function OrderForm({ order, onChanged }: { order: OrderRow | null; onChanged: () => void }) {
  const { can } = useSession()
  const navigate = useNavigate()
  const customers = useChoices('customers', 'name')
  const reps = useChoices('sales_reps', 'name')
  const products = useProductOptions()
  const [customerId, setCustomerId] = useState(order?.customer_id ?? '')
  const [repId, setRepId] = useState(order?.rep_id ?? '')
  const [promisedOn, setPromisedOn] = useState(order?.promised_on ?? '')
  const [shipping, setShipping] = useState(order ? String(order.shipping) : '0')
  const [address, setAddress] = useState(order?.shipping_address ?? '')
  const [notes, setNotes] = useState(order?.notes ?? '')
  const [lines, setLines] = useState<DraftLine[]>(() =>
    order?.lines.length
      ? [...order.lines].sort((a, b) => a.line_number - b.line_number).map((line) => ({ productId: line.product_id ?? '', description: line.description, quantity: String(line.quantity), unitPrice: String(line.unit_price), discountPct: '0' }))
      : [emptyLine()],
  )
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [drawer, setDrawer] = useState<'envio' | 'factura' | null>(null)
  const [version, setVersion] = useState(0)

  const status = order?.status ?? 'nuevo'
  const sales = can(['direccion', 'admin', 'ventas'])
  const editable = sales && status === 'nuevo' && (order?.channel ?? 'directo') === 'directo'
  const refresh = () => {
    setVersion((value) => value + 1)
    onChanged()
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setErrors([])
    setMessage(null)
    try {
      await action()
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)])
    } finally {
      setBusy(false)
    }
  }

  const save = () => {
    const shippingValue = Number(shipping || '0')
    const found = [...(customerId ? [] : ['Elige un cliente.']), ...(Number.isFinite(shippingValue) && shippingValue >= 0 ? [] : ['El envío debe ser un número, cero o más.']), ...validateLines(lines)]
    if (found.length) return setErrors(found)
    void run(async () => {
      const id = await callFunction<string>('save_order', { p_id: order?.id ?? null, p_header: { customer_id: customerId, rep_id: repId, promised_on: promisedOn, shipping: String(shippingValue), shipping_address: address, notes }, p_lines: toLinePayload(lines) })
      if (!order) navigate(`/pedidos/${id}`, { replace: true })
      else {
        setMessage('Pedido guardado.')
        refresh()
      }
    })
  }

  const canShip = order && can(['direccion', 'admin', 'logistica', 'almacen']) && ['confirmado', 'en_compra', 'en_surtido'].includes(status)
  const canBuy = order && can(['direccion', 'admin', 'compras']) && ['confirmado', 'en_compra', 'en_surtido'].includes(status)
  const invoice = order?.invoices.find((item) => item.status !== 'cancelada')
  const canInvoice = order && can(['direccion', 'admin', 'finanzas']) && !invoice && !['nuevo', 'cancelado'].includes(status)
  const title = order ? order.folio ?? order.shopify_order_name ?? 'Pedido' : 'Nuevo pedido'

  return (
    <div className="space-y-5">
      <DocumentHeader
        eyebrow={`Ventas · Pedido${order ? ` · ${order.channel === 'shopify' ? 'Shopify' : 'Venta directa'}` : ''}`}
        title={title}
        status={order ? status : undefined}
        back="/pedidos"
        backLabel="Pedidos"
        actions={
          order ? (
            <>
              {sales && nextStatuses('order', status).map((next) => (
                <Button key={next} variant="outline" disabled={busy} data-testid={`status-${next}`} onClick={() => { void run(async () => { await callFunction('set_order_status', { p_id: order.id, p_status: next }); refresh() }) }}>{ACTION_LABEL[next] ?? statusLabel(next)}</Button>
              ))}
              {canBuy && <Link to={`/compras/nueva?pedido=${order.id}`} className="inline-flex items-center justify-center rounded-xl border border-mc-line bg-mc-surface px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-charcoal">Crear compra</Link>}
              {canShip && <Button variant="secondary" disabled={busy} onClick={() => setDrawer('envio')} data-testid="ship-order">Surtir y enviar</Button>}
              {canInvoice && <Button variant="outline" disabled={busy} onClick={() => setDrawer('factura')} data-testid="invoice-order">Registrar factura</Button>}
            </>
          ) : undefined
        }
      />

      {errors.length > 0 && <Notice tone="error">{errors.join(' ')}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}

      <Panel title="Datos generales" description={order ? `Pedido del ${formatDate(order.ordered_on)} · Pago: ${statusLabel(order.payment_status)}${order.quote ? ` · Viene de la cotización ${order.quote.folio ?? ''}` : ''}` : 'Pedido de venta directa. Los de Shopify llegan solos por el conector.'}>
        <fieldset disabled={!editable || busy} className="grid gap-4 md:grid-cols-4">
          <Field id="order-customer" label="Cliente" required>
            <Select id="order-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Selecciona…</option>
              {customers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </Field>
          <Field id="order-rep" label="Vendedor">
            <Select id="order-rep" value={repId} onChange={(event) => setRepId(event.target.value)}>
              <option value="">Sin asignar</option>
              {reps.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </Field>
          <Field id="order-promised" label="Fecha prometida"><TextInput id="order-promised" type="date" value={promisedOn} onChange={(event) => setPromisedOn(event.target.value)} /></Field>
          <Field id="order-shipping" label="Costo de envío"><TextInput id="order-shipping" inputMode="decimal" value={shipping} onChange={(event) => setShipping(event.target.value)} /></Field>
          <div className="md:col-span-2"><Field id="order-address" label="Domicilio de entrega"><TextArea id="order-address" value={address} onChange={(event) => setAddress(event.target.value)} /></Field></div>
          <div className="md:col-span-2"><Field id="order-notes" label="Notas"><TextArea id="order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div>
        </fieldset>
      </Panel>

      <Panel title="Renglones" description="Precios antes de IVA." padding={editable}>
        {editable ? (
          <>
            <LineEditor lines={lines} products={products} onChange={setLines} disabled={busy} />
            <div className="mt-5 border-t border-mc-line-soft pt-4"><TotalsBox totals={documentTotals(lines, { shipping: Number(shipping || '0') || 0 })} showShipping /></div>
            <div className="mt-5 flex justify-end"><Button onClick={save} disabled={busy} data-testid="save-document">{busy ? 'Guardando…' : order ? 'Guardar cambios' : 'Crear pedido'}</Button></div>
          </>
        ) : order && (
          <>
            <LinesTable
              caption="Renglones del pedido"
              columns={[{ key: 'description', label: 'Descripción' }, { key: 'quantity', label: 'Cantidad', align: 'right' }, { key: 'fulfilled', label: 'Surtido', align: 'right' }, { key: 'price', label: 'Precio', align: 'right' }, { key: 'amount', label: 'Importe', align: 'right' }]}
              rows={[...order.lines].sort((a, b) => a.line_number - b.line_number).map((line) => ({ description: line.description, quantity: formatNumber(Number(line.quantity)), fulfilled: line.product_id ? formatNumber(Number(line.quantity_fulfilled)) : 'No aplica', price: formatMoney(Number(line.unit_price)), amount: formatMoney(Number(line.amount)) }))}
            />
            <div className="border-t border-mc-line-soft p-5"><TotalsBox totals={{ subtotal: Number(order.subtotal), tax: Number(order.tax), shipping: Number(order.shipping), total: Number(order.total) }} showShipping /></div>
          </>
        )}
      </Panel>

      {order && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Documentos ligados" padding={false} testId="order-documents">
            {order.purchases.length + order.shipments.length + order.invoices.length === 0 ? <EmptyState title="Sin documentos todavía" description="Aquí aparecerán las compras, envíos y facturas de este pedido." /> : (
              <ul className="divide-y divide-mc-line-soft text-sm">
                {order.purchases.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3"><Link to={`/compras/${item.id}`} className="font-semibold text-mc-ink underline">Compra {item.folio}</Link><StatusBadge status={statusLabel(item.status)} /></li>)}
                {order.shipments.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="font-semibold text-mc-ink">Envío {item.folio}{item.scheduled_on ? ` · ${formatDate(item.scheduled_on)}` : ''}</span><StatusBadge status={statusLabel(item.status)} /></li>)}
                {order.invoices.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="font-semibold text-mc-ink">Factura {[item.series, item.folio].filter(Boolean).join('-')} · {formatMoney(Number(item.total))}</span><StatusBadge status={statusLabel(item.status)} /></li>)}
              </ul>
            )}
          </Panel>
          <Panel title="Línea de tiempo" description="De la cotización al pago, en orden."><Timeline orderId={order.id} version={version} /></Panel>
        </div>
      )}

      {drawer === 'envio' && order && <ShipDrawer order={order} onClose={() => setDrawer(null)} onSaved={() => { setDrawer(null); setMessage('Envío registrado: salió de bodega y se creó la remisión.'); refresh() }} />}
      {drawer === 'factura' && order && <InvoiceDrawer order={order} onClose={() => setDrawer(null)} onSaved={() => { setDrawer(null); setMessage('Factura registrada.'); refresh() }} />}
    </div>
  )
}

export function OrderPage() {
  const { id = '' } = useParams()
  const isNew = id === 'nuevo'
  const query = useQuery(`order|${id}`, async () => {
    if (isNew) return null
    const rows = await selectRows<OrderRow>('sales_orders', SELECT, { filters: { id }, limit: 1 })
    if (!rows[0]) throw new Error('El pedido no existe o no tienes acceso.')
    return rows[0]
  })
  if (query.error) return <Notice tone="error">{query.error}</Notice>
  if (query.loading && !query.data && !isNew) return <p className="py-10 text-center text-sm text-mc-muted" role="status">Cargando…</p>
  return <OrderForm key={id} order={query.data} onChanged={query.reload} />
}
