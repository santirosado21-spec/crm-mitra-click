// Tipos para módulo SAC · Guías de paquetería

export type Paqueteria = 'estafeta' | 'ups' | 'fedex' | 'dhl' | 'castores'
export type GuiaOrigen = 'extensiv' | 'manual'
export type GuiaExtensivType = 'order' | 'receipt'

export interface GuiaPaqueteria {
  id:                          string
  paqueteria:                  Paqueteria
  tracking_number:             string
  cliente_id:                  string
  cliente_codigo:              string | null
  costo:                       number
  precio:                      number
  margen:                      number
  fecha:                       string                              // YYYY-MM-DD
  origen:                      GuiaOrigen
  extensiv_transaction_type:   GuiaExtensivType | null
  extensiv_transaction_id:     string | null
  extensiv_customer_id:        number | null
  manual_reference:            string | null
  notas:                       string
  creado_por:                  string | null
  created_at:                  string
  updated_at:                  string
}

export type CreateGuiaData = Omit<GuiaPaqueteria, 'id' | 'margen' | 'created_at' | 'updated_at'>
export type UpdateGuiaData = Partial<CreateGuiaData>

export interface GuiaFilters {
  clienteId?:    string
  paqueteria?:   Paqueteria | ''
  origen?:       GuiaOrigen | ''
  fechaDesde?:   string
  fechaHasta?:   string
  search?:       string                                            // tracking #, manual_reference o cliente
}

export const PAQUETERIA_LABEL: Record<Paqueteria, string> = {
  estafeta: 'Estafeta',
  ups:      'UPS',
  fedex:    'FedEx',
  dhl:      'DHL',
  castores: 'Castores',
}

export const PAQUETERIA_COLOR: Record<Paqueteria, string> = {
  estafeta: '#dc3545',     // rojo Estafeta
  ups:      '#7c3aed',     // morado UPS (brand: marrón #351c15, pero aquí morado para legibilidad)
  fedex:    '#4d148c',     // morado FedEx
  dhl:      '#ffcc00',     // amarillo DHL
  castores: '#1e3a5f',     // azul institucional
}
