import { Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import type { AppRole } from '../auth/roles'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'

const WRITE_ROLES: AppRole[] = ['direccion', 'admin', 'ventas', 'finanzas']
const KIND_LABEL: Record<string, string> = { empresa: 'Empresa', persona: 'Persona' }
const related = (row: Record<string, unknown>, key: string) => (row[key] as { name?: string } | null)?.name ?? '—'

const config: ResourceConfig = {
  table: 'customers',
  noun: 'cliente',
  title: 'Clientes',
  eyebrow: 'Ventas',
  description: 'Empresas y personas a las que vende Mitra Click, por Shopify o por venta directa, con su vendedor asignado y datos fiscales.',
  select: 'id,folio,name,kind,contact_name,email,phone,rfc,billing_address,shipping_address,city,state,rep_id,notes,active,source,rep:sales_reps(name)',
  searchColumns: ['name', 'folio', 'email', 'contact_name', 'rfc'],
  searchPlaceholder: 'Buscar por nombre, folio, correo o RFC…',
  orderBy: { column: 'name' },
  hasActive: true,
  writeRoles: WRITE_ROLES,
  rowTitle: (row) => String(row.name),
  filters: [
    { param: 'tipo', column: 'kind', label: 'Tipo', options: [{ value: 'empresa', label: 'Empresa' }, { value: 'persona', label: 'Persona' }] },
    { param: 'vendedor', column: 'rep_id', label: 'Vendedor', relation: { table: 'sales_reps', labelColumn: 'name' } },
  ],
  columns: [
    { key: 'name', label: 'Cliente' },
    { key: 'folio', label: 'Folio' },
    { key: 'kind', label: 'Tipo', render: (row) => KIND_LABEL[String(row.kind)] ?? String(row.kind) },
    { key: 'email', label: 'Correo' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'rep', label: 'Vendedor', render: (row) => related(row, 'rep') },
    { key: 'active', label: 'Estado', render: (row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} /> },
  ],
  fields: [
    { name: 'name', label: 'Nombre o razón social', type: 'text', required: true, wide: true },
    { name: 'kind', label: 'Tipo', type: 'select', required: true, options: [{ value: 'empresa', label: 'Empresa' }, { value: 'persona', label: 'Persona' }] },
    { name: 'rep_id', label: 'Vendedor asignado', type: 'select', relation: { table: 'sales_reps', labelColumn: 'name' } },
    { name: 'contact_name', label: 'Contacto', type: 'text' },
    { name: 'email', label: 'Correo', type: 'email', transform: 'lower' },
    { name: 'phone', label: 'Teléfono', type: 'tel' },
    { name: 'rfc', label: 'RFC', type: 'text', transform: 'upper' },
    { name: 'billing_address', label: 'Domicilio fiscal', type: 'textarea' },
    { name: 'shipping_address', label: 'Domicilio de entrega', type: 'textarea' },
    { name: 'city', label: 'Ciudad', type: 'text' },
    { name: 'state', label: 'Estado', type: 'text' },
    { name: 'notes', label: 'Notas', type: 'textarea' },
    { name: 'active', label: 'Activo', type: 'checkbox' },
  ],
  defaults: { kind: 'empresa', active: true },
}

export function CustomersPage() {
  const { can } = useSession()
  return (
    <ResourcePage
      config={config}
      headerActions={can(WRITE_ROLES) ? <Link to="/clientes/importar" className="inline-flex items-center justify-center gap-2 rounded-xl border border-mc-line bg-mc-surface px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-charcoal"><Upload size={16} aria-hidden="true" />Importar CSV</Link> : undefined}
    />
  )
}
