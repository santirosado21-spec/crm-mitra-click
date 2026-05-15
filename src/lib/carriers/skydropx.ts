// Skydropx provider — aggregator de paqueterías para México.
// Una sola API cubre: Estafeta, FedEx, DHL, UPS, Castores, Paquetexpress,
// 99minutos, Sendex, Redpack.
//
// Docs API v1: https://docs.skydropx.com/
// Auth: header `Authorization: Token token=<api_key>` (legacy) o Bearer (v2)
//
// Credenciales se guardan en tabla carrier_credentials (api_key + test_mode).
// La página /tms/carriers permite darlas de alta sin tocar código.

import type { CarrierProviderClient, RateInput, Rate, Label, Address, ParcelDimensions } from './types'
import type { CarrierProvider } from '../../types/guias'
import { supabase } from '../supabase'

const PROVIDER_NAME: CarrierProvider = 'skydropx'
const SANDBOX_URL = 'https://pro.skydropx.com/api/v1'
const PRODUCTION_URL = 'https://pro.skydropx.com/api/v1'

interface SkydropxCredential {
  api_key:   string
  test_mode: boolean
}

interface SkydropxQuotationRequest {
  zip_from:     string
  zip_to:       string
  parcel: {
    length:    number
    width:     number
    height:    number
    weight:    number
  }
  country_code_from?: string
  country_code_to?:   string
}

interface SkydropxRate {
  id:                 string
  provider_name:      string    // 'estafeta', 'fedex', 'dhl', ...
  service_level_name: string    // 'EXPRESS', 'GROUND', ...
  total_pricing:      string    // viene como string en API; parsear
  currency_local:     string
  days?:              number
  out_of_area_service?: boolean
}

interface SkydropxQuotationResponse {
  data?: {
    id?:         string
    attributes?: {
      rates?: SkydropxRate[]
    }
  }
  // Forma legacy: rates al toplevel
  rates?: SkydropxRate[]
}

interface SkydropxShipmentRequest {
  rate_id: string
  address_from: SkydropxAddress
  address_to:   SkydropxAddress
  parcels: Array<{ length: number; width: number; height: number; weight: number }>
}

interface SkydropxAddress {
  name:         string
  company?:     string
  street1:      string
  street2?:     string
  city:         string
  province:     string
  zip:          string
  country:      string
  phone?:       string
  email?:       string
  reference?:   string
}

interface SkydropxShipmentResponse {
  data?: {
    id?: string
    attributes?: {
      tracking_number?: string
      label_url?:       string
      total_pricing?:   string
      carrier?:         string
      service?:         string
    }
  }
  tracking_number?: string
  label_url?:       string
}

const RATE_ID_PREFIX = 'sky_'

async function loadCredential(): Promise<SkydropxCredential | null> {
  const { data, error } = await supabase
    .from('carrier_credentials')
    .select('api_key, test_mode')
    .eq('provider', PROVIDER_NAME)
    .eq('active', true)
    .maybeSingle()
  if (error || !data || !data.api_key) return null
  return data as SkydropxCredential
}

function baseUrl(testMode: boolean): string {
  return testMode ? SANDBOX_URL : PRODUCTION_URL
}

function addressToSkydropx(a: Address): SkydropxAddress {
  return {
    name:     a.name,
    company:  a.company,
    street1:  a.street1,
    street2:  a.street2,
    city:     a.city,
    province: a.state,
    zip:      a.postal_code,
    country:  a.country,
    phone:    a.phone,
    email:    a.email,
  }
}

function parcelToSkydropx(p: ParcelDimensions) {
  return {
    length: p.length_cm,
    width:  p.width_cm,
    height: p.height_cm,
    weight: p.weight_kg,
  }
}

function isMexicanCarrier(name: string): boolean {
  const local = ['estafeta', 'castores', 'paquetexpress', 'sendex', 'redpack', '99minutos', 'noventayn']
  return local.some(l => name.toLowerCase().includes(l))
}

function readableLabel(carrier: string): string {
  const map: Record<string, string> = {
    estafeta:       'Estafeta',
    fedex:          'FedEx',
    dhl:            'DHL',
    ups:            'UPS',
    castores:       'Castores',
    paquetexpress:  'Paquetexpress',
    sendex:         'Sendex',
    redpack:        'Redpack',
    '99minutos':    '99minutos',
  }
  const key = carrier.toLowerCase().trim()
  return map[key] ?? carrier
}

