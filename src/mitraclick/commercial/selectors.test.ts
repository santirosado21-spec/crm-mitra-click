import { describe, expect, it } from 'vitest'
import type { CommercialData, CommercialProduct, OrderLine, RetailOrder, WholesaleOrder } from '../domain'
import { resolvePeriod } from './period'
import {
  getBusinessUnitSummary,
  getChannelMix,
  getClientActivity,
  getFunnel,
  getRepDailySeries,
  getCategoryPerformance,
  getDailySeries,
  getGoalProgress,
  getProductHighlights,
  getProductPerformance,
  getRepLeaderboard,
  getRepsNeedingAttention,
  getSlowMovers,
  getStockoutsWithDemand,
} from './selectors'

const product = (overrides: Partial<CommercialProduct> & Pick<CommercialProduct, 'id'>): CommercialProduct => ({
  sku: overrides.id,
  name: overrides.id,
  brand: 'Marca',
  category: 'Acero y perfiles',
  businessUnit: 'mitra',
  unitPrice: 100,
  unit: 'pieza',
  stock: 10,
  reorderPoint: 2,
  ...overrides,
})

const line = (productId: string, quantity: number, unitPrice = 100): OrderLine => ({
  productId,
  quantity,
  unitPrice,
  amount: quantity * unitPrice,
})

const wholesale = (id: string, date: string, repId: string, lines: OrderLine[], clientId = 'CL1'): WholesaleOrder => ({
  id,
  date,
  clientId,
  repId,
  amount: lines.reduce((sum, item) => sum + item.amount, 0),
  status: 'surtido',
  lines,
})

const retail = (id: string, date: string, lines: OrderLine[]): RetailOrder => ({
  id,
  date,
  channel: 'Google',
  amount: lines.reduce((sum, item) => sum + item.amount, 0),
  status: 'entregado',
  lines,
})

// asOf = martes 22 de septiembre de 2026 (septiembre tiene 30 días).
const fixture = (): CommercialData => ({
  source: 'demo',
  asOf: '2026-09-22',
  generatedAt: '2026-09-22T12:00:00.000Z',
  reps: [
    { id: 'rep-a', name: 'Ana Estrella', zone: 'Norte', monthlyQuota: 30_000, active: true },
    { id: 'rep-b', name: 'Beto Riesgo', zone: 'Sur', monthlyQuota: 30_000, active: true },
    { id: 'rep-c', name: 'Carla Parada', zone: 'Centro', monthlyQuota: 30_000, active: true },
  ],
  products: [
    product({ id: 'W1', name: 'Varilla', category: 'Acero y perfiles' }),
    product({ id: 'W2', name: 'Cable', category: 'Material eléctrico', stock: 0 }),
    product({ id: 'W3', name: 'Placa', category: 'Acero y perfiles', unitPrice: 1_000, stock: 4 }),
    product({ id: 'P1', name: 'Taladro', category: 'Herramienta', businessUnit: 'mitraclick', unitPrice: 1_000 }),
  ],
  clients: [
    { id: 'CL1', name: 'Cliente Uno', type: 'Constructora', repId: 'rep-a' },
    { id: 'CL2', name: 'Cliente Dos', type: 'Industria', repId: 'rep-a' },
  ],
  wholesaleOrders: [
    // Ana: 22,000 en septiembre (cuota prorrateada 22/30 × 30,000 = 22,000 → 100 %).
    wholesale('A1', '2026-09-02', 'rep-a', [line('W1', 120)]),
    wholesale('A2', '2026-09-21', 'rep-a', [line('W1', 60), line('W2', 40)], 'CL2'),
    // Beto: 11,000 en septiembre (50 %).
    wholesale('B1', '2026-09-10', 'rep-b', [line('W1', 110)]),
    // Carla: vendió sólo en agosto; nada en septiembre.
    wholesale('C1', '2026-08-20', 'rep-c', [line('W2', 50), line('W3', 5, 1_000)]),
    // Agosto de Ana para comparar contra el mismo tramo del mes anterior.
    wholesale('A0', '2026-08-05', 'rep-a', [line('W1', 100)]),
  ],
  retailOrders: [
    retail('R1', '2026-09-20', [line('P1', 2, 1_000)]),
    retail('R2', '2026-09-22', [line('P1', 1, 1_000)]),
  ],
  quotes: [
    { id: 'Q1', date: '2026-09-15', clientId: 'CL1', repId: 'rep-a', amount: 9_000, status: 'enviada' },
    { id: 'Q2', date: '2026-09-05', clientId: 'CL1', repId: 'rep-a', amount: 5_000, status: 'ganada', closedDate: '2026-09-08' },
    { id: 'Q3', date: '2026-09-06', clientId: 'CL1', repId: 'rep-a', amount: 5_000, status: 'perdida', closedDate: '2026-09-09' },
    { id: 'Q4', date: '2026-09-12', clientId: 'CL1', repId: 'rep-b', amount: 7_000, status: 'negociacion' },
  ],
  traffic: [],
  goals: [
    { month: '2026-09', businessUnit: 'mitra', amount: 60_000 },
    { month: '2026-09', businessUnit: 'mitraclick', amount: 6_000 },
  ],
})

