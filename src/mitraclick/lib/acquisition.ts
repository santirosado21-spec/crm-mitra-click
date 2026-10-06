// Adquisición: link corto de un código medible y lectura del CSV de Google Search Console.
// Funciones puras.

import type { CsvRow } from './csv'
import type { ImportError } from './shopifyCsv'

/** URL que se graba en la tarjeta NFC o se imprime como QR. Pasa por la función pública `go`. */
export function trackedLinkUrl(supabaseUrl: string | undefined, code: string): string {
  if (!supabaseUrl) return ''
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/go?c=${encodeURIComponent(code)}`
}

export const CHANNEL_LABEL: Record<string, string> = { nfc: 'Tarjeta NFC', qr: 'Código QR', linkedin: 'LinkedIn', redes: 'Redes sociales', email: 'Correo', seo: 'SEO', otro: 'Otro' }
export const LEAD_SOURCE_LABEL: Record<string, string> = { shopify: 'Shopify', linkedin: 'LinkedIn B2B', nfc_qr: 'NFC / QR', seo: 'SEO', redes: 'Redes sociales', referido: 'Referido', otro: 'Otro' }
export const LEAD_STATUS_LABEL: Record<string, string> = { nuevo: 'Nuevo', contactado: 'Contactado', en_conversacion: 'En conversación', calificado: 'Calificado', cotizado: 'Cotizado', ganado: 'Ganado', perdido: 'Perdido' }
export const ACTIVITY_LABEL: Record<string, string> = { solicitud: 'Solicitud de conexión', mensaje: 'Mensaje enviado', respuesta: 'Respuesta recibida', conversacion: 'Conversación', reunion: 'Reunión', nota: 'Nota' }

export interface SeoRow {
  term: string
  clicks: number
  impressions: number
  position: number | null
}

export interface SeoImport {
  dimension: 'consulta' | 'pagina' | null
  rows: SeoRow[]
  errors: ImportError[]
}

// Encabezados de la exportación de Search Console en español e inglés, ya normalizados por parseCsv.
const TERM_COLUMNS: Record<string, 'consulta' | 'pagina'> = {
  consultas_principales: 'consulta', top_queries: 'consulta', consulta: 'consulta', query: 'consulta',
  paginas_principales: 'pagina', top_pages: 'pagina', pagina: 'pagina', page: 'pagina',
}
const pick = (row: CsvRow, names: string[]) => names.map((name) => row[name]).find((value) => value !== undefined)
const toInt = (value: string | undefined) => Number((value ?? '').replace(/[,\s]/g, ''))

/** Convierte "Consultas.csv" o "Páginas.csv" de Search Console en filas para guardar. */
export function mapSearchConsoleCsv(input: CsvRow[]): SeoImport {
  const first = input[0]
  const termColumn = first ? Object.keys(first).find((column) => column in TERM_COLUMNS) : undefined
  if (!first || !termColumn || pick(first, ['clics', 'clicks']) === undefined) {
    return { dimension: null, rows: [], errors: [{ line: 1, message: 'El archivo no parece una exportación de Search Console: se esperan las columnas de consultas o páginas, clics e impresiones.' }] }
  }

  const rows: SeoRow[] = []
  const errors: ImportError[] = []
  input.forEach((row, index) => {
    const term = (row[termColumn] ?? '').trim()
    const clicks = toInt(pick(row, ['clics', 'clicks']))
    const impressions = toInt(pick(row, ['impresiones', 'impressions']))
    if (!term) return
    if (!Number.isFinite(clicks) || !Number.isFinite(impressions)) {
      errors.push({ line: index + 2, message: `${term}: clics o impresiones no son números.` })
      return
    }
    const position = Number((pick(row, ['posicion', 'position']) ?? '').replace(',', '.'))
    rows.push({ term, clicks, impressions, position: Number.isFinite(position) && position > 0 ? Math.round(position * 100) / 100 : null })
  })
  return { dimension: TERM_COLUMNS[termColumn], rows, errors }
}

/** Clics entre impresiones; null si no hubo impresiones. */
export const clickRate = (clicks: number, impressions: number) => (impressions > 0 ? clicks / impressions : null)
