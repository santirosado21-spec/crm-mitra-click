import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import type { AppRole } from '../auth/roles'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { statusLabel } from '../lib/documents'
import { formatDate, formatMoney } from '../lib/format'

type Row = Record<string, unknown>

const nested = (row: Row, key: string, field: string) => String((row[key] as Record<string, unknown> | null)?.[field] ?? '—')
const badge = (row: Row, key = 'status') => <StatusBadge status={statusLabel(row[key])} />
const money = (row: Row, key = 'total') => formatMoney(Number(row[key] ?? 0))
const date = (row: Row, key: string) => (row[key] ? formatDate(String(row[key])) : '—')
const statusOptions = (values: string[]) => values.map((value) => ({ value, label: statusLabel(value) }))
const open = (to: string, label: ReactNode) => <Link to={to} className="font-semibold text-mc-ink underline decoration-mc-yellow decoration-2 underline-offset-2">{label}</Link>

function NewLink({ to, roles, children }: { to: string; roles: AppRole[]; children: ReactNode }) {
  const { can } = useSession()
  if (!can(roles)) return null
  return <Link to={to} className="inline-flex items-center justify-center gap-2 rounded-xl bg-mc-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-mc-ink" data-testid="new-document"><Plus size={16} aria-hidden="true" />{children}</Link>
}

// Listas de solo lectura: el documento se crea y se modifica en su propia pantalla.
const readOnly = { writeRoles: [] as AppRole[], fields: [] }

const quotes: ResourceConfig = {
  ...readOnly,
  table: 'quotes',
  noun: 'cotización',
  title: 'Cotizaciones',
  eyebrow: 'Ventas',
  description: 'Cotizaciones con su seguimiento. Una cotización enviada o en negociación se convierte en pedido sin volver a capturar.',
  select: 'id,folio,status,issued_on,valid_until,total,last_follow_up_at,customer:customers(name),rep:sales_reps(name)',
  searchColumns: ['folio', 'notes'],
  searchPlaceholder: 'Buscar por folio o notas…',
  orderBy: { column: 'created_at', ascending: false },
  rowTitle: (row) => String(row.folio),
  filters: [
    { param: 'estado', column: 'status', label: 'Estado', options: statusOptions(['borrador', 'enviada', 'negociacion', 'ganada', 'perdida', 'vencida']) },
    { param: 'vendedor', column: 'rep_id', label: 'Vendedor', relation: { table: 'sales_reps', labelColumn: 'name' } },
  ],
  columns: [
    { key: 'folio', label: 'Folio', render: (row) => open(`/cotizaciones/${String(row.id)}`, String(row.folio)) },
    { key: 'customer', label: 'Cliente', render: (row) => nested(row, 'customer', 'name') },
    { key: 'rep', label: 'Vendedor', render: (row) => (row.rep ? nested(row, 'rep', 'name') : 'Sin asignar') },
    { key: 'status', label: 'Estado', render: (row) => badge(row) },
    { key: 'total', label: 'Total', align: 'right', render: (row) => money(row) },
    { key: 'issued_on', label: 'Emitida', render: (row) => date(row, 'issued_on') },
    { key: 'last_follow_up_at', label: 'Último seguimiento', render: (row) => (row.last_follow_up_at ? date(row, 'last_follow_up_at') : 'Sin seguimiento') },
  ],
}

