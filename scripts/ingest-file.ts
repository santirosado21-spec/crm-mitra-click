// Carga un archivo CSV (p. ej. exportado de Excel) o JSON a Supabase.
//
//   npm run data:ingest -- --fuente erp --entidad pedidos --archivo ./exportes/pedidos.csv
//
// CSV: encabezados en la primera fila con los nombres del contrato (docs/ERP_DATA_CONTRACT.md);
//      "Folio Pedido" o "Categoría" se normalizan solos. Separador: coma, punto y coma o tab.
// JSON: arreglo de filas, o { "filas": [...] }. Para pedidos/órdenes admite "lineas" anidadas.

import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { parseCsv } from '../supabase/functions/ingest/csv'
import { ingest, loadConfig, printSummary } from './lib/ingest-client'

const { values } = parseArgs({
  options: {
    fuente: { type: 'string', default: 'erp' },
    entidad: { type: 'string' },
    archivo: { type: 'string' },
  },
})

async function main() {
  if (!values.entidad || !values.archivo) {
    throw new Error('Uso: npm run data:ingest -- --fuente erp --entidad pedidos --archivo ruta.csv')
  }
  const text = await readFile(values.archivo, 'utf8')
  let rows: unknown[]
  if (values.archivo.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text) as unknown
    rows = Array.isArray(parsed) ? parsed : ((parsed as { filas?: unknown[] }).filas ?? [])
  } else {
    rows = parseCsv(text)
  }
  if (!rows.length) throw new Error(`El archivo ${values.archivo} no tiene filas.`)

  console.log(`Cargando ${rows.length} filas de "${values.entidad}" (fuente ${values.fuente})…`)
  const summary = await ingest(loadConfig(), values.fuente ?? 'erp', values.entidad, rows, `archivo:${values.archivo.split('/').pop()}`)
  printSummary(summary)
  if (summary.estado === 'fallido') process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
