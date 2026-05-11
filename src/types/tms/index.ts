// ── TMS Types ─────────────────────────────────────────────────────────────

export type ViajeEstado = 'pendiente' | 'asignado' | 'en_transito' | 'entregado' | 'completado' | 'cancelado'

export type CombustibleTipo = 'Diesel' | 'Gasolina'

export interface Vehiculo {
  id: string
  clave: string
  placa: string
  modelo: string
  tipo: string
  combustible: CombustibleTipo
  rendimiento: number
  depreciacion: number
  es_propio: boolean
  proveedor_nombre: string | null
  motive_vehicle_id: string | null
  año: number | null
  vin: string | null
  color: string
  capacidad_kg: number
  activo: boolean
  notas: string
  created_at: string
  updated_at: string
}

export interface Operador {
  id: string
  nombre: string
  telefono: string
  email: string
  licencia_tipo: string
  licencia_numero: string
  licencia_vigencia: string | null
  es_propio: boolean
  proveedor_nombre: string | null
  motive_user_id: string | null
  sueldo_diario: number
  activo: boolean
  notas: string
  created_at: string
  updated_at: string
}

export interface Viaje {
  id: string
  operacion_id: string | null
  vehiculo_id: string | null
  operador_id: string | null
  proveedor_nombre: string | null
  origen: string
  destino: string
  km_estimados: number
  km_reales: number
  estado: ViajeEstado
  fecha_programada: string | null
  fecha_salida: string | null
  fecha_llegada: string | null
  fecha_completado: string | null
  costo_combustible: number
  costo_casetas: number
  costo_viaticos: number
  costo_proveedor: number
  costo_total: number
  ingreso_cliente: number
  margen: number
  motive_dispatch_id: string | null
  motive_status: string
  notas: string
  creado_por: string
  created_at: string
  updated_at: string
  // Joined fields (from queries)
  vehiculo_placa?: string
  vehiculo_modelo?: string
  operador_nombre?: string
  operacion_referencia?: string
}
