// FedEx REST provider — conexión directa vía el edge function fedex-proxy.
//
// El proxy maneja OAuth2 y oculta el accountNumber (secreto). Este cliente solo
// arma los payloads de FedEx y normaliza las respuestas a Rate / Label.
//
// Endpoints FedEx:
//   rates → /rate/v1/rates/quotes
//   ship  → /ship/v1/shipments
//   track → /track/v1/trackingnumbers

import type { CarrierProviderClient, RateInput, Rate, Label, Address, ParcelDimensions } from './types'
import type { CarrierProvider } from '../../types/guias'
import { supabase } from '../supabase'

const PROVIDER_NAME: CarrierProvider = 'direct_fedex'
const RATE_ID_PREFIX = 'fdx_'

async function callProxy<T = unknown>(action: string, payload?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('fedex-proxy', {
    body: { action, payload },
  })
  if (error) throw new Error(`fedex-proxy ${action}: ${error.message}`)
  return data as T
}

function fedexAddress(a: Address) {
  return {
    address: {
      streetLines:        [a.street1, a.street2].filter(Boolean),
      city:               a.city,
      stateOrProvinceCode: a.state,
      postalCode:         a.postal_code,
      countryCode:        a.country,
      residential:        false,
    },
  }
}

function fedexParcel(p: ParcelDimensions) {
  return [{
    weight:     { units: 'KG', value: p.weight_kg },
    dimensions: { length: p.length_cm, width: p.width_cm, height: p.height_cm, units: 'CM' },
  }]
}

interface FedexRateReply {
  output?: {
    rateReplyDetails?: Array<{
      serviceType?:  string
      serviceName?:  string
      ratedShipmentDetails?: Array<{
        totalNetCharge?: number
        currency?:       string
      }>
      operationalDetail?: { transitTime?: string }
      commit?: { dateDetail?: { dayFormat?: string } }
    }>
  }
}

interface FedexShipReply {
  output?: {
    transactionShipments?: Array<{
      masterTrackingNumber?: string
      pieceResponses?: Array<{
        trackingNumber?: string
        packageDocuments?: Array<{ url?: string }>
        netRateAmount?:   number
      }>
    }>
  }
}

export interface TrackingEvent {
  status:        string
  description:   string
  location:      string
  occurred_at:   string | null
}

interface FedexTrackReply {
  output?: {
    completeTrackResults?: Array<{
      trackResults?: Array<{
        latestStatusDetail?: { statusByLocale?: string; description?: string }
        scanEvents?: Array<{
          eventDescription?: string
          date?:            string
          scanLocation?:    { city?: string; countryCode?: string }
        }>
      }>
    }>
  }
}

// Días de tránsito aproximados según transitTime de FedEx (texto tipo "TWO_DAYS").
const TRANSIT_DAYS: Record<string, number> = {
  ONE_DAY: 1, TWO_DAYS: 2, THREE_DAYS: 3, FOUR_DAYS: 4, FIVE_DAYS: 5,
  SIX_DAYS: 6, SEVEN_DAYS: 7,
}

