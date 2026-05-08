// Parser de Excels de movimientos de Seko 365.
//
// Estrategia: case-insensitive header matching con sinónimos por campo.
// Acepta variaciones comunes ("Fecha movimiento", "Date", "Tipo", "Movement Type",
// "Referencia", "PO", "SO", "Order #", "SKU", "Item", "Cantidad", "Qty", etc.).
// Soporta fechas Excel (números seriales) y strings ISO/dd-mm-yyyy.

import * as XLSX from 'xlsx'
import type { SekoTipo } from '../types/seko'

export interface ParsedSekoRow {
  /** Número de fila en el Excel (1-indexed, después del header). */
  source_row:  number
  fecha:       string | null      // YYYY-MM-DD o null si inválida
  tipo:        SekoTipo | null
  referencia:  string | null
  sku:         string | null
  cantidad:    number
  raw:         Record<string, unknown>
  /** Errores detectados (fecha inválida, tipo desconocido, etc.). Vacío = OK. */
  errors:      string[]
}

export interface ParseResult {
  rows:         ParsedSekoRow[]
  totalRows:    number
  validRows:    number
  invalidRows:  number
  fileName:     string
}

const HEADER_SYNONYMS = {
  fecha:      ['fecha', 'date', 'fecha movimiento', 'fecha mov', 'fecha del movimiento', 'movement date', 'fecha de movimiento'],
  tipo:       ['tipo', 'movement type', 'tipo movimiento', 'tipo de movimiento', 'tipo mov', 'movimiento', 'type', 'transaction type'],
  referencia: ['referencia', 'ref', 'folio', 'po', 'so', 'order #', 'order number', 'po number', 'po/so', 'reference', 'po/so/folio', 'numero', 'número', 'document'],
  sku:        ['sku', 'item', 'item #', 'item number', 'producto', 'codigo', 'código', 'item code', 'part number', 'parte', 'ean'],
  cantidad:   ['cantidad', 'qty', 'quantity', 'units', 'unidades', 'cant', 'piezas'],
}

const ENTRADA_VALUES = new Set([
  'entrada', 'entradas', 'in', 'receipt', 'receiver', 'inbound', 'recibido',
  'recepcion', 'recepción', 'ingreso', 'ingresos', 'rcv', 'rcp',
])
const SALIDA_VALUES = new Set([
  'salida', 'salidas', 'out', 'order', 'shipment', 'outbound', 'enviado',
  'despacho', 'embarque', 'shp', 'order out', 'venta',
])

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Encuentra la columna del Excel que matchea cualquiera de los sinónimos. */
function findColumn(headers: string[], synonyms: string[]): number {
  const norm = headers.map(h => normalize(h ?? ''))
  for (const syn of synonyms) {
    const ix = norm.findIndex(h => h === normalize(syn))
    if (ix >= 0) return ix
  }
  // Fallback: matcheo parcial (incluye)
  for (const syn of synonyms) {
    const ix = norm.findIndex(h => h.includes(normalize(syn)))
    if (ix >= 0) return ix
  }
  return -1
}

/** Convierte número serial Excel a fecha YYYY-MM-DD. */
function excelDateToISO(serial: number): string | null {
  if (!isFinite(serial) || serial < 0) return null
  // Excel epoch: 1900-01-01 con bug del año bisiesto 1900 → restar 25569 de un día base
  const utcDays = serial - 25569
  const utcMs = utcDays * 86400 * 1000
  const d = new Date(utcMs)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/** Parsea una celda como fecha. Devuelve YYYY-MM-DD o null. */
function parseDate(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return excelDateToISO(value)
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  const s = String(value).trim()
  // ISO: 2025-05-08
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  // dd/mm/yyyy ó dd-mm-yyyy
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    let yyyy = m[3]
    if (yyyy.length === 2) yyyy = `20${yyyy}`
    return `${yyyy}-${mm}-${dd}`
  }
  // mm/dd/yyyy formato US — se intenta solo si dd-first falla y el mes parece válido
  // Por ahora dejamos null para formatos no reconocidos.
  return null
}

function parseTipo(value: unknown): SekoTipo | null {
  if (value == null) return null
  const n = normalize(String(value))
  if (!n) return null
  if (ENTRADA_VALUES.has(n)) return 'entrada'
  if (SALIDA_VALUES.has(n)) return 'salida'
  // Búsqueda parcial
  for (const v of ENTRADA_VALUES) if (n.includes(v)) return 'entrada'
  for (const v of SALIDA_VALUES) if (n.includes(v)) return 'salida'
  return null
}

function parseNumber(value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^\d.\-]/g, '')
  const n = Number(cleaned)
  return isNaN(n) ? 0 : n
}

export async function parseSekoExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) {
    return { rows: [], totalRows: 0, validRows: 0, invalidRows: 0, fileName: file.name }
  }

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' })
  if (aoa.length < 2) {
    return { rows: [], totalRows: 0, validRows: 0, invalidRows: 0, fileName: file.name }
  }

  const headers = (aoa[0] as unknown[]).map(h => String(h ?? '').trim())

  // Detectar columnas por sinónimos
  const colFecha      = findColumn(headers, HEADER_SYNONYMS.fecha)
  const colTipo       = findColumn(headers, HEADER_SYNONYMS.tipo)
  const colReferencia = findColumn(headers, HEADER_SYNONYMS.referencia)
  const colSku        = findColumn(headers, HEADER_SYNONYMS.sku)
  const colCantidad   = findColumn(headers, HEADER_SYNONYMS.cantidad)

  const rows: ParsedSekoRow[] = []

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] as unknown[]
    // Skip filas completamente vacías
    if (row.every(cell => cell === '' || cell == null)) continue

    const errors: string[] = []
    const fecha = colFecha >= 0 ? parseDate(row[colFecha]) : null
    if (!fecha) errors.push('Fecha inválida o ausente')

    const tipo = colTipo >= 0 ? parseTipo(row[colTipo]) : null
    if (!tipo) errors.push('Tipo desconocido (debe ser entrada/salida)')

    const referencia = colReferencia >= 0 ? String(row[colReferencia] ?? '').trim() || null : null
    const sku        = colSku >= 0        ? String(row[colSku] ?? '').trim() || null : null
    const cantidad   = colCantidad >= 0   ? parseNumber(row[colCantidad]) : 0

    // Construir raw con todos los headers
    const raw: Record<string, unknown> = {}
    headers.forEach((h, idx) => { if (h) raw[h] = row[idx] })

    rows.push({
      source_row: i + 1,         // 1-indexed con header en fila 1
      fecha,
      tipo,
      referencia,
      sku,
      cantidad,
      raw,
      errors,
    })
  }

  const validRows = rows.filter(r => r.errors.length === 0).length

  return {
    rows,
    totalRows:   rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    fileName:    file.name,
  }
}
