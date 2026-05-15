import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseParcelExcel } from './parcelExcelParser'

// ─────────────────────────────────────────────────────────────────────────────
// Tests del parser de Excels de órdenes de paquetería. Cubre detección de
// columnas por sinónimos EN/ES, normalización de carrier y deteccion de errores.
// ─────────────────────────────────────────────────────────────────────────────

/** Construye un File .xlsx en memoria a partir de un array de arrays. */
function makeXlsxFile(aoa: unknown[][], name = 'ordenes.xlsx'): File {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([buf], name)
}

describe('parseParcelExcel', () => {
  it('detecta columnas con encabezados en español', async () => {
    const file = makeXlsxFile([
      ['Cliente', 'Orden #', 'CP', 'Carrier', 'Peso'],
      ['BASF', 'ORD-1', '52000', 'estafeta', 3],
    ])
    const result = await parseParcelExcel(file)
    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(1)
    const row = result.rows[0]
    expect(row.cliente).toBe('BASF')
    expect(row.order_num).toBe('ORD-1')
    expect(row.to_cp).toBe('52000')
    expect(row.carrier).toBe('estafeta')
    expect(row.weight_kg).toBe(3)
  })

  it('detecta columnas con encabezados en inglés', async () => {
    const file = makeXlsxFile([
      ['Customer', 'Order Number', 'Postal Code', 'Weight'],
      ['iFit', 'PO-99', '06700', 12.5],
    ])
    const result = await parseParcelExcel(file)
    const row = result.rows[0]
    expect(row.cliente).toBe('iFit')
    expect(row.order_num).toBe('PO-99')
    expect(row.to_cp).toBe('06700')
    expect(row.weight_kg).toBe(12.5)
  })

  it('marca errores cuando falta cliente, CP o peso', async () => {
    const file = makeXlsxFile([
      ['Cliente', 'CP', 'Peso'],
      ['', '52000', 5],          // sin cliente
      ['KST', '', 5],            // sin CP
      ['Lululemon', '06700', 0], // peso inválido
    ])
    const result = await parseParcelExcel(file)
    expect(result.totalRows).toBe(3)
    expect(result.invalidRows).toBe(3)
    expect(result.rows[0].errors).toContain('Cliente ausente')
    expect(result.rows[1].errors).toContain('CP destino ausente')
    expect(result.rows[2].errors).toContain('Peso inválido')
  })

  it('normaliza nombres de carrier libres a la clave canónica', async () => {
    const file = makeXlsxFile([
      ['Cliente', 'CP', 'Peso', 'Paquetería'],
      ['BASF', '52000', 1, 'FedEx Express'],
      ['BASF', '52000', 1, 'DHL'],
    ])
    const result = await parseParcelExcel(file)
    expect(result.rows[0].carrier).toBe('fedex')
    expect(result.rows[1].carrier).toBe('dhl')
  })

  it('aplica dimensiones por defecto cuando no vienen columnas', async () => {
    const file = makeXlsxFile([
      ['Cliente', 'CP', 'Peso'],
      ['BASF', '52000', 2],
    ])
    const result = await parseParcelExcel(file)
    const row = result.rows[0]
    expect(row.length_cm).toBe(30)
    expect(row.width_cm).toBe(20)
    expect(row.height_cm).toBe(10)
    expect(row.to_country).toBe('MX')
  })

  it('devuelve resultado vacío para un Excel sin filas de datos', async () => {
    const file = makeXlsxFile([['Cliente', 'CP', 'Peso']])
    const result = await parseParcelExcel(file)
    expect(result.totalRows).toBe(0)
    expect(result.rows).toHaveLength(0)
  })
})