describe('resolvePeriod', () => {
  it('mes corre del día 1 a la fecha de corte y se compara con el mismo tramo del mes anterior', () => {
    const period = resolvePeriod('mes', '2026-09-22')
    expect(period).toMatchObject({ start: '2026-09-01', end: '2026-09-22', previousStart: '2026-08-01', previousEnd: '2026-08-22', days: 22 })
    expect(period.quotaFactor).toBeCloseTo(22 / 30)
  })

  it('semana son los últimos 7 días contra los 7 anteriores', () => {
    expect(resolvePeriod('semana', '2026-09-22')).toMatchObject({ start: '2026-09-16', end: '2026-09-22', previousStart: '2026-09-09', previousEnd: '2026-09-15', days: 7 })
  })

  it('hoy se compara con el mismo día de la semana anterior', () => {
    expect(resolvePeriod('hoy', '2026-09-22')).toMatchObject({ start: '2026-09-22', end: '2026-09-22', previousStart: '2026-09-15', previousEnd: '2026-09-15' })
  })
})

describe('getRepLeaderboard', () => {
  it('ordena por venta y asigna semáforo por avance contra cuota prorrateada', () => {
    const rows = getRepLeaderboard(fixture(), resolvePeriod('mes', '2026-09-22'))

    expect(rows.map((row) => row.repId)).toEqual(['rep-a', 'rep-b', 'rep-c'])
    expect(rows[0]).toMatchObject({ sales: 22_000, quota: 22_000, attainment: 1, status: 'cumple', orders: 2, averageTicket: 11_000, activeClients: 2, daysSinceLastSale: 1 })
    expect(rows[1]).toMatchObject({ sales: 11_000, attainment: 0.5, status: 'riesgo', gapToQuota: 11_000 })
    expect(rows[2]).toMatchObject({ sales: 0, status: 'sin-ventas', daysSinceLastSale: 33, averageTicket: 0 })
  })

  it('compara contra el periodo anterior y resume cotizaciones del vendedor', () => {
    const [ana, beto, carla] = getRepLeaderboard(fixture(), resolvePeriod('mes', '2026-09-22'))

    expect(ana.previousSales).toBe(10_000)
    expect(ana.deltaPct).toBe(120)
    expect(ana).toMatchObject({ openQuotes: 1, openQuotesValue: 9_000, quoteWinRate: 0.5 })
    expect(beto).toMatchObject({ openQuotes: 1, openQuotesValue: 7_000, quoteWinRate: null })
    expect(carla.deltaPct).toBe(-100)
  })

  it('un vendedor sin ventas previas no tiene variación porcentual', () => {
    const [, beto] = getRepLeaderboard(fixture(), resolvePeriod('mes', '2026-09-22'))
    expect(beto.previousSales).toBe(0)
    expect(beto.deltaPct).toBeNull()
  })
})

describe('getRepsNeedingAttention', () => {
  it('prioriza a quien no vende y luego a quien va más lejos de su cuota', () => {
    const rows = getRepLeaderboard(fixture(), resolvePeriod('mes', '2026-09-22'))
    expect(getRepsNeedingAttention(rows).map((row) => row.repId)).toEqual(['rep-c', 'rep-b'])
  })
})

