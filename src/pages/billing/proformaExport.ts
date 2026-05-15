/**
 * Generates a multi-sheet XLSX proforma matching the reference format:
 *   1. ProForma       — main invoice (header + line items + totals)
 *   2. Resumen        — daily breakdown (entradas/salidas per day + service summary)
 *   3. Desglose       — per-entry detail
 *   4. Desglose Entradas — horizontal per-receiver detail
 *   5. Desglose Salidas  — horizontal per-order detail
 *   6. Servicios Transporte — transport services table
 */

import * as XLSX from 'xlsx'
import type { ProformaRow } from './proformaParser'
import type { ExtensivOrderDetail, ExtensivReceiverDetail } from '../../lib/extensiv'

/* ─── helpers ──────────────────────────────────────────────────────── */

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function dateRange(from: string, to: string) {
  const d1 = new Date(from + 'T00:00:00')
  const d2 = new Date(to + 'T00:00:00')
  const days: Date[] = []
  const cur = new Date(d1)
  while (cur <= d2) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function parseISODate(s: string): Date {
  return new Date(s.slice(0, 10) + 'T00:00:00')
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/* ─── column widths ───────────────────────────────────────────────── */
function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

/* ─── 1. ProForma sheet ───────────────────────────────────────────── */
function buildProFormaSheet(
  rows: ProformaRow[],
  clientName: string,
  from: string,
  to: string,
): XLSX.WorkSheet {
  const d1 = new Date(from + 'T00:00:00')
  const d2 = new Date(to + 'T00:00:00')
  const fechaLabel = `Fecha: ${String(d1.getDate()).padStart(2, '0')} al ${String(d2.getDate()).padStart(2, '0')} de ${MONTHS_ES[d1.getMonth()]} de ${d1.getFullYear()}`

  const data: (string | number | null)[][] = []

  // Rows 1-18: blank
  for (let i = 0; i < 18; i++) data.push([null, null, null, null])

  // Row 19: "PROFORMA" (merged A19:D21)
  data.push(['PROFORMA', null, null, null])
  data.push([null, null, null, null])
  data.push([null, null, null, null])

  // Row 22-25: Company + client info
  data.push(['Supply Chain Consulting', null, null, null])                         // A22
  data.push(['Presidente Miguel Alemán Valdez 904, desp 201', null, `Cliente: ${clientName}`, null]) // A23, C23
  data.push(['Nápoles, Benito Juárez, Ciudad de México. C.P. 03180', null, fechaLabel, null])       // A24, C24
  data.push([' RFC: SCC1202278VA', null, 'Tipo de Servicio: Integral', null])     // A25, C25

  // Row 26: Column headers
  data.push(['Cantidad', 'Descripción', 'Costo Unitario', 'Costo Total'])

  // Line items
  for (const r of rows) {
    const qty = parseFloat(r.origen) || 0
    const unitPrice = parseFloat(r.destino) || 0
    data.push([qty, r.concepto, unitPrice, r.importe])
  }

  const lastItemRow = 26 + rows.length // 0-indexed row of last item

  // Totals
  const subtotal = rows.reduce((s, r) => s + r.importe, 0)
  const iva = Math.round(subtotal * 0.16 * 100) / 100
  const retencion = 0
  const total = subtotal + iva - retencion

  data.push([null, null, 'Subtotal', subtotal])
  data.push([null, null, 'IVA', iva])
  data.push([null, null, 'Retención (4%)', retencion])
  data.push([null, ' ', 'Total', total])

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Merged cells
  ws['!merges'] = [
    { s: { r: 18, c: 0 }, e: { r: 20, c: 3 } }, // A19:D21 "PROFORMA"
  ]

  // Column widths
  setColWidths(ws, [14, 42, 18, 18])

  // Number formatting for currency columns
  const numFmt = '#,##0.00'
  for (let r = 26; r <= lastItemRow; r++) {
    const cRef = XLSX.utils.encode_cell({ r, c: 2 })
    const dRef = XLSX.utils.encode_cell({ r, c: 3 })
    if (ws[cRef]) ws[cRef].z = numFmt
    if (ws[dRef]) ws[dRef].z = numFmt
  }
  // Totals formatting
  for (let r = lastItemRow + 1; r <= lastItemRow + 4; r++) {
    const dRef = XLSX.utils.encode_cell({ r, c: 3 })
    if (ws[dRef]) ws[dRef].z = numFmt
  }

  return ws
}

/* ─── 2. Resumen sheet ────────────────────────────────────────────── */
function buildResumenSheet(
  orders: ExtensivOrderDetail[],
  receivers: ExtensivReceiverDetail[],
  rows: ProformaRow[],
  from: string,
  to: string,
): XLSX.WorkSheet {
  const days = dateRange(from, to)

  // Daily counts
  const entradasByDay: Record<string, number> = {}
  const salidasByDay: Record<string, number> = {}
  for (const d of days) {
    entradasByDay[dayKey(d)] = 0
    salidasByDay[dayKey(d)] = 0
  }
  for (const rcv of receivers) {
    const k = dayKey(parseISODate(rcv.creationDate))
    if (entradasByDay[k] !== undefined) entradasByDay[k] += rcv.numUnits1
  }
  for (const ord of orders) {
    const k = dayKey(parseISODate(ord.creationDate))
    if (salidasByDay[k] !== undefined) salidasByDay[k] += ord.numUnits1
  }

  const totalEntradas = receivers.reduce((s, r) => s + r.numUnits1, 0)
  const totalSalidas = orders.reduce((s, o) => s + o.numUnits1, 0)

  const data: (string | number | null)[][] = []

  // Row 1: Headers (CONCEPTO + dates + TOTALES)
  const headerRow: (string | number | null)[] = ['CONCEPTO']
  for (const d of days) headerRow.push(d.getDate())
  headerRow.push('TOTALES')
  data.push(headerRow)

  // Row 2: ENTRADAS
  const entRow: (string | number | null)[] = ['ENTRADAS']
  for (const d of days) entRow.push(entradasByDay[dayKey(d)] || null)
  entRow.push(totalEntradas)
  data.push(entRow)

  // Row 3: SALIDAS
  const salRow: (string | number | null)[] = ['SALIDAS']
  for (const d of days) salRow.push(salidasByDay[dayKey(d)] || null)
  salRow.push(totalSalidas)
  data.push(salRow)

  // Blank row
  data.push([])

  // Receivers detail
  data.push(['DETALLE DE ENTRADAS'])
  data.push(['#', 'Fecha', 'Referencia', 'PO', 'Estado', 'Unidades', 'Peso'])
  for (let i = 0; i < receivers.length; i++) {
    const r = receivers[i]
    data.push([
      i + 1,
      r.creationDate.slice(0, 10),
      r.referenceNum,
      r.poNum,
      r.status,
      r.numUnits1,
      r.totalWeight,
    ])
  }

  data.push([])

  // Orders detail
  data.push(['DETALLE DE SALIDAS'])
  data.push(['#', 'Fecha', 'Referencia', 'PO', 'Estado', 'Unidades', 'Peso', 'Carrier', 'Destino'])
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i]
    data.push([
      i + 1,
      o.creationDate.slice(0, 10),
      o.referenceNum,
      o.poNum,
      o.status,
      o.numUnits1,
      o.totalWeight,
      o.routingInfo?.carrier ?? '',
      o.routingInfo?.shipTo ?? '',
    ])
  }

  data.push([])

  // Service breakdown (DESGLOSE DE SERVICIOS)
  data.push(['DESGLOSE DE SERVICIOS'])
  data.push(['Concepto', 'Cantidad', 'Precio Unitario', 'Total'])
  for (const r of rows) {
    const qty = parseFloat(r.origen) || 0
    const price = parseFloat(r.destino) || 0
    data.push([r.concepto, qty, price, r.importe])
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  setColWidths(ws, [20, ...days.map(() => 5), 10])

  return ws
}

/* ─── 3. Desglose sheet ───────────────────────────────────────────── */
function buildDesgloseSheet(
  orders: ExtensivOrderDetail[],
  receivers: ExtensivReceiverDetail[],
): XLSX.WorkSheet {
  const data: (string | number | null)[][] = []

  data.push(['DESGLOSE DE OPERACIONES'])
  data.push([])

  // Combined list sorted by date
  const ops = [
    ...receivers.map(r => ({
      type: 'ENTRADA' as const,
      date: r.creationDate.slice(0, 10),
      ref: r.referenceNum,
      po: r.poNum,
      status: r.status,
      units: r.numUnits1,
      weight: r.totalWeight,
      carrier: '',
      shipTo: '',
    })),
    ...orders.map(o => ({
      type: 'SALIDA' as const,
      date: o.creationDate.slice(0, 10),
      ref: o.referenceNum,
      po: o.poNum,
      status: o.status,
      units: o.numUnits1,
      weight: o.totalWeight,
      carrier: o.routingInfo?.carrier ?? '',
      shipTo: o.routingInfo?.shipTo ?? '',
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  data.push(['#', 'Tipo', 'Fecha', 'Referencia', 'PO', 'Estado', 'Unidades', 'Peso', 'Carrier', 'Destino'])
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i]
    data.push([i + 1, o.type, o.date, o.ref, o.po, o.status, o.units, o.weight, o.carrier, o.shipTo])
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  setColWidths(ws, [5, 10, 12, 25, 25, 10, 10, 10, 15, 30])
  return ws
}

/* ─── 4. Desglose Entradas sheet ──────────────────────────────────── */
function buildDesgloseEntradasSheet(receivers: ExtensivReceiverDetail[]): XLSX.WorkSheet {
  const data: (string | number | null)[][] = []

  data.push(['DESGLOSE DE ENTRADAS'])
  data.push([])
  data.push(['#', 'Fecha', 'Referencia', 'PO', 'Estado', 'Unidades', 'Peso'])

  for (let i = 0; i < receivers.length; i++) {
    const r = receivers[i]
    data.push([
      i + 1,
      r.creationDate.slice(0, 10),
      r.referenceNum,
      r.poNum,
      r.status,
      r.numUnits1,
      r.totalWeight,
    ])
  }

  // Totals row
  data.push([])
  data.push([
    null, null, null, null, 'TOTAL',
    receivers.reduce((s, r) => s + r.numUnits1, 0),
    receivers.reduce((s, r) => s + r.totalWeight, 0),
  ])

  const ws = XLSX.utils.aoa_to_sheet(data)
  setColWidths(ws, [5, 12, 25, 25, 10, 10, 10])
  return ws
}

/* ─── 5. Desglose Salidas sheet ───────────────────────────────────── */
function buildDesgloseSalidasSheet(orders: ExtensivOrderDetail[]): XLSX.WorkSheet {
  const data: (string | number | null)[][] = []

  data.push(['DESGLOSE DE SALIDAS'])
  data.push([])
  data.push(['#', 'Fecha', 'Referencia', 'PO', 'Estado', 'Unidades', 'Peso', 'Carrier', 'Destino'])

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i]
    data.push([
      i + 1,
      o.creationDate.slice(0, 10),
      o.referenceNum,
      o.poNum,
      o.status,
      o.numUnits1,
      o.totalWeight,
      o.routingInfo?.carrier ?? '',
      o.routingInfo?.shipTo ?? '',
    ])
  }

  data.push([])
  data.push([
    null, null, null, null, 'TOTAL',
    orders.reduce((s, o) => s + o.numUnits1, 0),
    orders.reduce((s, o) => s + o.totalWeight, 0),
    null, null,
  ])

  const ws = XLSX.utils.aoa_to_sheet(data)
  setColWidths(ws, [5, 12, 25, 25, 10, 10, 10, 15, 30])
  return ws
}

/* ─── 6. Servicios Transporte sheet ───────────────────────────────── */
function buildServiciosTransporteSheet(
  rows: ProformaRow[],
  clientName: string,
): XLSX.WorkSheet {
  const transportRows = rows.filter(r =>
    r.tipo === 'transporte' ||
    r.concepto.toLowerCase().includes('transporte') ||
    r.concepto.toLowerCase().includes('flete') ||
    r.concepto.toLowerCase().includes('envío') ||
    r.concepto.toLowerCase().includes('paquetería')
  )

  const data: (string | number | null)[][] = []

  data.push([])
  data.push([null, 'SERVICIOS DE TRANSPORTE'])
  data.push([])
  data.push([null, 'REF. INTERNA', 'FECHA', 'CLIENTE', 'REF CLIENTE', 'ORIGEN', 'DESTINO', 'COSTO'])

  if (transportRows.length === 0) {
    data.push([null, '—', '—', clientName, '—', '—', '—', 0])
  } else {
    for (const r of transportRows) {
      data.push([
        null,
        r.refInterna || '—',
        r.fecha || '—',
        clientName,
        '—',
        r.origen || '—',
        r.destino || '—',
        r.importe,
      ])
    }
  }

  data.push([])
  const totalTransporte = transportRows.reduce((s, r) => s + r.importe, 0)
  data.push([null, null, null, null, null, null, 'TOTAL', totalTransporte])

  const ws = XLSX.utils.aoa_to_sheet(data)
  setColWidths(ws, [3, 18, 12, 20, 30, 15, 15, 14])

  // Number format for cost column
  for (let r = 4; r < data.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: 7 })
    if (ws[ref] && ws[ref].t === 'n') ws[ref].z = '#,##0.00'
  }

  return ws
}

