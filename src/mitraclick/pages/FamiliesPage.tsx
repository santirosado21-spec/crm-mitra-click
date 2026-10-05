import type { AppRole } from '../auth/roles'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { ViewTabs } from '../components/ViewTabs'
import { useView } from '../lib/useView'

const WRITE_ROLES: AppRole[] = ['direccion', 'admin', 'compras']
const VIEWS: { key: 'familias' | 'categorias'; label: string }[] = [
  { key: 'familias', label: 'Familias' },
  { key: 'categorias', label: 'Categorías' },
]
const shared = {
  title: 'Familias y categorías',
  eyebrow: 'Catálogo',
  description: 'Estructura con la que se clasifica el catálogo. Cada categoría pertenece a una familia; desactivar una no borra su historial.',
  hasActive: true,
  writeRoles: WRITE_ROLES,
  rowTitle: (row: Record<string, unknown>) => String(row.name),
}

const families: ResourceConfig = {
  ...shared,
  table: 'product_families',
  noun: 'familia',
  select: 'id,name,description,active',
  searchColumns: ['name', 'description'],
  searchPlaceholder: 'Buscar familia…',
  orderBy: { column: 'name' },
  columns: [
    { key: 'name', label: 'Familia' },
    { key: 'description', label: 'Descripción' },
    { key: 'active', label: 'Estado', render: (row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} /> },
  ],
  fields: [
    { name: 'name', label: 'Nombre', type: 'text', required: true, wide: true },
    { name: 'description', label: 'Descripción', type: 'textarea' },
    { name: 'active', label: 'Activa', type: 'checkbox' },
  ],
  defaults: { active: true },
}

const categories: ResourceConfig = {
  ...shared,
  table: 'product_categories',
  noun: 'categoría',
  select: 'id,name,family_id,active,family:product_families(name)',
  searchColumns: ['name'],
  searchPlaceholder: 'Buscar categoría…',
  orderBy: { column: 'name' },
  filters: [{ param: 'familia', column: 'family_id', label: 'Familia', relation: { table: 'product_families', labelColumn: 'name' } }],
  columns: [
    { key: 'name', label: 'Categoría' },
    { key: 'family', label: 'Familia', render: (row) => (row.family as { name?: string } | null)?.name ?? '—' },
    { key: 'active', label: 'Estado', render: (row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} /> },
  ],
  fields: [
    { name: 'family_id', label: 'Familia', type: 'select', required: true, relation: { table: 'product_families', labelColumn: 'name' } },
    { name: 'name', label: 'Nombre', type: 'text', required: true },
    { name: 'active', label: 'Activa', type: 'checkbox' },
  ],
  defaults: { active: true },
}

export function FamiliesPage() {
  const view = useView(VIEWS)
  // `key` reinicia búsqueda y formulario al cambiar de vista.
  return <ResourcePage key={view} config={view === 'familias' ? families : categories} toolbar={<ViewTabs options={VIEWS} current={view} label="Vista del catálogo" />} />
}