function parsePrice(raw: string | number | undefined): number {
  if (raw === undefined || raw === null) return 0
  const n = typeof raw === 'string' ? parseFloat(raw) : raw
  return Number.isFinite(n) ? Math.round(n) : 0
}

async function authedFetch(url: string, apiKey: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Token token=${apiKey}`,
      ...(init.headers ?? {}),
    },
  })
}

export const skydropxProvider: CarrierProviderClient = {
  name: PROVIDER_NAME,

  async isAvailable() {
    const cred = await loadCredential()
    return !!cred
  },

  async getRates(input: RateInput): Promise<Rate[]> {
    const cred = await loadCredential()
    if (!cred) return []

    const body: SkydropxQuotationRequest = {
      zip_from:          input.from.postal_code,
      zip_to:            input.to.postal_code,
      country_code_from: input.from.country,
      country_code_to:   input.to.country,
      parcel:            parcelToSkydropx(input.parcel),
    }

    try {
      const res = await authedFetch(`${baseUrl(cred.test_mode)}/quotations`, cred.api_key, {
        method: 'POST',
        body:   JSON.stringify(body),
      })
      if (!res.ok) {
        console.warn(`[skydropx] getRates ${res.status}: ${await res.text()}`)
        return []
      }
      const json = await res.json() as SkydropxQuotationResponse
      const rates = json?.data?.attributes?.rates ?? json?.rates ?? []

      return rates.map(r => ({
        rate_id:       `${RATE_ID_PREFIX}${r.id}`,
        provider:      PROVIDER_NAME,
        carrier:       r.provider_name.toLowerCase(),
        carrier_label: readableLabel(r.provider_name),
        service:       r.service_level_name,
        service_label: `${readableLabel(r.provider_name)} ${r.service_level_name}`,
        price_mxn:     parsePrice(r.total_pricing),
        delivery_days: r.days ?? 0,
        currency:      r.currency_local || 'MXN',
        is_local:      isMexicanCarrier(r.provider_name),
        raw:           r,
      }))
    } catch (e) {
      console.error('[skydropx] getRates error:', e)
      return []
    }
  },

  async buyLabel(rateId: string, shipment?: RateInput): Promise<Label> {
    const cred = await loadCredential()
    if (!cred) throw new Error('Skydropx not configured')

    // El rate_id local viene con prefix; recortar para mandar a Skydropx.
    const upstreamRateId = rateId.startsWith(RATE_ID_PREFIX) ? rateId.slice(RATE_ID_PREFIX.length) : rateId

    // Skydropx v1 crea el shipment con rate_id + addresses + parcels. Si el
    // caller pasó el RateInput original lo incluimos; si no, mandamos solo el
    // rate_id (Skydropx lo resuelve cuando la cotización ya tenía la dirección).
    const body: Partial<SkydropxShipmentRequest> = { rate_id: upstreamRateId }
    if (shipment) {
      body.address_from = addressToSkydropx(shipment.from)
      body.address_to   = addressToSkydropx(shipment.to)
      body.parcels      = [parcelToSkydropx(shipment.parcel)]
    }

    const res = await authedFetch(`${baseUrl(cred.test_mode)}/shipments`, cred.api_key, {
      method: 'POST',
      body:   JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`Skydropx buyLabel failed ${res.status}: ${await res.text()}`)
    }
    const json = await res.json() as SkydropxShipmentResponse
    const attrs = json?.data?.attributes ?? {}

    return {
      rate_id:       rateId,
      provider:      PROVIDER_NAME,
      tracking_code: attrs.tracking_number ?? json.tracking_number ?? '',
      label_url:     attrs.label_url ?? json.label_url ?? '',
      label_format:  'pdf',
      carrier:       (attrs.carrier ?? 'skydropx').toLowerCase(),
      service:       attrs.service ?? '',
      cost_mxn:      parsePrice(attrs.total_pricing),
      provider_shipment_id: json?.data?.id ?? attrs.tracking_number ?? undefined,
      raw:           json,
    }
  },
}