/* ─── Main export function ────────────────────────────────────────── */
export interface ProformaExportData {
  rows: ProformaRow[]
  clientName: string
  from: string
  to: string
  orders: ExtensivOrderDetail[]
  receivers: ExtensivReceiverDetail[]
}

export function exportProformaXLSX(data: ProformaExportData): void {
  const { rows, clientName, from, to, orders, receivers } = data

  const wb = XLSX.utils.book_new()

  // 1. ProForma
  const proformaWs = buildProFormaSheet(rows, clientName, from, to)
  XLSX.utils.book_append_sheet(wb, proformaWs, 'ProForma')

  // 2. Resumen
  const resumenWs = buildResumenSheet(orders, receivers, rows, from, to)
  XLSX.utils.book_append_sheet(wb, resumenWs, 'Resumen')

  // 3. Desglose
  const desgloseWs = buildDesgloseSheet(orders, receivers)
  XLSX.utils.book_append_sheet(wb, desgloseWs, 'Desglose')

  // 4. Desglose Entradas
  const entWs = buildDesgloseEntradasSheet(receivers)
  XLSX.utils.book_append_sheet(wb, entWs, 'Desglose Entradas')

  // 5. Desglose Salidas
  const salWs = buildDesgloseSalidasSheet(orders)
  XLSX.utils.book_append_sheet(wb, salWs, 'Desglose Salidas')

  // 6. Servicios Transporte
  const transpWs = buildServiciosTransporteSheet(rows, clientName)
  XLSX.utils.book_append_sheet(wb, transpWs, 'Servicios Transporte')

  // Generate filename
  const d = new Date(from + 'T00:00:00')
  const monthShort = MONTHS_ES[d.getMonth()].slice(0, 3)
  const year = String(d.getFullYear()).slice(2)
  const clientCode = clientName.replace(/[^A-Za-z0-9]/g, '_').slice(0, 10)
  const fileName = `Proforma_${clientCode}_${monthShort}_${year}.xlsx`

  XLSX.writeFile(wb, fileName)
}
