// Parser de Excels de órdenes de paquetería (TMS Techship replica).
//
// Detección de columnas case-insensitive con sinónimos por campo.
// Acepta variaciones EN/ES comunes: cliente/customer, peso/weight/kg,
// destino/recipient, CP/postal_code, dimensiones.

import * as XLSX from 'xlsx'

export interface ParsedParcelRow {
  source_row:    number
  cliente:       string | null
  order_num:     string | null
  destinatario:  string | null
  to_cp:         string | null
  to_country:    string
  carrier:       string | null
  service:       string | null
  weight_kg:     number
  length_cm:     number
  width_cm:      number
  height_cm:     number
  raw:           Record<string, unknown>
  errors:        string[]
}

export interface ParcelParseResult {
  rows:        ParsedParcelRow[]
  totalRows:   number
  validRows:   number
  invalidRows: number
  fileName:    string
}

const HEADER_SYNONYMS = {
  cliente:      ['cliente', 'customer', 'client', 'cuenta', 'account', 'razon social', 'razón social'],
  order_num:    ['orden', 'order', 'order #', 'order number', 'orden #', 'pedido', 'folio', 'referencia', 'reference', 'po', 'so', 'numero', 'número'],
  destinatario: ['destinatario', 'recipient', 'destino', 'consignee', 'nombre destino', 'ship to', 'recibe'],
  to_cp:        ['cp', 'codigo postal', 'código postal', 'postal_code', 'postal code', 'zip', 'zip code', 'cp destino'],
  to_country:   ['pais', 'país', 'country', 'pais destino'],
  carrier:      ['carrier', 'paqueteria', 'paquetería', 'transportista', 'courier'],
  service:      ['servicio', 'service', 'service level', 'tipo servicio'],
  weight:       ['peso', 'weight', 'kg', 'kilos', 'peso kg', 'weight kg', 'peso (kg)'],
  length:       ['largo', 'length', 'longitud', 'largo cm', 'length cm'],
  width:        ['ancho', 'width', 'ancho cm', 'width cm'],
  height:       ['alto', 'height', 'altura', 'alto cm', 'height cm'],
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function findColumn(headers: string[], synonyms: string[]): number {
  const norm = headers.map(h => normalize(h ?? ''))
  for (const syn of synonyms) {
    const ix = norm.findIndex(h => h === normalize(syn))
    if (ix >= 0) return ix
  }
  for (const syn of synonyms) {
    const ix = norm.findIndex(h => h.includes(normalize(syn)))
    if (ix >= 0) return ix
  }
  return -1
}

function parseNumber(value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^\d.\-]/g, '')
  const n = Number(cleaned)
  return isNaN(n) ? 0 : n
}

function str(value: unknown): string | null {
  const s = String(value ?? '').trim()
  return s || null
}

const KNOWN_CARRIERS = ['estafeta', 'ups', 'fedex', 'dhl', 'castores']

function normalizeCarrier(value: unknown): string | null {
  const n = str(value)
  if (!n) return null
  const low = normalize(n)
  for (const c of KNOWN_CARRIERS) if (low.includes(c)) return c
  return low
}

export async function parseParcelExcel(file: File): Promise<ParcelParseResult> {
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
  const col = {
    cliente:      findColumn(headers, HEADER_SYNONYMS.cliente),
    order_num:    findColumn(headers, HEADER_SYNONYMS.order_num),
    destinatario: findColumn(headers, HEADER_SYNONYMS.destinatario),
    to_cp:        findColumn(headers, HEADER_SYNONYMS.to_cp),
    to_country:   findColumn(headers, HEADER_SYNONYMS.to_country),
    carrier:      findColumn(headers, HEADER_SYNONYMS.carrier),
    service:      findColumn(headers, HEADER_SYNONYMS.service),
    weight:       findColumn(headers, HEADER_SYNONYMS.weight),
    length:       findColumn(headers, HEADER_SYNONYMS.length),
    width:        findColumn(headers, HEADER_SYNONYMS.width),
    height:       findColumn(headers, HEADER_SYNONYMS.height),
  }

  const rows: ParsedParcelRow[] = []
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] as unknown[]
    if (row.every(cell => cell === '' || cell == null)) continue

    const errors: string[] = []
    const cliente   = col.cliente >= 0 ? str(row[col.cliente]) : null
    if (!cliente) errors.push('Cliente ausente')

    const to_cp = col.to_cp >= 0 ? str(row[col.to_cp]) : null
    if (!to_cp) errors.push('CP destino ausente')

    const weight_kg = col.weight >= 0 ? parseNumber(row[col.weight]) : 0
    if (weight_kg <= 0) errors.push('Peso inválido')

    const raw: Record<string, unknown> = {}
    headers.forEach((h, idx) => { if (h) raw[h] = row[idx] })

    rows.push({
      source_row:   i + 1,
      cliente,
      order_num:    col.order_num >= 0 ? str(row[col.order_num]) : null,
      destinatario: col.destinatario >= 0 ? str(row[col.destinatario]) : null,
      to_cp,
      to_country:   (col.to_country >= 0 ? str(row[col.to_country]) : null) ?? 'MX',
      carrier:      col.carrier >= 0 ? normalizeCarrier(row[col.carrier]) : null,
      service:      col.service >= 0 ? str(row[col.service]) : null,
      weight_kg,
      length_cm:    col.length >= 0 ? parseNumber(row[col.length]) || 30 : 30,
      width_cm:     col.width  >= 0 ? parseNumber(row[col.width])  || 20 : 20,
      height_cm:    col.height >= 0 ? parseNumber(row[col.height]) || 10 : 10,
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
