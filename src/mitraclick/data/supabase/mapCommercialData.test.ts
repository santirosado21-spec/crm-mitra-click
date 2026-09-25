import { describe, expect, it } from 'vitest'
import { mapCommercialData, type CommercialRows } from './mapCommercialData'

const stamp = { created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }

const rows = (): CommercialRows => ({
  reps: [
    { id: 'rep-uuid-1', source: 'erp', external_id: 'V1', name: 'Ana Pérez', zone: 'Norte', active: true, ...stamp },
    { id: 'rep-uuid-2', source: 'erp', external_id: 'V2', name: 'Beto Ruiz', zone: null, active: false, ...stamp },
  ],
  quotas: [
    { id: 'q1', rep_id: 'rep-uuid-1', month: '2026-08-01', amount: 400000, source: 'manual', ...stamp },
    { id: 'q2', rep_id: 'rep-uuid-1', month: '2026-09-01', amount: 500000, source: 'manual', ...stamp },
  ],
  goals: [{ id: 'g1', month: '2026-09-01', business_unit: 'mitra', amount: 4000000, source: 'manual', ...stamp }],
  products: [
    { id: 'prod-1', source: 'erp', external_id: 'W1', sku: 'MI-W1', name: 'Varilla', brand: 'DeAcero', category: 'Acero', business_unit: 'mitra', unit: 'tramo', list_price: 185, reorder_point: 100, active: true, ...stamp },
    { id: 'prod-2', source: 'shopify', external_id: 'P1', sku: 'MC-P1', name: 'Taladro', brand: null, category: null, business_unit: 'mitraclick', unit: 'pieza', list_price: 1000, reorder_point: 0, active: true, ...stamp },
  ],
  inventory: [
    { id: 'i1', product_id: 'prod-1', warehouse: 'principal', quantity: 120, as_of: '2026-09-24T12:00:00Z', source: 'erp', ...stamp },
    { id: 'i2', product_id: 'prod-1', warehouse: 'lerma', quantity: 30, as_of: '2026-09-24T12:00:00Z', source: 'erp', ...stamp },
  ],
  clients: [{ id: 'cli-1', source: 'erp', external_id: 'CL1', name: 'Constructora Uno', client_type: null, rep_id: 'rep-uuid-1', ...stamp }],
  wholesaleOrders: [
    {
      id: 'ord-1', source: 'erp', external_id: 'PED-1', order_date: '2026-09-20', client_id: 'cli-1', rep_id: 'rep-uuid-1', amount: 3700, status: 'surtido', currency: 'MXN', ...stamp,
      wholesale_order_lines: [
        { id: 'l2', order_id: 'ord-1', line_number: 2, product_id: 'prod-1', quantity: 10, unit_price: 185, amount: 1850, ...stamp },
        { id: 'l1', order_id: 'ord-1', line_number: 1, product_id: 'prod-1', quantity: 10, unit_price: 185, amount: 1850, ...stamp },
      ],
    },
    { id: 'ord-2', source: 'erp', external_id: 'PED-2', order_date: '2026-09-21', client_id: null, rep_id: null, amount: 999, status: 'cancelado', currency: 'MXN', ...stamp, wholesale_order_lines: [] },
  ],
  retailOrders: [
    {
      id: 'r-1', source: 'shopify', external_id: '#1001', order_date: '2026-09-22', channel: null, amount: 2000, status: 'entregado', currency: 'MXN', ...stamp,
      retail_order_lines: [{ id: 'rl1', order_id: 'r-1', line_number: 1, product_id: 'prod-2', quantity: 2, unit_price: 1000, amount: 2000, ...stamp }],
    },
    { id: 'r-2', source: 'shopify', external_id: '#1002', order_date: '2026-09-22', channel: 'Google', amount: 500, status: 'cancelado', currency: 'MXN', ...stamp, retail_order_lines: [] },
  ],
  quotes: [
    { id: 'qt-1', source: 'erp', external_id: 'COT-1', quote_date: '2026-09-10', client_id: 'cli-1', rep_id: 'rep-uuid-1', amount: 9000, status: 'ganada', closed_date: '2026-09-12', ...stamp },
    { id: 'qt-2', source: 'erp', external_id: 'COT-2', quote_date: '2026-09-15', client_id: null, rep_id: null, amount: 5000, status: 'enviada', closed_date: null, ...stamp },
  ],
  traffic: [{ id: 't1', source: 'ga4', day: '2026-09-22', visits: 100, product_views: 60, carts: 8, checkouts: 4, orders: 2, ...stamp }],
  syncRuns: [{ id: 7, source: 'erp', entity: 'pedidos', status: 'parcial', started_at: '2026-09-24T12:00:00Z', finished_at: '2026-09-24T12:00:05Z', rows_received: 10, rows_upserted: 9, error: '1 filas con error', triggered_by: 'n8n' }],
})

