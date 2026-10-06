import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { Button, Field, Select, TextInput } from '../components/Controls'
import { ActionDrawer, ReasonField } from '../components/DocumentParts'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { ViewTabs } from '../components/ViewTabs'
import { callFunction } from '../lib/crud'
import { invoiceBalance, statusLabel } from '../lib/documents'
import { formatDate, formatMoney } from '../lib/format'
import { useView } from '../lib/useView'

type Row = Record<string, unknown>

const nested = (row: Row, key: string, field: string) => String((row[key] as Record<string, unknown> | null)?.[field] ?? '—')
const smallButton = '!px-3 !py-1.5 !text-xs'
const invoiceName = (row: Row) => [row.series, row.folio].filter(Boolean).join('-')
const balanceOf = (row: Row) => invoiceBalance(Number(row.total), ((row.payments as { amount: number }[] | null) ?? []).map((payment) => Number(payment.amount)))

const METHODS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'otro', label: 'Otro' },
]
const methodLabel = (value: unknown) => METHODS.find((method) => method.value === value)?.label ?? '—'

function PaymentDrawer({ invoice, onClose, onSaved }: { invoice: Row; onClose: () => void; onSaved: () => void }) {
  const { balance } = balanceOf(invoice)
  const [amount, setAmount] = useState(String(balance))
  const [paidOn, setPaidOn] = useState('')
  const [method, setMethod] = useState('transferencia')
  const [reference, setReference] = useState('')

  const submit = async () => {
    const value = Number(amount.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(value) || value <= 0) throw new Error('El importe debe ser mayor que cero.')
    if (value > balance) throw new Error(`El pago excede el saldo de la factura (${formatMoney(balance)}).`)
    await callFunction('register_payment', { p_invoice_id: invoice.id, p_amount: value, p_paid_on: paidOn || null, p_method: method, p_reference: reference || null })
    onSaved()
  }

  return (
    <ActionDrawer title="Registrar pago" subtitle={`Factura ${invoiceName(invoice)} · ${nested(invoice, 'customer', 'name')} · Saldo ${formatMoney(balance)}`} submitLabel="Registrar pago" onClose={onClose} onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pay-amount" label="Importe" required><TextInput id="pay-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
        <Field id="pay-date" label="Fecha de pago" hint="Vacío: hoy."><TextInput id="pay-date" type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} /></Field>
        <Field id="pay-method" label="Forma de pago" required>
          <Select id="pay-method" value={method} onChange={(event) => setMethod(event.target.value)}>
            {METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </Field>
        <Field id="pay-reference" label="Referencia"><TextInput id="pay-reference" value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
      </div>
    </ActionDrawer>
  )
}

function CancelDrawer({ invoice, onClose, onSaved }: { invoice: Row; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState('')
  const submit = async () => {
    if (!reason.trim()) throw new Error('Escribe el motivo.')
    await callFunction('cancel_invoice', { p_id: invoice.id, p_reason: reason })
    onSaved()
  }
  return (
    <ActionDrawer title="Cancelar factura" subtitle={`${invoiceName(invoice)} · Solo se cancela aquí el registro; la cancelación fiscal se hace ante el SAT.`} submitLabel="Cancelar factura" onClose={onClose} onSubmit={submit}>
      <ReasonField id="cancel-reason" label="Motivo" value={reason} onChange={setReason} />
    </ActionDrawer>
  )
}

export function InvoicesPage() {
  const { can } = useSession()
  const canWrite = can(['direccion', 'admin', 'finanzas'])
  const [paying, setPaying] = useState<Row | null>(null)
  const [cancelling, setCancelling] = useState<Row | null>(null)
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((value) => value + 1)

  const config: ResourceConfig = {
    table: 'invoices',
    noun: 'factura',
    title: 'Facturas',
    eyebrow: 'Finanzas',
    description: 'Registro de las facturas emitidas por pedido y su cobro. El sistema no timbra: la factura se emite fuera y aquí se registra desde el pedido.',
    select: 'id,folio,series,status,issued_on,due_on,total,cfdi_uuid,customer:customers(name),order:sales_orders(id,folio),payments(amount)',
    searchColumns: ['folio', 'series', 'cfdi_uuid'],
    searchPlaceholder: 'Buscar por folio o folio fiscal…',
    orderBy: { column: 'issued_on', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: invoiceName,
    filters: [
      { param: 'estado', column: 'status', label: 'Estado', options: ['emitida', 'parcial', 'pagada', 'cancelada'].map((value) => ({ value, label: statusLabel(value) })) },
      { param: 'cliente', column: 'customer_id', label: 'Cliente', relation: { table: 'customers', labelColumn: 'name' } },
    ],
    rowActions: canWrite
      ? (row) => (
          <>
            {['emitida', 'parcial'].includes(String(row.status)) && <Button className={smallButton} onClick={() => setPaying(row)} aria-label={`Registrar pago de la factura ${invoiceName(row)}`}>Registrar pago</Button>}
            {row.status === 'emitida' && <Button variant="outline" className={smallButton} onClick={() => setCancelling(row)} aria-label={`Cancelar la factura ${invoiceName(row)}`}>Cancelar</Button>}
          </>
        )
      : undefined,
    columns: [
      { key: 'folio', label: 'Factura', render: invoiceName },
      { key: 'customer', label: 'Cliente', render: (row) => nested(row, 'customer', 'name') },
      { key: 'order', label: 'Pedido', render: (row) => (row.order ? <Link to={`/pedidos/${nested(row, 'order', 'id')}`} className="font-semibold text-mc-ink underline">{nested(row, 'order', 'folio')}</Link> : '—') },
      { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={statusLabel(row.status)} /> },
      { key: 'total', label: 'Total', align: 'right', render: (row) => formatMoney(Number(row.total)) },
      { key: 'balance', label: 'Saldo', align: 'right', render: (row) => (row.status === 'cancelada' ? '—' : formatMoney(balanceOf(row).balance)) },
      { key: 'issued_on', label: 'Emitida', render: (row) => formatDate(String(row.issued_on)) },
      { key: 'due_on', label: 'Vence', render: (row) => (row.due_on ? formatDate(String(row.due_on)) : '—') },
    ],
  }

  return (
    <>
      <ResourcePage key={version} config={config} />
      {paying && <PaymentDrawer invoice={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); refresh() }} />}
      {cancelling && <CancelDrawer invoice={cancelling} onClose={() => setCancelling(null)} onSaved={() => { setCancelling(null); refresh() }} />}
    </>
  )
}

