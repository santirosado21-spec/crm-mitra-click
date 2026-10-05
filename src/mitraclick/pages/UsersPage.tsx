import { ALL_ROLES, ROLE_LABEL, type AppRole } from '../auth/roles'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { formatDate } from '../lib/format'

const config: ResourceConfig = {
  table: 'app_users',
  noun: 'usuario',
  title: 'Usuarios y permisos',
  eyebrow: 'Sistema',
  description: 'Quién puede entrar al sistema y con qué roles. Una persona entra con el correo dado de alta aquí; los permisos los aplica la base de datos según sus roles.',
  select: 'id,email,display_name,roles,active,created_at',
  searchColumns: ['display_name', 'email'],
  searchPlaceholder: 'Buscar por nombre o correo…',
  orderBy: { column: 'display_name' },
  hasActive: true,
  writeRoles: ['direccion', 'admin'],
  rowTitle: (row) => String(row.display_name),
  columns: [
    { key: 'display_name', label: 'Nombre' },
    { key: 'email', label: 'Correo' },
    { key: 'roles', label: 'Roles', render: (row) => (row.roles as AppRole[]).map((role) => ROLE_LABEL[role]).join(', ') || 'Sin roles' },
    { key: 'active', label: 'Estado', render: (row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} /> },
    { key: 'created_at', label: 'Alta', render: (row) => formatDate(String(row.created_at)) },
  ],
  fields: [
    { name: 'display_name', label: 'Nombre', type: 'text', required: true },
    { name: 'email', label: 'Correo', type: 'email', required: true, transform: 'lower', hint: 'Debe ser el mismo correo con el que inicia sesión.' },
    { name: 'roles', label: 'Roles', type: 'multiselect', required: true, options: ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] })) },
    { name: 'active', label: 'Activo (puede entrar al sistema)', type: 'checkbox' },
  ],
  defaults: { active: true },
}

export function UsersPage() {
  return <ResourcePage config={config} />
}