const options = { asOf: '2026-09-24', generatedAt: '2026-09-24T13:00:00.000Z' }

describe('mapCommercialData', () => {
  it('marca la fuente como ERP y conserva la fecha de corte', () => {
    const data = mapCommercialData(rows(), options)
    expect(data).toMatchObject({ source: 'erp', asOf: '2026-09-24', generatedAt: '2026-09-24T13:00:00.000Z' })
  })

  it('toma la cuota del mes de la fecha de corte y 0 si el vendedor no tiene', () => {
    const data = mapCommercialData(rows(), options)
    expect(data.reps).toEqual([
      { id: 'rep-uuid-1', name: 'Ana Pérez', zone: 'Norte', monthlyQuota: 500000, active: true },
      { id: 'rep-uuid-2', name: 'Beto Ruiz', zone: 'Sin zona', monthlyQuota: 0, active: false },
    ])
  })

  it('suma la existencia de todas las bodegas y completa textos faltantes', () => {
    const [varilla, taladro] = mapCommercialData(rows(), options).products
    expect(varilla).toEqual({ id: 'prod-1', sku: 'MI-W1', name: 'Varilla', brand: 'DeAcero', category: 'Acero', businessUnit: 'mitra', unitPrice: 185, unit: 'tramo', stock: 150, reorderPoint: 100 })
    expect(taladro).toMatchObject({ brand: 'Sin marca', category: 'Sin categoría', stock: 0 })
  })

  it('excluye pedidos cancelados y ordena las líneas por número', () => {
    const data = mapCommercialData(rows(), options)
    expect(data.wholesaleOrders).toHaveLength(1)
    expect(data.wholesaleOrders[0]).toMatchObject({ id: 'PED-1', date: '2026-09-20', clientId: 'cli-1', repId: 'rep-uuid-1', amount: 3700, status: 'surtido' })
    expect(data.wholesaleOrders[0].lines.map((line) => line.amount)).toEqual([1850, 1850])
    expect(data.retailOrders).toEqual([
      { id: '#1001', date: '2026-09-22', channel: 'Sin canal', amount: 2000, status: 'entregado', lines: [{ productId: 'prod-2', quantity: 2, unitPrice: 1000, amount: 2000 }] },
    ])
  })

  it('mapea clientes, cotizaciones, tráfico y metas', () => {
    const data = mapCommercialData(rows(), options)
    expect(data.clients).toEqual([{ id: 'cli-1', name: 'Constructora Uno', type: 'Sin tipo', repId: 'rep-uuid-1' }])
    expect(data.quotes).toEqual([
      { id: 'COT-1', date: '2026-09-10', clientId: 'cli-1', repId: 'rep-uuid-1', amount: 9000, status: 'ganada', closedDate: '2026-09-12' },
      { id: 'COT-2', date: '2026-09-15', clientId: '', repId: '', amount: 5000, status: 'enviada' },
    ])
    expect(data.traffic).toEqual([{ date: '2026-09-22', visits: 100, productViews: 60, carts: 8, checkouts: 4, orders: 2 }])
    expect(data.goals).toEqual([{ month: '2026-09', businessUnit: 'mitra', amount: 4000000 }])
  })

  it('expone la bitácora de sincronización', () => {
    expect(mapCommercialData(rows(), options).syncRuns).toEqual([
      { id: 7, source: 'erp', entity: 'pedidos', status: 'parcial', startedAt: '2026-09-24T12:00:00Z', finishedAt: '2026-09-24T12:00:05Z', rowsReceived: 10, rowsUpserted: 9, error: '1 filas con error' },
    ])
  })

  it('convierte montos que llegan como texto a número', () => {
    const input = rows()
    input.products[0] = { ...input.products[0], list_price: '185.50' as unknown as number }
    expect(mapCommercialData(input, options).products[0].unitPrice).toBe(185.5)
  })
})
