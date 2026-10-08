import { useState } from 'react'
import { ExternalLink, Printer, Wand2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import type { AppRole } from '../auth/roles'
import { Button } from '../components/Controls'
import { LayoutGenerator } from '../components/LayoutGenerator'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { ViewTabs } from '../components/ViewTabs'
import { saveRow } from '../lib/crud'
import { formatNumber } from '../lib/format'
import { useView } from '../lib/useView'
import { LOCATION_KINDS, MAX_LEVEL, MAX_POSITION, type LocationKind } from '../lib/warehouse'

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
  select: 'id,code,description,warehouse_id,zone,position,level,kind,max_units,pick_order,active,warehouse:warehouses(name)',
  searchColumns: ['code', 'description', 'zone'],
  searchPlaceholder: 'Buscar por código, zona o descripción…',
  // El recorrido de surtido, que es como se camina la bodega.
  orderBy: { column: 'pick_order' },
  rowTitle: (row) => String(row.code),
  filters: [
    { param: 'almacen', column: 'warehouse_id', label: 'Almacén', relation: { table: 'warehouses', labelColumn: 'name' } },
    { param: 'tipo', column: 'kind', label: 'Tipo', options: Object.entries(LOCATION_KINDS).map(([value, label]) => ({ value, label })) },
  ],
  columns: [
    { key: 'code', label: 'Código' },
    { key: 'zone', label: 'Zona' },
    { key: 'place', label: 'Posición · nivel', render: (row) => (row.position === null ? 'Zona suelta' : `${String(row.position)} · ${String(row.level)}`) },
    { key: 'kind', label: 'Tipo', render: (row) => LOCATION_KINDS[row.kind as LocationKind] ?? String(row.kind) },
    { key: 'max_units', label: 'Capacidad', align: 'right', render: (row) => (row.max_units === null ? 'Sin capturar' : formatNumber(Number(row.max_units))) },
    { key: 'warehouse', label: 'Almacén', render: (row) => nested(row, 'warehouse', 'name') },
    { key: 'active', label: 'Estado', render: active },
  ],
  fields: [
    { name: 'warehouse_id', label: 'Almacén', type: 'select', required: true, relation: { table: 'warehouses', labelColumn: 'name' } },
    { name: 'code', label: 'Código', type: 'text', required: true, transform: 'upper', placeholder: 'A-01-1', hint: 'Como está rotulado en el anaquel. Único dentro del almacén.' },
    { name: 'zone', label: 'Zona', type: 'text', transform: 'upper', placeholder: 'A', hint: 'Vacío: se toma lo que va antes del primer guion del código.' },
    { name: 'position', label: 'Posición', type: 'number', min: 1, max: MAX_POSITION, hint: 'Vacío en una zona suelta (recepción, embarque).' },
    { name: 'level', label: 'Nivel', type: 'number', min: 1, max: MAX_LEVEL, hint: '1 es el piso. Va junto con la posición.' },
    { name: 'kind', label: 'Tipo', type: 'select', required: true, options: Object.entries(LOCATION_KINDS).map(([value, label]) => ({ value, label })) },
    { name: 'max_units', label: 'Capacidad en unidades', type: 'number', min: 1, hint: 'Opcional. Sin esto, la ocupación se reporta en unidades y sin porcentaje.' },
    { name: 'description', label: 'Descripción', type: 'text', wide: true },
    { name: 'active', label: 'Activa', type: 'checkbox' },
  ],
  defaults: { kind: 'almacenaje', active: true },
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
  const { can } = useSession()
  const view = useView(VIEWS)
  const [generating, setGenerating] = useState(false)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <>
      <ResourcePage
        key={`${view}-${version}`}
        config={CONFIGS[view]}
        toolbar={
          <div className="space-y-3">
            <ViewTabs options={VIEWS} current={view} label="Vista de bodega" />
            {notice && <p className="rounded-xl border border-mc-success/30 bg-mc-success-soft px-4 py-3 text-sm font-semibold text-mc-ink" role="status">{notice}</p>}
          </div>
        }
        headerActions={
          <>
            {view === 'ubicaciones' && can(WRITE_ROLES) && <Button variant="outline" onClick={() => setGenerating(true)} data-testid="generate-layout"><Wand2 size={16} aria-hidden="true" />Generar ubicaciones</Button>}
            {view === 'etiquetas' && <Link to="/etiquetas" className="inline-flex items-center justify-center gap-2 rounded-xl border border-mc-line bg-white px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-charcoal"><Printer size={16} aria-hidden="true" />Hoja de etiquetas</Link>}
          </>
        }
      />
      {generating && (
        <LayoutGenerator
          onClose={() => setGenerating(false)}
          onDone={(summary) => { setGenerating(false); setNotice(summary); setVersion((value) => value + 1) }}
        />
      )}
    </>
  )
}
