// Finalización de manifiestos por carrier.
//
//   skydropx → POST /v1/manifests (cuando hay credenciales activas)
//   fedex    → stub: FedEx genera el manifiesto vía ground close (Fase 7)
//   otros    → PDF local generado con jsPDF
//
// Devuelve la URL del PDF/manifiesto y el id del provider si aplica.

import { supabase } from '../supabase'
import { generateManifestPDF, type ManifestGuiaLine } from './manifestPdf'

export interface FinalizeManifestInput {
  folio:    string
  carrier:  string
  provider: string
  fecha:    string
  guias:    ManifestGuiaLine[]
  trackingNumbers: string[]
}

export interface FinalizeManifestResult {
  pdf_url:              string | null
  provider_manifest_id: string | null
  source:               'skydropx' | 'fedex' | 'local'
  note?:                string
}

async function loadSkydropxKey(): Promise<{ api_key: string; test_mode: boolean } | null> {
  const { data } = await supabase
    .from('carrier_credentials')
    .select('api_key, test_mode')
    .eq('provider', 'skydropx')
    .eq('active', true)
    .maybeSingle()
  if (!data?.api_key) return null
  return data as { api_key: string; test_mode: boolean }
}

export async function finalizeManifest(input: FinalizeManifestInput): Promise<FinalizeManifestResult> {
  // PDF local siempre se genera — sirve como respaldo imprimible.
  const localPdf = generateManifestPDF({
    folio: input.folio, carrier: input.carrier, fecha: input.fecha, guias: input.guias,
  })

  // Skydropx: intenta crear el manifiesto remoto.
  if (input.provider === 'skydropx') {
    const cred = await loadSkydropxKey()
    if (cred) {
      try {
        const res = await fetch('https://pro.skydropx.com/api/v1/manifests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token token=${cred.api_key}`,
          },
          body: JSON.stringify({
            carrier: input.carrier,
            tracking_numbers: input.trackingNumbers,
          }),
        })
        if (res.ok) {
          const json = await res.json() as { data?: { id?: string; attributes?: { manifest_url?: string } } }
          return {
            pdf_url: json?.data?.attributes?.manifest_url ?? localPdf,
            provider_manifest_id: json?.data?.id ?? null,
            source: 'skydropx',
          }
        }
        return { pdf_url: localPdf, provider_manifest_id: null, source: 'local',
                 note: `Skydropx respondió ${res.status}; se usó PDF local.` }
      } catch (e) {
        return { pdf_url: localPdf, provider_manifest_id: null, source: 'local',
                 note: `Error Skydropx: ${e instanceof Error ? e.message : 'desconocido'}` }
      }
    }
  }

  // FedEx: el cierre de manifiesto (ground close) se implementa en Fase 7.
  if (input.provider === 'direct_fedex') {
    return { pdf_url: localPdf, provider_manifest_id: null, source: 'fedex',
             note: 'FedEx ground close pendiente (Fase 7); se usó PDF local.' }
  }

  // Resto de carriers: PDF local.
  return { pdf_url: localPdf, provider_manifest_id: null, source: 'local' }
}
