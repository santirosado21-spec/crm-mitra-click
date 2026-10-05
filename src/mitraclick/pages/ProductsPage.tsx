import { useState } from 'react'
import { History, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import type { AppRole } from '../auth/roles'
import { RecordDrawer } from '../components/RecordDrawer'
import { ResourcePage, type ResourceConfig, type SaveContext } from '../components/ResourcePage'
import { EmptyState, StatusBadge } from '../components/Primitives'
import { findSimilarProducts, reasonRequiredFields } from '../lib/catalog'
import { callFunction, listOptions, saveRow, selectRows } from '../lib/crud'
import { formatCurrency, formatDate } from '../lib/format'
import { useQuery } from '../lib/useQuery'

type Row = Record<string, unknown>

const WRITE_ROLES: AppRole[] = ['direccion', 'admin', 'compras']
const UNITS = ['pieza', 'caja', 'paquete', 'metro', 'kilogramo', 'litro', 'rollo', 'juego']
const related = (row: Row, key: string) => (row[key] as { name?: string } | null)?.name ?? '—'
const money = (value: unknown) => (value === null || value === undefined ? '—' : formatCurrency(Number(value)))

async function save({ row, payload }: SaveContext) {
  const { change_reason: reason, ...values } = payload
  if (!row) return saveRow('products', null, values)
  const fields = reasonRequiredFields(row, values)
  if (fields.length && !reason) throw new Error(`Escribe el motivo del cambio de ${fields.join(', ')}. Queda en el historial del producto.`)
  return callFunction('update_product', { p_id: row.id, p_values: values, p_reason: reason ?? null })
}

async function warn({ row, payload }: SaveContext) {
  const existing = await listOptions('products', 'name', ['sku'], false)
  const similar = findSimilarProducts(
    { id: row ? String(row.id) : undefined, sku: String(payload.sku ?? ''), name: String(payload.name ?? '') },
    existing.map((item) => ({ id: String(item.id), sku: String(item.sku), name: String(item.name) })),
  )
  // El SKU repetido lo rechaza la base; aquí solo se avisa de nombres parecidos.
  const byName = similar.filter((item) => item.match === 'nombre')
  if (!byName.length) return null
  return `Ya existe un producto parecido: ${byName.slice(0, 3).map((item) => `${item.name} (${item.sku})`).join('; ')}. Revisa que no sea el mismo antes de guardar.`
}

interface ChangeRow {
  id: number
  field: string
  old_value: string | null
  new_value: string | null
  reason: string | null
  changed_at: string
  user: { display_name: string } | null
}

function HistoryDrawer({ product, onClose }: { product: Row; onClose: () => void }) {
  const query = useQuery(`product-history|${String(product.id)}`, () =>
    selectRows<ChangeRow>('product_change_log', 'id,field,old_value,new_value,reason,changed_at,user:app_users(display_name)', { filters: { product_id: String(product.id) }, orderBy: { column: 'changed_at', ascending: false }, limit: 200 }),
  )
  const rows = query.data ?? []
  return (
    <RecordDrawer open title={String(product.name)} subtitle={`Historial de cambios · ${String(product.sku)}`} onClose={onClose}>
      {query.error ? (
        <p className="text-sm font-semibold text-mc-danger" role="alert">{query.error}</p>
      ) : query.loading ? (
        <p className="text-sm text-mc-muted" role="status">Cargando…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Sin cambios registrados" description="Aquí aparecerán las reclasificaciones y los cambios de precio, costo y estado." />
      ) : (
        <ol className="space-y-3" data-testid="product-history">
          {rows.map((change) => (
            <li key={change.id} className="rounded-xl border border-mc-line-soft bg-mc-surface-2/60 p-3">
              <p className="text-sm font-semibold capitalize text-mc-ink">{change.field}</p>
              <p className="mt-0.5 text-sm text-mc-gray-700"><span className="text-mc-muted">{change.old_value ?? '—'}</span> → <span className="font-semibold">{change.new_value ?? '—'}</span></p>
              {change.reason && <p className="mt-1 text-xs text-mc-gray-700">Motivo: {change.reason}</p>}
              <p className="mt-1 text-xs text-mc-muted">{change.user?.display_name ?? 'Sistema'} · {formatDate(change.changed_at, true)}</p>
            </li>
          ))}
        </ol>
      )}
    </RecordDrawer>
  )
}

export function ProductsPage() {
  const { can } = useSession()
  const [history, setHistory] = useState<Row | null>(null)

  const config: ResourceConfig = {
    table: 'products',
    noun: 'producto',
    title: 'Productos',
    eyebrow: 'Catálogo',
    description: 'Catálogo de Mitra Click. El SKU es único; cada reclasificación o cambio de precio y costo queda en el historial con su motivo.',
    select: 'id,sku,name,description,brand,family_id,category_id,unit,cost,price,photo_url,barcode,reorder_point,active,source,family:product_families(name),category:product_categories(name)',
    searchColumns: ['name', 'sku', 'brand', 'barcode'],
    searchPlaceholder: 'Buscar por nombre, SKU, marca o código de barras…',
    orderBy: { column: 'name' },
    hasActive: true,
    writeRoles: WRITE_ROLES,
    rowTitle: (row) => String(row.name),
    save,
    warn,
    filters: [{ param: 'familia', column: 'family_id', label: 'Familia', relation: { table: 'product_families', labelColumn: 'name' } }],
    rowActions: (row) => (
      <button type="button" onClick={() => setHistory(row)} className="grid h-9 w-9 place-items-center rounded-lg text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink" aria-label={`Historial de ${String(row.name)}`}><History size={15} aria-hidden="true" /></button>
    ),
    columns: [
      { key: 'name', label: 'Producto' },
      { key: 'sku', label: 'SKU' },
      { key: 'family', label: 'Familia', render: (row) => (row.family_id ? related(row, 'family') : <StatusBadge status="Sin familia" />) },
      { key: 'category', label: 'Categoría', render: (row) => related(row, 'category') },
      { key: 'price', label: 'Precio', align: 'right', render: (row) => money(row.price) },
      { key: 'cost', label: 'Costo', align: 'right', render: (row) => money(row.cost) },
      { key: 'active', label: 'Estado', render: (row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} /> },
    ],
    fields: [
      { name: 'sku', label: 'SKU', type: 'text', required: true, transform: 'upper' },
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'family_id', label: 'Familia', type: 'select', required: true, relation: { table: 'product_families', labelColumn: 'name' } },
      { name: 'category_id', label: 'Categoría', type: 'select', relation: { table: 'product_categories', labelColumn: 'name', filterBy: { field: 'family_id', column: 'family_id' } }, hint: 'Solo aparecen las categorías de la familia elegida.' },
      { name: 'brand', label: 'Marca', type: 'text' },
      { name: 'unit', label: 'Unidad', type: 'select', required: true, options: UNITS.map((unit) => ({ value: unit, label: unit })) },
      { name: 'price', label: 'Precio de venta', type: 'money', min: 0 },
      { name: 'cost', label: 'Costo', type: 'money', min: 0 },
      { name: 'reorder_point', label: 'Punto de reorden', type: 'number', min: 0, required: true, hint: 'Existencia a partir de la cual conviene resurtir.' },
      { name: 'barcode', label: 'Código de barras', type: 'text' },
      { name: 'photo_url', label: 'Foto (URL)', type: 'text', wide: true },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'active', label: 'Activo', type: 'checkbox' },
      { name: 'change_reason', label: 'Motivo del cambio', type: 'textarea', onlyOnEdit: true, hint: 'Obligatorio si cambias familia, categoría, precio o costo.' },
    ],
    defaults: { unit: 'pieza', reorder_point: '0', active: true },
  }

  return (
    <>
      <ResourcePage
        config={config}
        headerActions={can(WRITE_ROLES) ? <Link to="/productos/importar" className="inline-flex items-center justify-center gap-2 rounded-xl border border-mc-line bg-white px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-charcoal"><Upload size={16} aria-hidden="true" />Importar CSV</Link> : undefined}
      />
      {history && <HistoryDrawer product={history} onClose={() => setHistory(null)} />}
    </>
  )
}