export const fedexProvider: CarrierProviderClient = {
  name: PROVIDER_NAME,

  async isAvailable(): Promise<boolean> {
    try {
      const res = await callProxy<{ ok?: boolean }>('auth')
      return res?.ok === true
    } catch {
      return false
    }
  },

  async getRates(input: RateInput): Promise<Rate[]> {
    try {
      const reply = await callProxy<FedexRateReply>('rates', {
        requestedShipment: {
          shipper:    fedexAddress(input.from),
          recipient:  fedexAddress(input.to),
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          rateRequestType: ['ACCOUNT', 'LIST'],
          requestedPackageLineItems: fedexParcel(input.parcel),
        },
      })
      const details = reply?.output?.rateReplyDetails ?? []
      return details.flatMap((d, idx) => {
        // FedEx puede devolver varios ratedShipmentDetails (ACCOUNT, LIST) en
        // distintas monedas. price_mxn solo es válido si la tarifa está en MXN,
        // así que se prefiere el detalle denominado en MXN.
        const rated = d.ratedShipmentDetails ?? []
        const picked = rated.find(r => r.currency === 'MXN') ?? rated[0]
        const currency = picked?.currency ?? 'MXN'
        // Sin un detalle en MXN no se puede comparar el precio — se descarta la
        // tarifa en vez de mostrarla con un price_mxn engañoso (USD ≠ MXN).
        if (currency !== 'MXN') {
          console.warn(`[fedex] descartando tarifa ${d.serviceType ?? idx}: sin detalle en MXN (moneda: ${currency})`)
          return []
        }
        const charge = picked?.totalNetCharge ?? 0
        const transit = d.operationalDetail?.transitTime ?? ''
        return [{
          rate_id:       `${RATE_ID_PREFIX}${d.serviceType ?? idx}`,
          provider:      PROVIDER_NAME,
          carrier:       'fedex',
          carrier_label: 'FedEx',
          service:       d.serviceType ?? 'FEDEX',
          service_label: d.serviceName ?? d.serviceType ?? 'FedEx',
          price_mxn:     Math.round(charge),
          delivery_days: TRANSIT_DAYS[transit] ?? 3,
          currency,
          is_local:      input.from.country === input.to.country,
          raw:           d,
        }]
      })
    } catch (e) {
      console.error('[fedex] getRates error:', e)
      return []
    }
  },

  async buyLabel(rateId: string, shipment?: RateInput): Promise<Label> {
    if (!shipment) throw new Error('FedEx buyLabel requiere los datos del envío (RateInput)')
    const serviceType = rateId.startsWith(RATE_ID_PREFIX) ? rateId.slice(RATE_ID_PREFIX.length) : rateId
    const reply = await callProxy<FedexShipReply>('ship', {
      labelResponseOptions: 'URL_ONLY',
      requestedShipment: {
        shipper:   fedexAddress(shipment.from),
        recipients: [fedexAddress(shipment.to)],
        shipDatestamp: new Date().toISOString().slice(0, 10),
        serviceType,
        packagingType: 'YOUR_PACKAGING',
        pickupType:    'DROPOFF_AT_FEDEX_LOCATION',
        labelSpecification: { imageType: 'PDF', labelStockType: 'PAPER_4X6' },
        requestedPackageLineItems: fedexParcel(shipment.parcel),
      },
    })
    const ts = reply?.output?.transactionShipments?.[0]
    const piece = ts?.pieceResponses?.[0]
    const tracking = piece?.trackingNumber ?? ts?.masterTrackingNumber ?? ''
    return {
      rate_id:       rateId,
      provider:      PROVIDER_NAME,
      tracking_code: tracking,
      label_url:     piece?.packageDocuments?.[0]?.url ?? '',
      label_format:  'pdf',
      carrier:       'fedex',
      service:       serviceType,
      cost_mxn:      Math.round(piece?.netRateAmount ?? 0),
      provider_shipment_id: ts?.masterTrackingNumber ?? tracking,
      raw:           reply,
    }
  },
}

/** Consulta el historial de tracking de una guía FedEx. */
export async function getFedexTrackingEvents(trackingNumber: string): Promise<TrackingEvent[]> {
  try {
    const reply = await callProxy<FedexTrackReply>('track', {
      includeDetailedScans: true,
      trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
    })
    const result = reply?.output?.completeTrackResults?.[0]?.trackResults?.[0]
    const scans = result?.scanEvents ?? []
    return scans.map(s => ({
      status:      result?.latestStatusDetail?.statusByLocale ?? '',
      description: s.eventDescription ?? '',
      location:    [s.scanLocation?.city, s.scanLocation?.countryCode].filter(Boolean).join(', '),
      occurred_at: s.date ?? null,
    }))
  } catch (e) {
    console.error('[fedex] getTrackingEvents error:', e)
    return []
  }
}
