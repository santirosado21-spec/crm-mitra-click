// Capa de abstracción para proveedores de paquetería.
// Permite swap futuro entre agregadores (EasyPost/Skydropx) y conexiones
// directas (DHL/UPS/FedEx/Estafeta) sin tocar la UI ni el motor de auto-pick.

import type { CarrierProvider } from '../../types/guias'

export interface Address {
  name:        string
  company?:    string
  street1:     string
  street2?:    string
  city:        string
  state:       string
  postal_code: string
  country:     string                  // ISO 3166-1 alfa-2 ('MX', 'US', ...)
  phone?:      string
  email?:      string
}

export interface ParcelDimensions {
  weight_kg: number
  length_cm: number
  width_cm:  number
  height_cm: number
}

export interface RateInput {
  from:    Address
  to:      Address
  parcel:  ParcelDimensions
  /** Servicio mínimo aceptable (Express|Ground|Economy). Si null, todos. */
  minServiceLevel?: 'express' | 'ground' | 'economy' | null
}

/** Resultado normalizado de una cotización, comparable entre providers. */
export interface Rate {
  rate_id:         string                // ID del provider para comprar después
  provider:        CarrierProvider
  carrier:         string                // 'estafeta'|'dhl'|'ups'|'fedex'|...
  carrier_label:   string                // 'Estafeta', 'DHL Express', ...
  service:         string                // 'SDS', 'Ground', 'Express Saver'...
  service_label:   string                // legible para humanos
  price_mxn:       number                // precio final en MXN (con markup si aplica)
  base_cost_mxn?:  number                // costo del carrier antes de markup
  delivery_days:   number                // ETA estimado en días
  currency:        string                // 'MXN' por default
  is_local:        boolean               // true si es carrier nacional MX
  raw?:            unknown               // payload original del provider
}

export interface Label {
  rate_id:        string
  provider:       CarrierProvider
  tracking_code:  string
  label_url:      string
  label_format:   'pdf' | 'zpl'
  carrier:        string
  service:        string
  cost_mxn:       number
  /** ID del shipment en el provider (para manifiestos y tracking). */
  provider_shipment_id?: string
  raw?:           unknown
}

/** Interface uniforme que cada provider implementa. */
export interface CarrierProviderClient {
  /** Identificador del provider en la tabla carrier_credentials. */
  name:           CarrierProvider
  /** True si está configurado con credenciales válidas. */
  isAvailable():  Promise<boolean>
  /** Cotiza con todos los carriers que el provider expone. */
  getRates(input: RateInput): Promise<Rate[]>
  /**
   * Compra la etiqueta y retorna tracking + URL. El RateInput original es
   * opcional: algunos providers (Skydropx v1) lo requieren para crear el
   * shipment; otros (mock) lo ignoran.
   */
  buyLabel(rateId: string, shipment?: RateInput): Promise<Label>
}
