import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { Button, Field, Select, TextArea, TextInput } from '../components/Controls'
import { ActionDrawer, DocumentHeader, LineEditor, LinesTable, Notice, ReasonField, TotalsBox } from '../components/DocumentParts'
import { Panel } from '../components/Primitives'
import { callFunction, selectRows } from '../lib/crud'
import { ACTION_LABEL, documentTotals, emptyLine, nextStatuses, pendingQuantity, statusLabel, toLinePayload, validateLines, type DraftLine } from '../lib/documents'
import { formatDate, formatMoney, formatNumber } from '../lib/format'
import { useChoices, useProductOptions } from '../lib/useChoices'
import { useQuery } from '../lib/useQuery'

interface PurchaseLine {
  id: string
  line_number: number
  product_id: string
  quantity: number
  unit_cost: number
  amount: number
  quantity_received: number
  product: { name: string; sku: string } | null
}

interface PurchaseRow {
  id: string
  folio: string | null
  status: string
  supplier_id: string
  sales_order_id: string | null
  ordered_on: string
  expected_on: string | null
  subtotal: number
  tax: number
  total: number
  notes: string | null
  order: { id: string; folio: string | null } | null
  lines: PurchaseLine[]
  receipts: { id: string; folio: string | null; received_on: string }[]
}

interface SourceOrder {
  id: string
  folio: string | null
  lines: { product_id: string | null; description: string; quantity: number; quantity_fulfilled: number; unit_cost: number | null }[]
}

const SELECT =
  'id,folio,status,supplier_id,sales_order_id,ordered_on,expected_on,subtotal,tax,total,notes,order:sales_orders(id,folio),' +
  'lines:purchase_order_lines(id,line_number,product_id,quantity,unit_cost,amount,quantity_received,product:products(name,sku)),receipts(id,folio,received_on)'

function ReceiveDrawer({ purchase, onClose, onSaved }: { purchase: PurchaseRow; onClose: () => void; onSaved: () => void }) {
  const locations = useChoices('locations', 'code')
  const pending = purchase.lines.filter((line) => pendingQuantity(Number(line.quantity), Number(line.quantity_received)) > 0)
  const [rows, setRows] = useState(() => Object.fromEntries(pending.map((line) => [line.id, { quantity: String(pendingQuantity(Number(line.quantity), Number(line.quantity_received))), locationId: '' }])))
  const [notes, setNotes] = useState('')
  const set = (id: string, changes: Partial<{ quantity: string; locationId: string }>) => setRows((previous) => ({ ...previous, [id]: { ...previous[id], ...changes } }))

  const submit = async () => {
    const lines = pending
      .map((line) => ({ purchase_order_line_id: line.id, location_id: rows[line.id].locationId, quantity: Number(rows[line.id].quantity) }))
      .filter((line) => line.quantity > 0)
    if (!lines.length) throw new Error('Indica al menos una cantidad recibida.')
    if (lines.some((line) => !Number.isFinite(line.quantity))) throw new Error('Las cantidades deben ser números.')
    if (lines.some((line) => !line.location_id)) throw new Error('Elige en qué ubicación entra cada renglón.')
    await callFunction('receive_purchase', { p_purchase_id: purchase.id, p_lines: lines, p_notes: notes })
    onSaved()
  }

  return (
    <ActionDrawer title="Registrar recepción" subtitle={`${purchase.folio ?? ''} · Al guardar entra a inventario en la ubicación elegida.`} submitLabel="Registrar recepción" onClose={onClose} onSubmit={submit}>
      {pending.map((line) => (
        <fieldset key={line.id} className="rounded-xl border border-mc-line-soft bg-mc-surface-2/50 p-3">
          <legend className="px-1 text-xs font-semibold text-mc-muted">{line.product?.name} · pendiente {formatNumber(pendingQuantity(Number(line.quantity), Number(line.quantity_received)))}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`rec-qty-${line.id}`} label="Cantidad recibida" hint="Deja 0 si este renglón no llegó.">
              <TextInput id={`rec-qty-${line.id}`} inputMode="decimal" value={rows[line.id].quantity} onChange={(event) => set(line.id, { quantity: event.target.value })} />
            </Field>
            <Field id={`rec-loc-${line.id}`} label="Entra a la ubicación" required>
              <Select id={`rec-loc-${line.id}`} value={rows[line.id].locationId} onChange={(event) => set(line.id, { locationId: event.target.value })}>
                <option value="">Selecciona…</option>
                {locations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
            </Field>
          </div>
        </fieldset>
      ))}
      <ReasonField id="rec-notes" label="Notas" required={false} value={notes} onChange={setNotes} hint="Si llegó de más o dañado, repórtalo además como incidencia." />
    </ActionDrawer>
  )
}

