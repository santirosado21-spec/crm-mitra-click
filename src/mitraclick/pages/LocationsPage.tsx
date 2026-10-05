import { ExternalLink, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AppRole } from '../auth/roles'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { ViewTabs } from '../components/ViewTabs'
import { saveRow } from '../lib/crud'
import { useView } from '../lib/useView'

type Row = Record<string, unknown>

const WRITE_ROLES: AppRole[] = ['direccion', 'admin', 'almacen']
const VIEWS: { key: 'ubicaciones' | 'almacenes' | 'etiquetas'; label: string }[] = [
  { key: 'ubicaciones', label: 'Ubicaciones' },
  { key: 'almacenes', label: 'Almacenes' },
  { key: 'etiquetas', label: 'Etiquetas NFC / QR' },
]
const nested = (row: Row, key: string, field: string) => String((row[key] as Record<string, unknown> | null)?.[field] ?? '—')
const active = (row: Row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} />

const shared = {
  title: 'Ubicaciones y etiquetas',
  eyebrow: 'Bodega',
  description: 'Almacenes, ubicaciones dentro de cada almacén y etiquetas NFC/QR. La etiqueta solo guarda un link con un código aleatorio: abre el registro en el teléfono después de iniciar sesión.',
  hasActive: true,
  writeRoles: WRITE_ROLES,
}

const warehouses: ResourceConfig = {
  ...shared,
  table: 'warehouses',
  noun: 'almacén',
  select: 'id,name,address,active',
  searchColumns: ['name', 'address'],
  orderBy: { column: 'name' },
  rowTitle: (row) => String(row.name),
  columns: [{ key: 'name', label: 'Almacén' }, { key: 'address', label: 'Dirección' }, { key: 'active', label: 'Estado', render: active }],
  fields: [
    { name: 'name', label: 'Nombre', type: 'text', required: true, wide: true },
    { name: 'address', label: 'Dirección', type: 'textarea' },
    { name: 'active', label: 'Activo', type: 'checkbox' },
  ],
  defaults: { active: true },
}

const locations: ResourceConfig = {
  ...shared,
  table: 'locations',
  noun: 'ubicación',
  select: 'id,code,description,warehouse_id,active,warehouse:warehouses(name)',
  searchColumns: ['code', 'description'],
  searchPlaceholder: 'Buscar por código o descripción…',
  orderBy: { column: 'code' },
  rowTitle: (row) => String(row.code),
  filters: [{ param: 'almacen', column: 'warehouse_id', label: 'Almacén', relation: { table: 'warehouses', labelColumn: 'name' } }],
  columns: [
    { key: 'code', label: 'Código' },
    { key: 'description', label: 'Descripción' },
    { key: 'warehouse', label: 'Almacén', render: (row) => nested(row, 'warehouse', 'name') },
    { key: 'active', label: 'Estado', render: active },
  ],
  fields: [
    { name: 'warehouse_id', label: 'Almacén', type: 'select', required: true, relation: { table: 'warehouses', labelColumn: 'name' } },
    { name: 'code', label: 'Código', type: 'text', required: true, transform: 'upper', placeholder: 'A-01-03', hint: 'Como está rotulado en el anaquel. Único dentro del almacén.' },
    { name: 'description', label: 'Descripción', type: 'text', wide: true },
    { name: 'active', label: 'Activa', type: 'checkbox' },
  ],
  defaults: { active: true },
}

const tags: ResourceConfig = {
  ...shared,
  table: 'tags',
  noun: 'etiqueta',
  select: 'id,code,label,product_id,location_id,active,product:products(sku,name),location:locations(code)',
  searchColumns: ['code', 'label'],
  searchPlaceholder: 'Buscar por código o nota…',
  orderBy: { column: 'created_at', ascending: false },
  rowTitle: (row) => (row.product ? nested(row, 'product', 'name') : `Ubicación ${nested(row, 'location', 'code')}`),
  save: ({ row, payload }) => {
    if (!payload.product_id && !payload.location_id) throw new Error('Elige un producto, una ubicación o ambos: la etiqueta tiene que abrir algo.')
    return saveRow('tags', row ? String(row.id) : null, payload)
  },
  rowActions: (row) => (
    <Link to={`/b/${String(row.code)}`} className="grid h-9 w-9 place-items-center rounded-lg text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink" aria-label={`Abrir la ficha de la etiqueta ${String(row.code)}`}><ExternalLink size={15} aria-hidden="true" /></Link>
  ),
  columns: [
    { key: 'target', label: 'Abre', render: (row) => (row.product ? `${nested(row, 'product', 'name')} · ${nested(row, 'product', 'sku')}` : `Ubicación ${nested(row, 'location', 'code')}`) },
    { key: 'location', label: 'Ubicación', render: (row) => (row.location ? nested(row, 'location', 'code') : '—') },
    { key: 'code', label: 'Código', render: (row) => <code className="text-xs">{String(row.code)}</code> },
    { key: 'label', label: 'Nota' },
    { key: 'active', label: 'Estado', render: active },
  ],
  fields: [
    { name: 'product_id', label: 'Producto', type: 'select', relation: { table: 'products', labelColumn: 'name' } },
    { name: 'location_id', label: 'Ubicación', type: 'select', relation: { table: 'locations', labelColumn: 'code' }, hint: 'Con producto: su ubicación habitual. Sola: la etiqueta abre todo lo que hay en esa ubicación.' },
    { name: 'label', label: 'Nota', type: 'text', wide: true, placeholder: 'Anaquel 3, caja master…' },
    { name: 'active', label: 'Activa (una etiqueta perdida se desactiva)', type: 'checkbox' },
  ],
  defaults: { active: true },
}

const CONFIGS = { ubicaciones: locations, almacenes: warehouses, etiquetas: tags }

export function LocationsPage() {
  const view = useView(VIEWS)
  return (
    <ResourcePage
      key={view}
      config={CONFIGS[view]}
      toolbar={<ViewTabs options={VIEWS} current={view} label="Vista de bodega" />}
      headerActions={view === 'etiquetas' ? <Link to="/etiquetas" className="inline-flex items-center justify-center gap-2 rounded-xl border border-mc-line bg-white px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-charcoal"><Printer size={16} aria-hidden="true" />Hoja de etiquetas</Link> : undefined}
    />
  )
}