const VIEWS: { key: 'pagos' | 'estados'; label: string }[] = [
  { key: 'pagos', label: 'Pagos recibidos' },
  { key: 'estados', label: 'Estado de cuenta por cliente' },
]

const sharedPayments = {
  title: 'Pagos y estados de cuenta',
  eyebrow: 'Finanzas',
  description: 'Pagos recibidos contra factura y saldo de cada cliente. Un pago se registra desde su factura.',
  writeRoles: [],
  fields: [],
}

const payments: ResourceConfig = {
  ...sharedPayments,
  table: 'payments',
  noun: 'pago',
  select: 'id,folio,paid_on,amount,method,reference,customer:customers(name),invoice:invoices(folio,series)',
  searchColumns: ['folio', 'reference'],
  searchPlaceholder: 'Buscar por folio o referencia…',
  orderBy: { column: 'paid_on', ascending: false },
  rowTitle: (row) => String(row.folio),
  filters: [
    { param: 'cliente', column: 'customer_id', label: 'Cliente', relation: { table: 'customers', labelColumn: 'name' } },
    { param: 'forma', column: 'method', label: 'Forma de pago', options: METHODS },
  ],
  columns: [
    { key: 'folio', label: 'Pago' },
    { key: 'customer', label: 'Cliente', render: (row) => nested(row, 'customer', 'name') },
    { key: 'invoice', label: 'Factura', render: (row) => (row.invoice ? invoiceName(row.invoice as Row) : '—') },
    { key: 'amount', label: 'Importe', align: 'right', render: (row) => formatMoney(Number(row.amount)) },
    { key: 'method', label: 'Forma de pago', render: (row) => methodLabel(row.method) },
    { key: 'reference', label: 'Referencia' },
    { key: 'paid_on', label: 'Fecha', render: (row) => formatDate(String(row.paid_on)) },
  ],
}

const statements: ResourceConfig = {
  ...sharedPayments,
  // Vista de la base: una fila por cliente con facturas; `id` es el del cliente.
  table: 'customer_statements',
  noun: 'cliente',
  select: 'id,folio,name,invoices,invoiced,paid,balance,overdue_balance,oldest_due_on',
  searchColumns: ['name', 'folio'],
  searchPlaceholder: 'Buscar cliente…',
  orderBy: { column: 'balance', ascending: false },
  rowTitle: (row) => String(row.name),
  columns: [
    { key: 'name', label: 'Cliente' },
    { key: 'invoices', label: 'Facturas', align: 'right' },
    { key: 'invoiced', label: 'Facturado', align: 'right', render: (row) => formatMoney(Number(row.invoiced)) },
    { key: 'paid', label: 'Pagado', align: 'right', render: (row) => formatMoney(Number(row.paid)) },
    { key: 'balance', label: 'Saldo', align: 'right', render: (row) => <strong className="text-mc-ink">{formatMoney(Number(row.balance))}</strong> },
    { key: 'overdue_balance', label: 'Vencido', align: 'right', render: (row) => (Number(row.overdue_balance) > 0 ? <span className="font-semibold text-mc-danger">{formatMoney(Number(row.overdue_balance))}</span> : '—') },
    { key: 'oldest_due_on', label: 'Vencimiento más antiguo', render: (row) => (row.oldest_due_on ? formatDate(String(row.oldest_due_on)) : '—') },
  ],
}

export function PaymentsPage() {
  const view = useView(VIEWS)
  return <ResourcePage key={view} config={view === 'pagos' ? payments : statements} toolbar={<ViewTabs options={VIEWS} current={view} label="Vista de finanzas" />} />
}