describe('productos', () => {
  it('calcula ingreso, unidades y participación por producto en la unidad de negocio', () => {
    const rows = getProductPerformance(fixture(), resolvePeriod('mes', '2026-09-22'), 'mitra')

    expect(rows.map((row) => row.product.id)).toEqual(['W1', 'W2', 'W3'])
    expect(rows[0]).toMatchObject({ revenue: 29_000, units: 290, orders: 3 })
    expect(rows[0].share).toBeCloseTo(29 / 33)
    expect(rows[2]).toMatchObject({ revenue: 0, units: 0, previousRevenue: 5_000, deltaPct: -100 })
  })

  it('separa más vendidos, menos vendidos y los que más cayeron', () => {
    const rows = getProductPerformance(fixture(), resolvePeriod('mes', '2026-09-22'), 'mitra')
    const highlights = getProductHighlights(rows, 2)

    expect(highlights.top.map((row) => row.product.id)).toEqual(['W1', 'W2'])
    expect(highlights.bottom.map((row) => row.product.id)).toEqual(['W3', 'W2'])
    expect(highlights.falling.map((row) => row.product.id)).toEqual(['W3', 'W2'])
  })

  it('agrupa por categoría', () => {
    const rows = getCategoryPerformance(fixture(), resolvePeriod('mes', '2026-09-22'), 'mitra')
    expect(rows).toEqual([
      expect.objectContaining({ category: 'Acero y perfiles', revenue: 29_000, previousRevenue: 15_000 }),
      expect.objectContaining({ category: 'Material eléctrico', revenue: 4_000, previousRevenue: 5_000 }),
    ])
  })

  it('detecta productos con existencia que no se venden hace N días', () => {
    const slow = getSlowMovers(fixture(), 30)
    expect(slow.map((row) => row.product.id)).toEqual(['W3'])
    expect(slow[0]).toMatchObject({ daysSinceLastSale: 33, stockValue: 4_000 })
  })

  it('detecta agotados que se siguen vendiendo', () => {
    const stockouts = getStockoutsWithDemand(fixture(), 30)
    expect(stockouts).toEqual([expect.objectContaining({ unitsInWindow: 40, revenueInWindow: 4_000, lastSaleDate: '2026-09-21' })])
    expect(stockouts[0].product.id).toBe('W2')
  })
})

describe('negocio y metas', () => {
  it('resume Mitra mayorista y Mitra Click por separado', () => {
    const summary = getBusinessUnitSummary(fixture(), resolvePeriod('mes', '2026-09-22'))
    expect(summary.mitra).toMatchObject({ sales: 33_000, orders: 3, previousSales: 20_000 })
    expect(summary.mitraclick).toMatchObject({ sales: 3_000, orders: 2, averageTicket: 1_500 })
    expect(summary.total.sales).toBe(36_000)
  })

  it('mide avance contra la meta del mes y proyecta el cierre', () => {
    const progress = getGoalProgress(fixture())
    expect(progress.mitra).toMatchObject({ goal: 60_000, monthToDate: 33_000, expectedToDate: 44_000, projected: 45_000 })
    expect(progress.mitra.pace).toBeCloseTo(0.75)
    expect(progress.mitraclick.monthToDate).toBe(3_000)
  })

  it('devuelve una serie diaria continua, incluidos días sin venta', () => {
    const series = getDailySeries(fixture(), resolvePeriod('semana', '2026-09-22'))
    expect(series).toHaveLength(7)
    expect(series.at(-1)).toEqual({ date: '2026-09-22', mitra: 0, mitraclick: 1_000 })
    expect(series.find((day) => day.date === '2026-09-21')).toEqual({ date: '2026-09-21', mitra: 10_000, mitraclick: 0 })
  })
})

describe('vistas de detalle', () => {
  it('filtra el desempeño de productos por vendedor', () => {
    const rows = getProductPerformance(fixture(), resolvePeriod('mes', '2026-09-22'), 'mitra', { repId: 'rep-a' })
    expect(rows.filter((row) => row.revenue > 0).map((row) => [row.product.id, row.revenue])).toEqual([['W1', 18_000], ['W2', 4_000]])
  })

  it('resume la actividad de cada cliente con días desde su última compra', () => {
    const rows = getClientActivity(fixture(), resolvePeriod('mes', '2026-09-22'))
    expect(rows[0]).toMatchObject({ clientId: 'CL1', sales: 23_000, orders: 2, lastPurchaseDate: '2026-09-10', daysSincePurchase: 12 })
    expect(rows[1]).toMatchObject({ clientId: 'CL2', sales: 10_000, daysSincePurchase: 1, repId: 'rep-a' })
  })

  it('reparte las ventas de Mitra Click por canal', () => {
    expect(getChannelMix(fixture(), resolvePeriod('mes', '2026-09-22'))).toEqual([{ channel: 'Google', sales: 3_000, orders: 2, share: 1 }])
  })

  it('suma el embudo e-commerce del periodo', () => {
    const data = fixture()
    data.traffic = [
      { date: '2026-09-21', visits: 100, productViews: 60, carts: 8, checkouts: 4, orders: 2 },
      { date: '2026-09-22', visits: 100, productViews: 50, carts: 6, checkouts: 3, orders: 2 },
      { date: '2026-08-01', visits: 999, productViews: 0, carts: 0, checkouts: 0, orders: 0 },
    ]
    expect(getFunnel(data, resolvePeriod('semana', '2026-09-22'))).toEqual({ visits: 200, productViews: 110, carts: 14, checkouts: 7, orders: 4, conversionRate: 0.02 })
  })

  it('arma la serie diaria de un vendedor', () => {
    const series = getRepDailySeries(fixture(), 'rep-a', resolvePeriod('semana', '2026-09-22'))
    expect(series).toHaveLength(7)
    expect(series.find((point) => point.date === '2026-09-21')?.sales).toBe(10_000)
  })
})
