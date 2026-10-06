import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { Button, Field, Select, TextArea, TextInput } from '../components/Controls'
import { ActionDrawer, DocumentHeader, LineEditor, Notice, ReasonField, TotalsBox } from '../components/DocumentParts'
import { Panel } from '../components/Primitives'
import { callFunction, selectRows } from '../lib/crud'
import { ACTION_LABEL, documentTotals, emptyLine, nextStatuses, statusLabel, toLinePayload, validateLines, type DraftLine } from '../lib/documents'
import { formatDate } from '../lib/format'
import { useChoices, useProductOptions } from '../lib/useChoices'
import { useQuery } from '../lib/useQuery'

interface QuoteRow {
  id: string
  folio: string | null
  status: string
  customer_id: string
  rep_id: string | null
  valid_until: string | null
  notes: string | null
  lost_reason: string | null
  last_follow_up_at: string | null
  issued_on: string
  lines: { line_number: number; product_id: string | null; description: string; quantity: number; unit_price: number; discount_pct: number }[]
  orders: { id: string; folio: string | null; status: string }[]
}

const EDITABLE = ['borrador', 'enviada', 'negociacion']

function QuoteForm({ quote, onChanged }: { quote: QuoteRow | null; onChanged: () => void }) {
  const { can } = useSession()
  const navigate = useNavigate()
  const customers = useChoices('customers', 'name')
  const reps = useChoices('sales_reps', 'name')
  const products = useProductOptions()
  const [customerId, setCustomerId] = useState(quote?.customer_id ?? '')
  const [repId, setRepId] = useState(quote?.rep_id ?? '')
  const [validUntil, setValidUntil] = useState(quote?.valid_until ?? '')
  const [notes, setNotes] = useState(quote?.notes ?? '')
  const [lines, setLines] = useState<DraftLine[]>(() =>
    quote?.lines.length
      ? [...quote.lines].sort((a, b) => a.line_number - b.line_number).map((line) => ({ productId: line.product_id ?? '', description: line.description, quantity: String(line.quantity), unitPrice: String(line.unit_price), discountPct: String(line.discount_pct) }))
      : [emptyLine()],
  )
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [losing, setLosing] = useState(false)
  const [lostReason, setLostReason] = useState('')

  const status = quote?.status ?? 'borrador'
  const canWrite = can(['direccion', 'admin', 'ventas'])
  const editable = canWrite && EDITABLE.includes(status)
  const order = quote?.orders.find((item) => item.status !== 'cancelado')

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
    const found = [...(customerId ? [] : ['Elige un cliente.']), ...validateLines(lines)]
    if (found.length) return setErrors(found)
    void run(async () => {
      const id = await callFunction<string>('save_quote', { p_id: quote?.id ?? null, p_header: { customer_id: customerId, rep_id: repId, valid_until: validUntil, notes }, p_lines: toLinePayload(lines) })
      if (!quote) navigate(`/cotizaciones/${id}`, { replace: true })
      else {
        setMessage('Cotización guardada.')
        onChanged()
      }
    })
  }

  const setStatus = (next: string, note?: string) =>
    run(async () => {
      await callFunction('set_quote_status', { p_id: quote?.id, p_status: next, p_note: note ?? null })
      onChanged()
    })

  return (
    <div className="space-y-5">
      <DocumentHeader
        eyebrow="Ventas · Cotización"
        title={quote ? quote.folio ?? 'Cotización' : 'Nueva cotización'}
        status={quote ? status : undefined}
        back="/cotizaciones"
        backLabel="Cotizaciones"
        actions={
          quote && canWrite ? (
            <>
              {['enviada', 'negociacion'].includes(status) && <Button variant="outline" disabled={busy} onClick={() => { void run(async () => { await callFunction('log_quote_follow_up', { p_id: quote.id }); setMessage('Seguimiento registrado.'); onChanged() }) }}>Registrar seguimiento</Button>}
              {nextStatuses('quote', status).map((next) => (
                <Button key={next} variant="outline" disabled={busy} onClick={() => (next === 'perdida' ? setLosing(true) : void setStatus(next))} data-testid={`status-${next}`}>{ACTION_LABEL[next] ?? statusLabel(next)}</Button>
              ))}
              {['enviada', 'negociacion'].includes(status) && !order && (
                <Button variant="secondary" disabled={busy} data-testid="convert-to-order" onClick={() => { void run(async () => { const id = await callFunction<string>('convert_quote_to_order', { p_quote_id: quote.id }); navigate(`/pedidos/${id}`) }) }}>Convertir en pedido</Button>
              )}
            </>
          ) : undefined
        }
      />

      {errors.length > 0 && <Notice tone="error">{errors.join(' ')}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}
      {order && <Notice tone="ok">Esta cotización se convirtió en el pedido <Link to={`/pedidos/${order.id}`} className="underline">{order.folio ?? 'ver pedido'}</Link>.</Notice>}
      {quote?.status === 'perdida' && quote.lost_reason && <p className="text-sm text-mc-muted">Motivo de la pérdida: <span className="text-mc-ink">{quote.lost_reason}</span></p>}

      <Panel title="Datos generales" description={quote ? `Emitida el ${formatDate(quote.issued_on)}${quote.last_follow_up_at ? ` · Último seguimiento: ${formatDate(quote.last_follow_up_at, true)}` : ' · Sin seguimiento registrado'}` : undefined}>
        <fieldset disabled={!editable || busy} className="grid gap-4 md:grid-cols-3">
          <Field id="quote-customer" label="Cliente" required>
            <Select id="quote-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Selecciona…</option>
              {customers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </Field>
          <Field id="quote-rep" label="Vendedor">
            <Select id="quote-rep" value={repId} onChange={(event) => setRepId(event.target.value)}>
              <option value="">Sin asignar</option>
              {reps.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </Field>
          <Field id="quote-valid" label="Vigente hasta">
            <TextInput id="quote-valid" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
          </Field>
          <div className="md:col-span-3">
            <Field id="quote-notes" label="Notas">
              <TextArea id="quote-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
          </div>
        </fieldset>
      </Panel>

      <Panel title="Renglones" description="Precios antes de IVA.">
        <LineEditor lines={lines} products={products} onChange={setLines} disabled={!editable || busy} />
        <div className="mt-5 flex flex-col gap-4 border-t border-mc-line-soft pt-4 sm:flex-row sm:items-end">
          <TotalsBox totals={documentTotals(lines)} />
        </div>
        {editable && <div className="mt-5 flex justify-end"><Button onClick={save} disabled={busy} data-testid="save-document">{busy ? 'Guardando…' : quote ? 'Guardar cambios' : 'Crear cotización'}</Button></div>}
      </Panel>

      {losing && quote && (
        <ActionDrawer title="Marcar como perdida" subtitle={quote.folio ?? undefined} submitLabel="Marcar como perdida" onClose={() => setLosing(false)} onSubmit={async () => { await callFunction('set_quote_status', { p_id: quote.id, p_status: 'perdida', p_note: lostReason }); setLosing(false); onChanged() }}>
          <ReasonField id="lost-reason" label="¿Por qué se perdió?" value={lostReason} onChange={setLostReason} hint="Precio, tiempo de entrega, competencia, sin respuesta…" />
        </ActionDrawer>
      )}
    </div>
  )
}

export function QuotePage() {
  const { id = '' } = useParams()
  const isNew = id === 'nueva'
  const query = useQuery(`quote|${id}`, async () => {
    if (isNew) return null
    const rows = await selectRows<QuoteRow>('quotes', 'id,folio,status,customer_id,rep_id,valid_until,notes,lost_reason,last_follow_up_at,issued_on,lines:quote_lines(line_number,product_id,description,quantity,unit_price,discount_pct),orders:sales_orders(id,folio,status)', { filters: { id }, limit: 1 })
    if (!rows[0]) throw new Error('La cotización no existe o no tienes acceso.')
    return rows[0]
  })

  if (query.error) return <Notice tone="error">{query.error}</Notice>
  if (query.loading && !query.data && !isNew) return <p className="py-10 text-center text-sm text-mc-muted" role="status">Cargando…</p>
  // Estado, seguimiento y pedido ligado se leen de `quote`; lo capturado vive en el formulario.
  return <QuoteForm key={id} quote={query.data} onChanged={query.reload} />
}
