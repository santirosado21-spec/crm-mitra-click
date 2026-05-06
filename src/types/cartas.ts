// Tipos para módulo SAC ↔ TMS · Cartas de instrucción

export type CartaStatus = 'borrador' | 'enviada' | 'procesada' | 'cancelada'

export interface CartaMercancia {
  descripcion: string
  sku:         string
  cantidad:    string
  empaque:     string
  peso:        string
  valor:       string
}

export interface CartaInstruccion {
  id:                  string
  folio:               string
  fecha:               string
  status:              CartaStatus

  cliente_id:          string | null
  cliente_nombre:      string
  referencia:          string | null
  orden_compra:        string | null
  tipo_servicio:       string | null

  origen:              string | null
  origen_direccion:    string | null
  destino:             string
  destino_direccion:   string
  fecha_carga:         string | null
  hora_carga:          string | null
  fecha_entrega:       string | null
  hora_entrega:        string | null
  contacto_carga:      string | null
  contacto_entrega:    string | null

  unidad_sugerida:     string | null
  operador_sugerido:   string | null
  placas_sugeridas:    string | null
  maniobras:           string | null
  sellos:              string | null

  documentos:          string | null
  instrucciones:       string | null
  seguridad:           string | null

  mercancias:          CartaMercancia[]
  total_bultos:        number
  total_peso_kg:       number

  enviada_por:         string | null
  enviada_at:          string | null
  procesada_por:       string | null
  procesada_at:        string | null
  carta_porte_id:      string | null

  notas:               string
  created_at:          string
  updated_at:          string
}

export type CreateCartaData = Omit<CartaInstruccion, 'id' | 'created_at' | 'updated_at'>
export type UpdateCartaData = Partial<CreateCartaData>

export interface CartaFilters {
  status?:     CartaStatus | ''
  clienteId?:  string
  search?:     string
  fechaDesde?: string
  fechaHasta?: string
}

export const STATUS_LABEL: Record<CartaStatus, string> = {
  borrador:  'Borrador',
  enviada:   'Enviada',
  procesada: 'Procesada',
  cancelada: 'Cancelada',
}

export const STATUS_COLOR: Record<CartaStatus, string> = {
  borrador:  '#94a3b8',
  enviada:   '#1e3a5f',
  procesada: '#28a745',
  cancelada: '#94a3b8',
}
