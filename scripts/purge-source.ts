// Borra en Supabase todos los datos de una fuente (por defecto `demo`).
//
//   npm run data:purge-demo
//   npm run data:purge -- --fuente erp --confirmar "BORRAR erp"
//
// Usa la función public.purge_source vía la API REST. Requiere una llave secreta de
// Supabase (sb_secret_…) en MITRA_INGEST_KEY; la llave propia de ingest no alcanza.

import { parseArgs } from 'node:util'
import { authHeaders, loadConfig } from './lib/ingest-client'

const { values } = parseArgs({
  options: {
    fuente: { type: 'string', default: 'demo' },
    confirmar: { type: 'string' },
  },
})

async function main() {
  const { key } = loadConfig()
  const base = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) throw new Error('Falta VITE_SUPABASE_URL en .env.local.')
  if (!('apikey' in authHeaders(key))) throw new Error('Para borrar se necesita una llave secreta de Supabase (sb_secret_…) en MITRA_INGEST_KEY.')

  const response = await fetch(`${base}/rest/v1/rpc/purge_source`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ p_source: values.fuente, p_confirmation: values.confirmar ?? null }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((body as { message?: string }).message ?? `HTTP ${response.status}`)
  console.log(`Borrado de la fuente "${values.fuente}":`, body)
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
