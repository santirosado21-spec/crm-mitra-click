// Registry de providers — devuelve los CarrierProviderClient activos según la
// tabla carrier_credentials. Si ninguno está configurado, devuelve [mock] por
// default para que el sistema sea funcional desde el primer día (modo demo).
//
// Cuando lleguen las credenciales reales, simplemente registrar `easypost.ts`
// y `skydropx.ts` debajo y actualizar `clientFor()` para devolverlos.

import { supabase } from '../supabase'
import type { CarrierProviderClient } from './types'
import { mockProvider } from './mock'

interface CarrierCredentialRow {
  provider:    string
  active:      boolean
  test_mode:   boolean
  api_key:     string | null
}

/** Cliente para un provider específico (cuando exista la implementación). */
function clientFor(_provider: string): CarrierProviderClient | null {
  // TODO cuando lleguen las APIs reales:
  // if (provider === 'easypost') return easypostProvider
  // if (provider === 'skydropx') return skydropxProvider
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
    .filter(r => r.api_key && r.provider !== 'manual')
    .map(r => clientFor(r.provider))
    .filter((c): c is CarrierProviderClient => !!c)
  if (real.length === 0) {
    return { clients: [mockProvider], isMockOnly: true }
  }
  // Cuando hay reales, agregamos mock al final solo para fallback en testing.
  return { clients: [...real, mockProvider], isMockOnly: false }
}
