import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'

const config: ResourceConfig = {
  table: 'suppliers',
  noun: 'proveedor',
  title: 'Proveedores',
  eyebrow: 'Compras',
  description: 'A quién le compra Mitra Click, con sus condiciones de pago y tiempos de entrega.',
  select: 'id,folio,name,contact_name,email,phone,rfc,lead_time_days,payment_terms,notes,active',
  searchColumns: ['name', 'folio', 'email', 'contact_name', 'rfc'],
  searchPlaceholder: 'Buscar por nombre, folio, correo o RFC…',
  orderBy: { column: 'name' },
  hasActive: true,
  writeRoles: ['direccion', 'admin', 'compras'],
  rowTitle: (row) => String(row.name),
  columns: [
    { key: 'name', label: 'Proveedor' },
    { key: 'folio', label: 'Folio' },
    { key: 'contact_name', label: 'Contacto' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'lead_time_days', label: 'Entrega', render: (row) => (row.lead_time_days === null || row.lead_time_days === undefined ? '—' : `${String(row.lead_time_days)} días`) },
    { key: 'payment_terms', label: 'Condiciones' },
    { key: 'active', label: 'Estado', render: (row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} /> },
  ],
  fields: [
    { name: 'name', label: 'Nombre o razón social', type: 'text', required: true, wide: true },
    { name: 'contact_name', label: 'Contacto', type: 'text' },
    { name: 'email', label: 'Correo', type: 'email', transform: 'lower' },
    { name: 'phone', label: 'Teléfono', type: 'tel' },
    { name: 'rfc', label: 'RFC', type: 'text', transform: 'upper' },
    { name: 'lead_time_days', label: 'Tiempo de entrega (días)', type: 'number', min: 0 },
    { name: 'payment_terms', label: 'Condiciones de pago', type: 'text', placeholder: 'Contado, 30 días…' },
    { name: 'notes', label: 'Notas', type: 'textarea' },
    { name: 'active', label: 'Activo', type: 'checkbox' },
  ],
  defaults: { active: true },
}

export function SuppliersPage() {
  return <ResourcePage config={config} />
}
