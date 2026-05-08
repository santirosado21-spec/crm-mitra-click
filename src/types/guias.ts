// Tipos para módulo TMS · Guías de paquetería

export type Paqueteria = 'estafeta' | 'ups' | 'fedex' | 'dhl' | 'castores'
export type GuiaOrigen = 'extensiv' | 'manual'
export type GuiaExtensivType = 'order' | 'receipt'

export type CarrierProvider =
  | 'manual' | 'easypost' | 'skydropx'
  | 'direct_dhl' | 'direct_ups' | 'direct_fedex' | 'direct_estafeta'

export type LabelFormat = 'pdf' | 'zpl'

export type TrackingStatus =
  | 'cotizado' | 'comprado' | 'en_transito' | 'entregado' | 'excepcion' | 'devuelto'

/** Cotización snapshot guardada en rate_quotes JSONB para auditoría. */
export interface RateQuote {
  carrier:         Paqueteria | string
  service:         string
  price_mxn:       number
  delivery_days:   number
  is_local:        boolean
  provider:        CarrierProvider
  provider_rate_id: string
  raw?:            unknown
}

export interface RouteStop {
  cp: string
  label?: string
}

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

  // ── Campos TMS de paqueterías (rate shopping + auto-pick) ──
  from_postal_code?:    string | null
  to_postal_code?:      string | null
  route_stops?:         RouteStop[] | null
  to_country?:          string | null      // 'MX' por default
  weight_kg?:           number | null
  length_cm?:           number | null
  width_cm?:            number | null
  height_cm?:           number | null
  is_local?:            boolean | null

  rate_quotes?:         RateQuote[]        // snapshot al momento del auto-pick
  auto_pick_carrier?:   string | null
  auto_pick_service?:   string | null
  auto_pick_score?:     number | null
  auto_pick_reasoning?: string | null

  override_reason?:     string | null      // NULL si SAC aceptó el auto-pick
  override_by?:         string | null

  label_url?:           string | null
  label_format?:        LabelFormat | null
  provider?:            CarrierProvider | null
  provider_shipment_id?: string | null
  provider_rate_id?:    string | null
  tracking_status?:     TrackingStatus | null
}

export type CreateGuiaData = Omit<GuiaPaqueteria, 'id' | 'margen' | 'created_at' | 'updated_at'>
export type UpdateGuiaData = Partial<CreateGuiaData>

export interface GuiaFilters {
  clienteId?:      string
  paqueteria?:     Paqueteria | ''
  origen?:         GuiaOrigen | ''
  provider?:       CarrierProvider | ''
  trackingStatus?: TrackingStatus | ''
  isLocal?:        'local' | 'intl' | ''
  fechaDesde?:     string
  fechaHasta?:     string
  search?:         string                                          // tracking #, manual_reference o cliente
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
