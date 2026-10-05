// Lector de CSV sin dependencias. Lo usará el importador de catálogo y clientes
// (exportaciones de Shopify y de Excel en México):
//   · Quita el BOM de UTF-8.
//   · Detecta el separador: coma, punto y coma o tabulador.
//   · Respeta comillas, comillas escapadas ("") y saltos de línea dentro de comillas.
//   · Normaliza encabezados: "Folio Pedido" → folio_pedido, "Categoría" → categoria.
//   · Ignora filas vacías. Los valores quedan como texto; la base los normaliza.

export type CsvRow = Record<string, string>

export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function detectDelimiter(firstLine: string): string {
  const candidates = [',', ';', '\t']
  let best = ','
  let bestCount = -1
  for (const candidate of candidates) {
    let count = 0
    let quoted = false
    for (const char of firstLine) {
      if (char === '"') quoted = !quoted
      else if (!quoted && char === candidate) count += 1
    }
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

function parseRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') quoted = true
    else if (char === delimiter) {
      record.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      record.push(field)
      records.push(record)
      record = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || record.length) {
    record.push(field)
    records.push(record)
  }
  return records
}

export function parseCsv(input: string): CsvRow[] {
  const text = input.replace(/^\uFEFF/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const records = parseRecords(text, detectDelimiter(firstLine))
  if (!records.length) return []

  const headers = records[0].map(normalizeHeader)
  const rows: CsvRow[] = []
  for (const record of records.slice(1)) {
    if (record.every((value) => value.trim() === '')) continue
    const row: CsvRow = {}
    headers.forEach((header, column) => {
      if (header) row[header] = (record[column] ?? '').trim()
    })
    rows.push(row)
  }
  return rows
}