function PurchaseForm({ purchase, source, onChanged }: { purchase: PurchaseRow | null; source: SourceOrder | null; onChanged: () => void }) {
  const { can } = useSession()
  const navigate = useNavigate()
  const suppliers = useChoices('suppliers', 'name')
  const products = useProductOptions()
  const [supplierId, setSupplierId] = useState(purchase?.supplier_id ?? '')
  const [expectedOn, setExpectedOn] = useState(purchase?.expected_on ?? '')
  const [notes, setNotes] = useState(purchase?.notes ?? '')
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (purchase?.lines.length) return [...purchase.lines].sort((a, b) => a.line_number - b.line_number).map((line) => ({ productId: line.product_id, description: line.product?.name ?? '', quantity: String(line.quantity), unitPrice: String(line.unit_cost), discountPct: '0' }))
    // Desde un pedido: se propone lo que falta por surtir de cada producto, al último costo conocido.
    const fromOrder = (source?.lines ?? [])
      .filter((line) => line.product_id && pendingQuantity(Number(line.quantity), Number(line.quantity_fulfilled)) > 0)
      .map((line) => ({ productId: String(line.product_id), description: line.description, quantity: String(pendingQuantity(Number(line.quantity), Number(line.quantity_fulfilled))), unitPrice: line.unit_cost === null ? '' : String(line.unit_cost), discountPct: '0' }))
    return fromOrder.length ? fromOrder : [emptyLine()]
  })
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [receiving, setReceiving] = useState(false)

  const status = purchase?.status ?? 'borrador'
  const buyer = can(['direccion', 'admin', 'compras'])
  const editable = buyer && status === 'borrador'
  const order = purchase?.order ?? (source ? { id: source.id, folio: source.folio } : null)

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
    const found = [...(supplierId ? [] : ['Elige un proveedor.']), ...validateLines(lines, { requireProduct: true })]
    if (found.length) return setErrors(found)
    void run(async () => {
      const id = await callFunction<string>('save_purchase', { p_id: purchase?.id ?? null, p_header: { supplier_id: supplierId, sales_order_id: purchase?.sales_order_id ?? source?.id ?? '', expected_on: expectedOn, notes }, p_lines: toLinePayload(lines) })
      if (!purchase) navigate(`/compras/${id}`, { replace: true })
      else {
        setMessage('Compra guardada.')
        onChanged()
      }
    })
  }

  return (
    <div className="space-y-5">
      <DocumentHeader
        eyebrow="Compras · Orden de compra"
        title={purchase ? purchase.folio ?? 'Compra' : 'Nueva compra'}
        status={purchase ? status : undefined}
        back="/compras"
        backLabel="Compras"
        actions={
          purchase ? (
            <>
              {buyer && nextStatuses('purchase', status).map((next) => (
                <Button key={next} variant="outline" disabled={busy} data-testid={`status-${next}`} onClick={() => { void run(async () => { await callFunction('set_purchase_status', { p_id: purchase.id, p_status: next }); onChanged() }) }}>{next === 'enviada' ? 'Enviar al proveedor' : ACTION_LABEL[next] ?? statusLabel(next)}</Button>
              ))}
              {can(['direccion', 'admin', 'compras', 'almacen']) && ['enviada', 'parcial'].includes(status) && <Button variant="secondary" disabled={busy} onClick={() => setReceiving(true)} data-testid="receive-purchase">Registrar recepción</Button>}
            </>
          ) : undefined
        }
      />

      {errors.length > 0 && <Notice tone="error">{errors.join(' ')}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}
      {order && <p className="text-sm text-mc-muted">Ligada al pedido <Link to={`/pedidos/${order.id}`} className="font-semibold text-mc-ink underline">{order.folio ?? 'ver pedido'}</Link>.</p>}

      <Panel title="Datos generales" description={purchase ? `Del ${formatDate(purchase.ordered_on)}` : undefined}>
        <fieldset disabled={!editable || busy} className="grid gap-4 md:grid-cols-2">
          <Field id="po-supplier" label="Proveedor" required>
            <Select id="po-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">Selecciona…</option>
              {suppliers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </Field>
          <Field id="po-expected" label="Llegada esperada"><TextInput id="po-expected" type="date" value={expectedOn} onChange={(event) => setExpectedOn(event.target.value)} /></Field>
          <div className="md:col-span-2"><Field id="po-notes" label="Notas"><TextArea id="po-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div>
        </fieldset>
      </Panel>

      <Panel title="Renglones" description="Costos antes de IVA." padding={editable}>
        {editable ? (
          <>
            <LineEditor lines={lines} products={products} onChange={setLines} mode="compra" disabled={busy} />
            <div className="mt-5 border-t border-mc-line-soft pt-4"><TotalsBox totals={documentTotals(lines)} /></div>
            <div className="mt-5 flex justify-end"><Button onClick={save} disabled={busy} data-testid="save-document">{busy ? 'Guardando…' : purchase ? 'Guardar cambios' : 'Crear compra'}</Button></div>
          </>
        ) : purchase && (
          <>
            <LinesTable
              caption="Renglones de la compra"
              columns={[{ key: 'product', label: 'Producto' }, { key: 'quantity', label: 'Pedido', align: 'right' }, { key: 'received', label: 'Recibido', align: 'right' }, { key: 'cost', label: 'Costo', align: 'right' }, { key: 'amount', label: 'Importe', align: 'right' }]}
              rows={[...purchase.lines].sort((a, b) => a.line_number - b.line_number).map((line) => ({ product: `${line.product?.name ?? '—'} · ${line.product?.sku ?? ''}`, quantity: formatNumber(Number(line.quantity)), received: formatNumber(Number(line.quantity_received)), cost: formatMoney(Number(line.unit_cost)), amount: formatMoney(Number(line.amount)) }))}
            />
            <div className="border-t border-mc-line-soft p-5"><TotalsBox totals={{ subtotal: Number(purchase.subtotal), tax: Number(purchase.tax), shipping: 0, total: Number(purchase.total) }} /></div>
          </>
        )}
      </Panel>

      {purchase && purchase.receipts.length > 0 && (
        <Panel title="Recepciones" padding={false} testId="purchase-receipts">
          <ul className="divide-y divide-mc-line-soft text-sm">
            {purchase.receipts.map((receipt) => <li key={receipt.id} className="flex justify-between gap-3 px-5 py-3"><span className="font-semibold text-mc-ink">{receipt.folio}</span><span className="text-mc-muted">{formatDate(receipt.received_on)}</span></li>)}
          </ul>
        </Panel>
      )}

      {receiving && purchase && <ReceiveDrawer purchase={purchase} onClose={() => setReceiving(false)} onSaved={() => { setReceiving(false); setMessage('Recepción registrada: la mercancía entró a inventario.'); onChanged() }} />}
    </div>
  )
}

export function PurchasePage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const isNew = id === 'nueva'
  const orderId = isNew ? params.get('pedido') ?? '' : ''
  const query = useQuery(`purchase|${id}|${orderId}`, async () => {
    if (!isNew) {
      const rows = await selectRows<PurchaseRow>('purchase_orders', SELECT, { filters: { id }, limit: 1 })
      if (!rows[0]) throw new Error('La compra no existe o no tienes acceso.')
      return { purchase: rows[0], source: null }
    }
    if (!orderId) return { purchase: null, source: null }
    const rows = await selectRows<SourceOrder>('sales_orders', 'id,folio,lines:sales_order_lines(product_id,description,quantity,quantity_fulfilled,unit_cost)', { filters: { id: orderId }, limit: 1 })
    return { purchase: null, source: rows[0] ?? null }
  })
  if (query.error) return <Notice tone="error">{query.error}</Notice>
  if (!query.data) return <p className="py-10 text-center text-sm text-mc-muted" role="status">Cargando…</p>
  return <PurchaseForm key={`${id}-${query.data.source?.id ?? ''}`} purchase={query.data.purchase} source={query.data.source} onChanged={query.reload} />
}
