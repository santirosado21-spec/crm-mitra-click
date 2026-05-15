// Mock provider — genera rates simulados realistas basados en peso + distancia.
// Activo en modo demo cuando no hay credenciales reales registradas.
//
// Fórmulas calibradas para verse plausibles (no son tarifas reales):
//   Estafeta SDS:           60  + peso×30  + distancia×0.45    · ETA 2d · local
//   Estafeta Día Siguiente: 120 + peso×40  + distancia×0.65    · ETA 1d · local
//   Castores Terrestre:      90 + peso×35  + distancia×0.50    · ETA 4d · local (>100 km)
//   UPS Express:            380 + peso×85  + distancia×0.95    · ETA 3d · local|intl
//   FedEx Standard:         320 + peso×80  + distancia×0.90    · ETA 4d · local|intl
//   DHL Express:            440 + peso×95  + distancia×1.10    · ETA 2d · local|intl

import type { CarrierProviderClient, RateInput, Rate, Label } from './types'
import { distanceBetweenCPs } from '../postal/distance'

interface MockServiceTpl {
  carrier:        string
  carrier_label:  string
  service:        string
  service_label:  string
  base_mxn:       number
  weight_factor:  number
  distance_factor: number
  delivery_days:  number
  intlOnly?:      boolean
  /** Solo se ofrece si distancia >= km. */
  minDistanceKm?: number
  /** Si true, este servicio NO sirve para envíos internacionales. */
  domesticOnly?:  boolean
}

const SERVICES: MockServiceTpl[] = [
  { carrier: 'estafeta', carrier_label: 'Estafeta', service: 'SDS',          service_label: 'Servicio Día Siguiente', base_mxn: 120, weight_factor: 40, distance_factor: 0.65, delivery_days: 1, domesticOnly: true },
  { carrier: 'estafeta', carrier_label: 'Estafeta', service: 'TERRESTRE',    service_label: 'Terrestre',              base_mxn:  60, weight_factor: 30, distance_factor: 0.45, delivery_days: 2, domesticOnly: true },
  { carrier: 'castores', carrier_label: 'Castores', service: 'TERRESTRE',    service_label: 'Terrestre LTL',          base_mxn:  90, weight_factor: 35, distance_factor: 0.50, delivery_days: 4, domesticOnly: true, minDistanceKm: 100 },
  { carrier: 'ups',      carrier_label: 'UPS',      service: 'EXPRESS',      service_label: 'UPS Express',            base_mxn: 380, weight_factor: 85, distance_factor: 0.95, delivery_days: 3 },
  { carrier: 'fedex',    carrier_label: 'FedEx',    service: 'STANDARD',     service_label: 'FedEx Standard Overnight', base_mxn: 320, weight_factor: 80, distance_factor: 0.90, delivery_days: 4 },
  { carrier: 'dhl',      carrier_label: 'DHL',      service: 'EXPRESS_WW',   service_label: 'DHL Express Worldwide',  base_mxn: 440, weight_factor: 95, distance_factor: 1.10, delivery_days: 2 },
]

const DEFAULT_INTL_DISTANCE_KM = 1500

function inferDistanceKm(input: RateInput, fallbackKm: number): Promise<number> {
  // País destino diferente a origen → usamos un valor "internacional" (1500 km
  // promedio MX↔US como heurística).
  if (input.from.country !== input.to.country) return Promise.resolve(DEFAULT_INTL_DISTANCE_KM)
  return distanceBetweenCPs(input.from.postal_code, input.to.postal_code).then(d => d ?? fallbackKm)
}

export const mockProvider: CarrierProviderClient = {
  name: 'manual',     // se reporta como 'manual' a nivel DB para que las filas creadas en demo
                      // sean fácilmente filtrables. La UI muestra "mock" en banner.

  async isAvailable() {
    return true
  },

  async getRates(input: RateInput): Promise<Rate[]> {
    const isIntl = input.from.country !== input.to.country
    const distanceKm = await inferDistanceKm(input, 200)
    const weight = Math.max(0.1, input.parcel.weight_kg)

    const rates: Rate[] = []
    for (const svc of SERVICES) {
      if (isIntl && svc.domesticOnly) continue
      if (svc.minDistanceKm && distanceKm < svc.minDistanceKm) continue
      const price = Math.round(svc.base_mxn + weight * svc.weight_factor + distanceKm * svc.distance_factor)
      const isLocal = svc.domesticOnly === true
        ? true
        : !isIntl
      const rateId = `mock_${svc.carrier}_${svc.service}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      rates.push({
        rate_id:       rateId,
        provider:      'manual',
        carrier:       svc.carrier,
        carrier_label: svc.carrier_label,
        service:       svc.service,
        service_label: svc.service_label,
        price_mxn:     price,
        delivery_days: svc.delivery_days,
        currency:      'MXN',
        is_local:      isLocal,
        raw: { mock: true, distanceKm, weightKg: weight },
      })
    }
    return rates
  },

  async buyLabel(rateId: string, _shipment?: RateInput): Promise<Label> {
    void _shipment
    // En modo mock no hay carrier real; devolvemos un Label sintético. El
    // tracking se genera en la página al registrar el shipment.
    const tracking = `MOCK${Date.now().toString().slice(-8)}`
    return {
      rate_id:        rateId,
      provider:       'manual',
      tracking_code:  tracking,
      label_url:      '',          // la página llena este campo con un Blob URL del PDF generado vía jsPDF
      label_format:   'pdf',
      carrier:        'mock',
      service:        'mock',
      cost_mxn:       0,
      provider_shipment_id: tracking,
      raw: { mock: true },
    }
  },
}
