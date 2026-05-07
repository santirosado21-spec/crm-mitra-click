import type { UserRole } from '../types'

export type AppModule = 'wms' | 'tms' | 'almacen' | 'tasks' | 'parcel'

export const ROLE_LABEL: Record<UserRole, string> = {
  admin:             'Administrador',
  almacen:           'Almacén',
  servicio_cliente:  'SAC',
  cobranza:          'Cobranza',
  transporte:        'Transportes',
}

export const MODULE_LABEL: Record<AppModule, string> = {
  wms:     'Herramientas de WMS / SAC',
  tms:     'Transportes',
  almacen: 'Almacén',
  tasks:   'Task Manager',
  parcel:  'TMS Guías de Paquetería',
}

export const MODULE_ACCESS: Record<UserRole, AppModule[]> = {
  admin:             ['wms', 'tms', 'almacen', 'tasks', 'parcel'],
  almacen:           ['almacen', 'tasks'],
  servicio_cliente:  ['wms', 'almacen', 'tasks', 'parcel'],
  cobranza:          ['wms', 'tasks'],
  transporte:        ['tms', 'tasks', 'parcel'],
}

export const WMS_ROLES: UserRole[]     = ['admin', 'servicio_cliente', 'cobranza']
export const TMS_ROLES: UserRole[]     = ['admin', 'transporte']
export const ALMACEN_ROLES: UserRole[] = ['admin', 'almacen', 'servicio_cliente']
export const TASK_ROLES: UserRole[]    = ['admin', 'almacen', 'servicio_cliente', 'cobranza', 'transporte']
// PARCEL_ROLES: el TMS de paquetería vive bajo /tms/* pero SAC también
// genera y compra guías, así que lo dejamos accesible a transporte + SAC.
export const PARCEL_ROLES: UserRole[]  = ['admin', 'transporte', 'servicio_cliente']

export const MODULE_BRIEFS: Record<AppModule, { title: string; body: string; tips: string[] }> = {
  wms: {
    title: 'Herramientas WMS / SAC',
    body: 'Centraliza herramientas de Servicio al Cliente y facturación operativa: clientes, validación de SKUs, receipts, proformas, RC y documentos fiscales.',
    tips: [
      'Usa Validador SKU antes de generar documentación.',
      'Genera receipts y proformas desde datos revisados.',
      'Consulta clientes y documentos antes de pasar a cobranza.',
    ],
  },
  tms: {
    title: 'Transportes / TMS',
    body: 'Controla la operación de transporte: viajes, unidades, operadores, costos, cotizador, trámites y tablero de flota.',
    tips: [
      'Crea viajes desde el TMS y mantén estado/costos actualizados.',
      'Usa el cotizador antes de prometer tarifas al cliente.',
      'Revisa trámites y vencimientos de unidades con frecuencia.',
    ],
  },
  almacen: {
    title: 'Almacén CEDIS Lerma',
    body: 'Muestra el layout del CEDIS, ocupación, posiciones y estado operativo de la bodega para que almacén trabaje sin entrar a módulos administrativos.',
    tips: [
      'Revisa ocupación y posiciones antes de confirmar movimientos.',
      'Usa la vista de elevaciones para ubicar espacios disponibles.',
      'Reporta diferencias por Task Manager para dejar trazabilidad.',
    ],
  },
  tasks: {
    title: 'Task Manager',
    body: 'Sirve para asignar, aceptar, pausar y cerrar tareas entre áreas, con medición de tiempo y disponibilidad del equipo.',
    tips: [
      'Acepta o rechaza tareas para que el solicitante tenga visibilidad.',
      'Usa el timer cuando una tarea deba medirse para costos internos.',
      'Consulta calendario y plantillas para trabajo recurrente.',
    ],
  },
  parcel: {
    title: 'TMS Guías de Paquetería',
    body: 'Cotiza con todas las paqueterías al mismo tiempo (Estafeta, UPS, FedEx, DHL, Castores), elige automáticamente la mejor por costo + distancia + tiempo, y compra la etiqueta sin salir del sistema.',
    tips: [
      'Auto-pick recomienda el carrier más conveniente; puedes overridear con justificación.',
      'Configura reglas para forzar carriers según distancia y costo.',
      'En modo demo los rates son simulados — registra credenciales en Configurar carriers para activar APIs reales.',
    ],
  },
}

export function canAccessModule(role: UserRole | undefined, module: AppModule) {
  return Boolean(role && MODULE_ACCESS[role]?.includes(module))
}

export function getModulesForRole(role: UserRole | undefined): AppModule[] {
  return role ? MODULE_ACCESS[role] ?? [] : []
}

export function moduleFromPath(path: string): AppModule | null {
  if (path === '/almacen') return 'almacen'
  if (path.startsWith('/tasks') || path.startsWith('/admin')) return 'tasks'
  // TMS de Paqueterías es un módulo separado aunque sus URLs vivan bajo /tms/*
  if (
    path === '/parcel' ||
    path.startsWith('/parcel') ||
    path === '/tms/guias-paqueteria' ||
    path.startsWith('/tms/guias-paqueteria/') ||
    path === '/tms/parcel-map' ||
    path === '/tms/parcel-dashboard' ||
    path === '/tms/carriers' ||
    path.startsWith('/tms/carriers/')
  ) return 'parcel'
  if (path.startsWith('/tms') || path === '/cotizador' || path === '/tramites') return 'tms'
  if (
    path.startsWith('/wms') ||
    path.startsWith('/sac') ||
    path === '/rc' ||
    path === '/proformas' ||
    path === '/tarifarios' ||
    path === '/servicios' ||
    path === '/seko-billing' ||
    path.startsWith('/clients')
  ) return 'wms'
  return null
}

// Overrides por path específico cuando la regla "rol ⊂ módulo" no aplica.
// Útil para casos cross-módulo como Guías de paquetería: vive bajo /tms/* pero
// SAC también necesita entrar.
const PATH_ROLE_OVERRIDES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/tms/guias-paqueteria', roles: PARCEL_ROLES },
  { prefix: '/tms/parcel-map',       roles: PARCEL_ROLES },
  { prefix: '/tms/parcel-dashboard', roles: PARCEL_ROLES },
  // /tms/carriers (config de credenciales) y /tms/carriers/reglas (routing)
  // son admin-only — credenciales sensibles + reglas que afectan a todos.
  { prefix: '/tms/carriers',         roles: ['admin'] },
]

export function canAccessPath(role: UserRole | undefined, path: string) {
  for (const { prefix, roles } of PATH_ROLE_OVERRIDES) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      return Boolean(role && roles.includes(role))
    }
  }
  const module = moduleFromPath(path)
  return module ? canAccessModule(role, module) : true
}

export function defaultRouteForRole(role: UserRole | undefined) {
  const first = getModulesForRole(role)[0]
  if (first === 'wms') return '/wms'
  if (first === 'tms') return '/tms'
  if (first === 'almacen') return '/almacen'
  if (first === 'tasks') return '/tasks'
  if (first === 'parcel') return '/tms/guias-paqueteria'
  return '/'
}
