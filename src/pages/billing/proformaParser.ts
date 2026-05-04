import * as XLSX from 'xlsx'

export type ProformaTipo = 'transporte' | 'almacenaje' | 'entrada' | 'salida' | 'servicio'

export interface ProformaRow {
  id:          string
  refInterna:  string
  fecha:       string
  cliente:     string
  concepto:    string
  origen:      string
  destino:     string
  importe:     number
  tipo:        ProformaTipo
}

// Convierte número serial de Excel a dd/mm/yyyy
function excelDateToStr(serial: unknown): string {
  if (typeof serial !== 'number') return String(serial ?? '')
  const date = XLSX.SSF.parse_date_code(serial)
  if (!date) return String(serial)
  return `${String(date.d).padStart(2, '0')}/${String(date.m).padStart(2, '0')}/${date.y}`
}

// Extrae filas de la hoja "Servicios Transporte"
function parseTransporte(ws: XLSX.WorkSheet): ProformaRow[] {
  const rows: ProformaRow[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as ProformaRow[][]
  const result: ProformaRow[] = []

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    const refInterna = String(r[0] ?? '').trim()
    if (!refInterna) continue

    const cliente = String(r[2] ?? '').trim()
    const origen  = String(r[4] ?? '').trim()
    const destino = String(r[5] ?? '').trim()
    const importe = Number(r[6]) || 0

    result.push({
      id:         crypto.randomUUID(),
      refInterna,
      fecha:      excelDateToStr(r[1]),
      cliente:    cliente || 'SIN CLIENTE',
      concepto:   String(r[3] ?? '').trim() || `${origen} → ${destino}`,
      origen,
      destino,
      importe,
      tipo:       'transporte',
    })
  }
  return result
}

// Extrae resumen de entradas/salidas por día de la hoja "Resumen"
function parseResumen(ws: XLSX.WorkSheet): ProformaRow[] {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]
  const result: ProformaRow[] = []

  // Fila 0 = headers (fechas como seriales)
  // Fila 1 = ENTRADAS, Fila 2 = SALIDAS
  const headers = rows[0] as unknown[]
  const entradas = rows[1] as unknown[]
  const salidas  = rows[2] as unknown[]

  // La penúltima columna con valor = TOTALES
  const totEntradas = Number(entradas?.[31] ?? entradas?.[32] ?? 0)
  const totSalidas  = Number(salidas?.[31]  ?? salidas?.[32]  ?? 0)

  // Fecha del primer día del mes (primer serial en headers)
  const primerSerial = headers.find(h => typeof h === 'number') as number | undefined
  const mesStr = primerSerial ? excelDateToStr(primerSerial).slice(3) : '' // mm/yyyy

  if (totEntradas > 0) {
    result.push({
      id: crypto.randomUUID(), refInterna: '',
      fecha: mesStr, cliente: 'RESUMEN',
      concepto: `Recepción de mercancía — ${totEntradas} entradas`,
      origen: '', destino: '', importe: 0, tipo: 'entrada',
    })
  }
  if (totSalidas > 0) {
    result.push({
      id: crypto.randomUUID(), refInterna: '',
      fecha: mesStr, cliente: 'RESUMEN',
      concepto: `Despacho de mercancía — ${totSalidas} salidas`,
      origen: '', destino: '', importe: 0, tipo: 'salida',
    })
  }
  return result
}

export async function parseProformaExcel(file: File): Promise<ProformaRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })

        const all: ProformaRow[] = []

        // 1. Servicios Transporte — fuente principal
        const transporteSheet = wb.Sheets['Servicios Transporte']
        if (transporteSheet) all.push(...parseTransporte(transporteSheet))

        // 2. Resumen — conteos de entradas/salidas
        const resumenSheet = wb.Sheets['Resumen']
        if (resumenSheet) all.push(...parseResumen(resumenSheet))

        resolve(all)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}