const orders: ResourceConfig = {
  ...readOnly,
  table: 'sales_orders',
  noun: 'pedido',
  title: 'Pedidos',
  eyebrow: 'Ventas',
  description: 'Pedidos de Shopify y de venta directa. Cada uno guarda su línea de tiempo: cotización, compra, envío, remisión, factura y pago.',
  select: 'id,folio,shopify_order_name,channel,status,payment_status,ordered_on,promised_on,total,customer:customers(name),rep:sales_reps(name)',
  searchColumns: ['folio', 'shopify_order_name', 'notes'],
  searchPlaceholder: 'Buscar por folio o número de Shopify…',
  orderBy: { column: 'created_at', ascending: false },
  rowTitle: (row) => String(row.folio),
  filters: [
    { param: 'estado', column: 'status', label: 'Estado', options: statusOptions(['nuevo', 'confirmado', 'en_compra', 'en_surtido', 'enviado', 'entregado', 'cancelado']) },
    { param: 'canal', column: 'channel', label: 'Canal', options: [{ value: 'directo', label: 'Venta directa' }, { value: 'shopify', label: 'Shopify' }] },
    { param: 'pago', column: 'payment_status', label: 'Pago', options: statusOptions(['pendiente', 'parcial', 'pagado', 'reembolsado']) },
  ],
  columns: [
    { key: 'folio', label: 'Folio', render: (row) => open(`/pedidos/${String(row.id)}`, String(row.folio ?? row.shopify_order_name)) },
    { key: 'customer', label: 'Cliente', render: (row) => nested(row, 'customer', 'name') },
    { key: 'channel', label: 'Canal', render: (row) => (row.channel === 'shopify' ? 'Shopify' : 'Venta directa') },
    { key: 'status', label: 'Estado', render: (row) => badge(row) },
    { key: 'payment_status', label: 'Pago', render: (row) => badge(row, 'payment_status') },
    { key: 'total', label: 'Total', align: 'right', render: (row) => money(row) },
    { key: 'ordered_on', label: 'Fecha', render: (row) => date(row, 'ordered_on') },
    { key: 'promised_on', label: 'Prometido', render: (row) => date(row, 'promised_on') },
  ],
}

const purchases: ResourceConfig = {
  ...readOnly,
  table: 'purchase_orders',
  noun: 'compra',
  title: 'Compras',
  eyebrow: 'Compras',
  description: 'Órdenes de compra a proveedores, ligadas al pedido que las originó, y su recepción en bodega.',
  select: 'id,folio,status,ordered_on,expected_on,total,supplier:suppliers(name),order:sales_orders(id,folio)',
  searchColumns: ['folio', 'notes'],
  searchPlaceholder: 'Buscar por folio o notas…',
  orderBy: { column: 'created_at', ascending: false },
  rowTitle: (row) => String(row.folio),
  filters: [
    { param: 'estado', column: 'status', label: 'Estado', options: statusOptions(['borrador', 'enviada', 'parcial', 'recibida', 'cancelada']) },
    { param: 'proveedor', column: 'supplier_id', label: 'Proveedor', relation: { table: 'suppliers', labelColumn: 'name' } },
  ],
  columns: [
    { key: 'folio', label: 'Folio', render: (row) => open(`/compras/${String(row.id)}`, String(row.folio)) },
    { key: 'supplier', label: 'Proveedor', render: (row) => nested(row, 'supplier', 'name') },
    { key: 'order', label: 'Pedido', render: (row) => (row.order ? open(`/pedidos/${nested(row, 'order', 'id')}`, nested(row, 'order', 'folio')) : '—') },
    { key: 'status', label: 'Estado', render: (row) => badge(row) },
    { key: 'total', label: 'Total', align: 'right', render: (row) => money(row) },
    { key: 'ordered_on', label: 'Fecha', render: (row) => date(row, 'ordered_on') },
    { key: 'expected_on', label: 'Llegada esperada', render: (row) => date(row, 'expected_on') },
  ],
}

export function QuotesPage() {
  return <ResourcePage config={quotes} headerActions={<NewLink to="/cotizaciones/nueva" roles={['direccion', 'admin', 'ventas']}>Nueva cotización</NewLink>} />
}

export function OrdersPage() {
  return <ResourcePage config={orders} headerActions={<NewLink to="/pedidos/nuevo" roles={['direccion', 'admin', 'ventas']}>Nuevo pedido</NewLink>} />
}

export function PurchasesPage() {
  return <ResourcePage config={purchases} headerActions={<NewLink to="/compras/nueva" roles={['direccion', 'admin', 'compras']}>Nueva compra</NewLink>} />
}
