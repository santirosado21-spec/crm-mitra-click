// Siembra en Supabase los mismos datos simulados de la app, con fuente `demo`.
// Sirve para probar de punta a punta la carga, la RLS y el adaptador de la app
// antes de tener datos reales. Se borran con `npm run data:purge-demo`.
//
//   npm run data:seed-demo

import { generateCommercialData } from '../src/mitraclick/data/demo/generateCommercialData'
import { INGEST_ORDER, toIngestRows } from '../src/mitraclick/data/supabase/toIngestRows'
import { localTodayKey } from '../src/mitraclick/commercial/dates'
import { ingest, loadConfig, printSummary } from './lib/ingest-client'

async function main() {
  const config = loadConfig()
  const data = generateCommercialData({ asOf: localTodayKey() })
  const rows = toIngestRows(data)
  console.log(`Sembrando datos demo al ${data.asOf} en ${config.url}`)

  let failed = false
  for (const entity of INGEST_ORDER) {
    const summary = await ingest(config, 'demo', entity, rows[entity], 'seed-demo')
    printSummary(summary)
    if (summary.estado !== 'exitoso') failed = true
  }
  console.log(failed ? 'Terminó con errores: revisa las filas marcadas.' : 'Listo. Para borrarlos: npm run data:purge-demo')
  if (failed) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
