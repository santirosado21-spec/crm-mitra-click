import type { Database } from '../lib/database.types'

export type AppRole = Database['public']['Enums']['app_role']

export const ROLE_LABEL: Record<AppRole, string> = {
  direccion: 'Dirección',
  admin: 'Administración',
  ventas: 'Ventas',
  compras: 'Compras',
  almacen: 'Almacén',
  logistica: 'Logística',
  finanzas: 'Finanzas',
  marketing: 'Marketing',
}

export const ALL_ROLES = Object.keys(ROLE_LABEL) as AppRole[]

/** ¿Alguno de los roles del usuario está entre los permitidos? */
export const hasAnyRole = (userRoles: readonly AppRole[], allowed: readonly AppRole[]) =>
  allowed.some((role) => userRoles.includes(role))
