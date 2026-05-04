import * as XLSX from 'xlsx'
import type { StorageCalcRow } from '../hooks/useMonthlyStorageCalc'
import { monthName } from '../hooks/useMonthlyStorageCalc'

/*
  Bind ERP exporter — generates CSV/XLSX files in a format compatible with
  Bind ERP's import module for CFDI 4.0 invoicing.

  NOTE: The exact format Bind ERP expects depends on each installation. This
  implementation uses a safe general-purpose layout (one row per concept) that
  most Mexican accounting systems accept. Adjust the columns once the user
  confirms the exact schema from Bind's import template.

  SAT product codes (Clave Producto/Servicio):
    80121601 — Almacenaje (storage)
    78101903 — Servicios de transporte (freight)
    78102200 — Servicios de distribución (distribution/handling)
*/

export interface BindERPRow {
  clienteCodigo:   string
  clienteNombre:   string
  rfc:             string | null
  concepto:        string
  claveSat:        string
  cantidad:        number
  unidad:          string
  precioUnitario:  number
  importe:         number
  periodo:         string    // 'Abril 2026'
  notas:           string
}

const SAT_CODES = {
  ALMACENAJE:   '80121601',
  TRANSPORTE:   '78101903',
  MANIOBRA:     '78102200',
  VALOR_AGREG:  '78102200',
  OTRO:         '81121500',
} as const

/* ─── Build rows from a storage calculation ──────────────────────────── */
export function buildBindRowsFromStorage(
  row: StorageCalcRow,
  year: number,
  month: number,
  rfc: string | null = null,
): BindERPRow[] {
  if (!row.clienteCodigo || row.storageMXN <= 0) return []

  const periodo = `${monthName(month)} ${year}`
  const concepto = row.tariffConcepto ?? 'Almacenaje'

  // Determine quantity + unit based on tariff mode
  let cantidad = 0
  let unidad = 'SERVICIO'
  let precioUnitario = row.tariffRate

  switch (row.tariffUnit) {
    case 'TARIMA':
      cantidad = row.positions
      unidad = 'Tarima'
      break
    case 'M2':
      cantidad = row.totalM2
      unidad = 'M2'
      break
    case 'FIJO_MENSUAL':
      cantidad = 1
      unidad = 'Servicio'
      precioUnitario = row.storageMXN
      break
    default:
      return []
  }

  return [{
    clienteCodigo:   row.clienteCodigo,
    clienteNombre:   row.customerName,
    rfc,
    concepto:        `${concepto} — ${periodo}`,
    claveSat:        SAT_CODES.ALMACENAJE,
    cantidad,
    unidad,
    precioUnitario,
    importe:         row.storageMXN,
    periodo,
    notas:           row.note ?? '',
  }]
}

/* ─── Export: single client ─────────────────────────────────────────── */
export function exportBindERPSingleClient(row: StorageCalcRow, year: number, month: number): void {
  const bindRows = buildBindRowsFromStorage(row, year, month)
  if (bindRows.length === 0) {
    throw new Error('No hay líneas para exportar (cliente sin tarifa o sin storage)')
  }

  const xlsx = rowsToWorkbook(bindRows)
  const fileName = `BindERP_${(row.clienteCodigo || 'CLIENT').replace(/[^\w-]/g, '_')}_${year}${String(month).padStart(2, '0')}.xlsx`
  XLSX.writeFile(xlsx, fileName)
}

/* ─── Export: all clients (single file) ─────────────────────────────── */
export function exportBindERPAllClients(rows: StorageCalcRow[], year: number, month: number): void {
  const allBindRows: BindERPRow[] = []
  for (const r of rows) {
    allBindRows.push(...buildBindRowsFromStorage(r, year, month))
  }
  if (allBindRows.length === 0) {
    throw new Error('No hay líneas para exportar')
  }

  const xlsx = rowsToWorkbook(allBindRows)
  const fileName = `BindERP_Todos_${year}${String(month).padStart(2, '0')}.xlsx`
  XLSX.writeFile(xlsx, fileName)
}

/* ─── XLSX builder (no colors, plain strings) ───────────────────────── */
function rowsToWorkbook(rows: BindERPRow[]): XLSX.WorkBook {
  const HEADER = [
    'Código Cliente', 'Nombre Cliente', 'RFC',
    'Concepto', 'Clave SAT',
    'Cantidad', 'Unidad', 'Precio Unitario', 'Importe',
    'Período', 'Notas',
  ]
  const data = rows.map(r => [
    r.clienteCodigo,
    r.clienteNombre,
    r.rfc ?? '',
    r.concepto,
    r.claveSat,
    r.cantidad,
    r.unidad,
    r.precioUnitario,
    r.importe,
    r.periodo,
    r.notas,
  ])

  const ws = XLSX.utils.aoa_to_sheet([HEADER, ...data])
  ws['!cols'] = [
    { wch: 14 }, { wch: 32 }, { wch: 14 },
    { wch: 40 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 28 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bind ERP Import')
  return wb
}
