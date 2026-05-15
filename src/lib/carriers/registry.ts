// Registry de providers — devuelve los CarrierProviderClient activos según la
// tabla carrier_credentials. Si ninguno está configurado, devuelve [mock] por
// default para que el sistema sea funcional desde el primer día (modo demo).
//
// Providers conectados:
// - skydropx (aggregator: Estafeta, FedEx, DHL, UPS, Castores, Paquetexpress)
// - manual (mock para modo demo)
//
// EasyPost queda pendiente — agregar import y entry en clientFor() cuando llegue.

import { supabase } from '../supabase'
import type { CarrierProviderClient } from './types'
import { mockProvider } from './mock'
import { skydropxProvider } from './skydropx'
import { fedexProvider } from './fedex'

interface CarrierCredentialRow {
  provider:    string
  active:      boolean
  test_mode:   boolean
  api_key:     string | null
}

/** Cliente para un provider específico. */
function clientFor(provider: string): CarrierProviderClient | null {
  if (provider === 'skydropx')    return skydropxProvider
  if (provider === 'direct_fedex') return fedexProvider
  // TODO conectar EasyPost cuando lleguen credenciales:
  // if (provider === 'easypost') return easypostProvider
  return null
}

export interface ActiveProvidersResult {
  clients:  CarrierProviderClient[]
  isMockOnly: boolean
}

export async function getActiveProviders(): Promise<ActiveProvidersResult> {
  const { data, error } = await supabase
    .from('carrier_credentials')
    .select('provider, active, test_mode, api_key')
    .eq('active', true)
  // Si la tabla no existe aún (migración no aplicada) o la query falla,
  // caemos a mock-only sin romper la UI.
  if (error || !data) {
    return { clients: [mockProvider], isMockOnly: true }
  }
  const rows = data as CarrierCredentialRow[]
  const real = rows
    // direct_fedex autentica vía secrets del edge function fedex-proxy, así que
    // no requiere api_key en la fila — basta con que esté activo.
    .filter(r => r.provider !== 'manual' && (r.api_key || r.provider === 'direct_fedex'))
    .map(r => clientFor(r.provider))
    .filter((c): c is CarrierProviderClient => !!c)
  if (real.length === 0) {
    return { clients: [mockProvider], isMockOnly: true }
  }
  // Cuando hay reales, agregamos mock al final solo para fallback en testing.
  return { clients: [...real, mockProvider], isMockOnly: false }
}
