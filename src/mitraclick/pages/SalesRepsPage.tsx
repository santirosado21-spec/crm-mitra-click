import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'

const config: ResourceConfig = {
  table: 'sales_reps',
  noun: 'vendedor',
  title: 'Vendedores',
  eyebrow: 'Ventas',
  description: 'Personas a las que se asignan clientes, cotizaciones y pedidos. Si el vendedor entra al sistema, se liga con su usuario.',
  select: 'id,name,email,phone,app_user_id,active,user:app_users(display_name)',
  searchColumns: ['name', 'email'],
  searchPlaceholder: 'Buscar por nombre o correo…',
  orderBy: { column: 'name' },
  hasActive: true,
  writeRoles: ['direccion', 'admin'],
  rowTitle: (row) => String(row.name),
  columns: [
    { key: 'name', label: 'Vendedor' },
    { key: 'email', label: 'Correo' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'user', label: 'Usuario del sistema', render: (row) => (row.user as { display_name?: string } | null)?.display_name ?? 'Sin usuario' },
    { key: 'active', label: 'Estado', render: (row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} /> },
  ],
  fields: [
    { name: 'name', label: 'Nombre', type: 'text', required: true },
    { name: 'app_user_id', label: 'Usuario del sistema', type: 'select', relation: { table: 'app_users', labelColumn: 'display_name' }, hint: 'Opcional. Un usuario solo puede ligarse a un vendedor.' },
    { name: 'email', label: 'Correo', type: 'email', transform: 'lower' },
    { name: 'phone', label: 'Teléfono', type: 'tel' },
    { name: 'active', label: 'Activo', type: 'checkbox' },
  ],
  defaults: { active: true },
}

export function SalesRepsPage() {
  return <ResourcePage config={config} />
}
