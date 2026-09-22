// Selectores puros de inteligencia comercial. Reciben `CommercialData` normalizado
// (demo o ERP) y nunca dependen de React ni de la fuente de datos.

import type {
  BusinessUnit,
  CommercialData,
  CommercialProduct,
  PerformanceStatus,
  RetailChannel,
  SalesRep,
} from '../domain'
import { addDays, daysBetween, daysInMonth, inRange, monthOf } from './dates'
import type { ResolvedPeriod } from './period'

/** Umbral de avance contra cuota a partir del cual un vendedor "cumple". */
export const QUOTA_OK_THRESHOLD = 0.95
/** Días sin vender a partir de los cuales un vendedor requiere atención aunque vaya en cuota. */
export const DAYS_WITHOUT_SALE_ALERT = 7

export interface SalesFact {
  orderId: string
  date: string
  businessUnit: BusinessUnit
  repId?: string
  clientId?: string
  channel?: RetailChannel
  productId: string
  quantity: number
  amount: number
}

/** Aplana pedidos mayoristas y órdenes de Mitra Click en hechos de venta por línea. */
export function getSalesFacts(data: CommercialData): SalesFact[] {
  const facts: SalesFact[] = []
  for (const order of data.wholesaleOrders) {
    for (const line of order.lines) {
      facts.push({ orderId: order.id, date: order.date, businessUnit: 'mitra', repId: order.repId, clientId: order.clientId, productId: line.productId, quantity: line.quantity, amount: line.amount })
    }
  }
  for (const order of data.retailOrders) {
    for (const line of order.lines) {
      facts.push({ orderId: order.id, date: order.date, businessUnit: 'mitraclick', channel: order.channel, productId: line.productId, quantity: line.quantity, amount: line.amount })
    }
  }
  return facts
}

/** Variación porcentual con un decimal; `null` si no hay base de comparación. */
export const deltaPct = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null

const round2 = (value: number) => Math.round(value * 100) / 100

// ── Vendedores ──────────────────────────────────────────────────────────────

export interface RepPerformance {
  repId: string
  rep: SalesRep
  name: string
  zone: string
  sales: number
  previousSales: number
  deltaPct: number | null
  /** Cuota prorrateada al periodo. */
  quota: number
  /** Venta / cuota del periodo (1 = 100 %). */
  attainment: number
  gapToQuota: number
  orders: number
  averageTicket: number
  activeClients: number
  daysSinceLastSale: number | null
  lastSaleDate: string | null
  openQuotes: number
  openQuotesValue: number
  /** Ganadas / (ganadas + perdidas) cerradas en el periodo; `null` sin cierres. */
  quoteWinRate: number | null
  status: PerformanceStatus
}

export function repStatus(sales: number, attainment: number): PerformanceStatus {
  if (sales <= 0) return 'sin-ventas'
  return attainment >= QUOTA_OK_THRESHOLD ? 'cumple' : 'riesgo'
}

export function getRepLeaderboard(data: CommercialData, period: ResolvedPeriod): RepPerformance[] {
  return data.reps
    .map((rep) => {
      const orders = data.wholesaleOrders.filter((order) => order.repId === rep.id)
      const current = orders.filter((order) => inRange(order.date, period.start, period.end))
      const previous = orders.filter((order) => inRange(order.date, period.previousStart, period.previousEnd))
      const sales = current.reduce((sum, order) => sum + order.amount, 0)
      const previousSales = previous.reduce((sum, order) => sum + order.amount, 0)
      const quota = Math.round(rep.monthlyQuota * period.quotaFactor)
      const attainment = quota > 0 ? round2(sales / quota) : 0
      const lastSaleDate = orders.filter((order) => order.date <= period.end).reduce<string | null>((latest, order) => (!latest || order.date > latest ? order.date : latest), null)

      const quotes = data.quotes.filter((quote) => quote.repId === rep.id)
      const open = quotes.filter((quote) => (quote.status === 'enviada' || quote.status === 'negociacion') && quote.date <= period.end)
      const closed = quotes.filter((quote) => quote.closedDate && inRange(quote.closedDate, period.start, period.end))
      const won = closed.filter((quote) => quote.status === 'ganada').length

      return {
        repId: rep.id,
        rep,
        name: rep.name,
        zone: rep.zone,
        sales,
        previousSales,
        deltaPct: deltaPct(sales, previousSales),
        quota,
        attainment,
        gapToQuota: Math.max(0, quota - sales),
        orders: current.length,
        averageTicket: current.length ? Math.round(sales / current.length) : 0,
        activeClients: new Set(current.map((order) => order.clientId)).size,
        daysSinceLastSale: lastSaleDate ? daysBetween(lastSaleDate, period.end) : null,
        lastSaleDate,
        openQuotes: open.length,
        openQuotesValue: open.reduce((sum, quote) => sum + quote.amount, 0),
        quoteWinRate: closed.length ? round2(won / closed.length) : null,
        status: repStatus(sales, attainment),
      }
    })
    .sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name, 'es-MX'))
}

const statusPriority: Record<PerformanceStatus, number> = { 'sin-ventas': 0, riesgo: 1, cumple: 2 }

/** Vendedores fuera de cuota o que llevan varios días sin vender, del caso más grave al menos grave. */
export function getRepsNeedingAttention(rows: RepPerformance[]): RepPerformance[] {
  return rows
    .filter((row) => row.status !== 'cumple' || (row.daysSinceLastSale ?? Infinity) >= DAYS_WITHOUT_SALE_ALERT)
    .sort((a, b) => statusPriority[a.status] - statusPriority[b.status] || a.attainment - b.attainment)
}

// ── Productos ───────────────────────────────────────────────────────────────

export type UnitFilter = BusinessUnit | 'todas'

export interface ProductPerformance {
  product: CommercialProduct
  revenue: number
  units: number
  orders: number
  previousRevenue: number
  deltaPct: number | null
  /** Participación en el ingreso de su filtro (0–1). */
  share: number
}

const matchesUnit = (unit: UnitFilter, businessUnit: BusinessUnit) => unit === 'todas' || unit === businessUnit

export function getProductPerformance(data: CommercialData, period: ResolvedPeriod, unit: UnitFilter = 'todas'): ProductPerformance[] {
  const facts = getSalesFacts(data).filter((fact) => matchesUnit(unit, fact.businessUnit))
  const current = new Map<string, { revenue: number; units: number; orders: Set<string> }>()
  const previous = new Map<string, number>()

  for (const fact of facts) {
    if (inRange(fact.date, period.start, period.end)) {
      const entry = current.get(fact.productId) ?? { revenue: 0, units: 0, orders: new Set<string>() }
      entry.revenue += fact.amount
      entry.units += fact.quantity
      entry.orders.add(fact.orderId)
      current.set(fact.productId, entry)
    } else if (inRange(fact.date, period.previousStart, period.previousEnd)) {
      previous.set(fact.productId, (previous.get(fact.productId) ?? 0) + fact.amount)
    }
  }

  const products = data.products.filter((product) => matchesUnit(unit, product.businessUnit))
  const totalRevenue = [...current.values()].reduce((sum, entry) => sum + entry.revenue, 0)

  return products
    .map((product) => {
      const entry = current.get(product.id)
      const revenue = entry?.revenue ?? 0
      const previousRevenue = previous.get(product.id) ?? 0
      return {
        product,
        revenue,
        units: entry?.units ?? 0,
        orders: entry?.orders.size ?? 0,
        previousRevenue,
        deltaPct: deltaPct(revenue, previousRevenue),
        share: totalRevenue ? revenue / totalRevenue : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue || a.product.name.localeCompare(b.product.name, 'es-MX'))
}

export function getProductHighlights(rows: ProductPerformance[], count = 5) {
  return {
    top: rows.filter((row) => row.revenue > 0).slice(0, count),
    bottom: [...rows].sort((a, b) => a.revenue - b.revenue || a.product.name.localeCompare(b.product.name, 'es-MX')).slice(0, count),
    falling: rows
      .filter((row) => row.deltaPct !== null && row.deltaPct < 0)
      .sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0))
      .slice(0, count),
  }
}

export interface CategoryPerformance {
  category: string
  businessUnit: BusinessUnit
  revenue: number
  previousRevenue: number
  deltaPct: number | null
  units: number
}

export function getCategoryPerformance(data: CommercialData, period: ResolvedPeriod, unit: UnitFilter = 'todas'): CategoryPerformance[] {
  const byCategory = new Map<string, CategoryPerformance>()
  for (const row of getProductPerformance(data, period, unit)) {
    const key = `${row.product.businessUnit}:${row.product.category}`
    const entry = byCategory.get(key) ?? { category: row.product.category, businessUnit: row.product.businessUnit, revenue: 0, previousRevenue: 0, deltaPct: null, units: 0 }
    entry.revenue += row.revenue
    entry.previousRevenue += row.previousRevenue
    entry.units += row.units
    byCategory.set(key, entry)
  }
  return [...byCategory.values()]
    .map((entry) => ({ ...entry, deltaPct: deltaPct(entry.revenue, entry.previousRevenue) }))
    .sort((a, b) => b.revenue - a.revenue)
}

const lastSaleByProduct = (data: CommercialData, until: string) => {
  const last = new Map<string, string>()
  for (const fact of getSalesFacts(data)) {
    if (fact.date > until) continue
    const current = last.get(fact.productId)
    if (!current || fact.date > current) last.set(fact.productId, fact.date)
  }
  return last
}

export interface SlowMover {
  product: CommercialProduct
  lastSaleDate: string | null
  /** Días desde la última venta; `null` si no hay ventas en el historial disponible. */
  daysSinceLastSale: number | null
  stockValue: number
}

/** Productos con existencia que no se venden desde hace al menos `minDays` días. */
export function getSlowMovers(data: CommercialData, minDays: number): SlowMover[] {
  const last = lastSaleByProduct(data, data.asOf)
  return data.products
    .filter((product) => product.stock > 0)
    .map((product) => {
      const lastSaleDate = last.get(product.id) ?? null
      return {
        product,
        lastSaleDate,
        daysSinceLastSale: lastSaleDate ? daysBetween(lastSaleDate, data.asOf) : null,
        stockValue: product.stock * product.unitPrice,
      }
    })
    .filter((row) => row.daysSinceLastSale === null || row.daysSinceLastSale >= minDays)
    .sort((a, b) => b.stockValue - a.stockValue)
}

export interface StockoutWithDemand {
  product: CommercialProduct
  unitsInWindow: number
  revenueInWindow: number
  lastSaleDate: string
}

/** Productos agotados que sí tuvieron venta en los últimos `windowDays` días. */
export function getStockoutsWithDemand(data: CommercialData, windowDays = 30): StockoutWithDemand[] {
  const start = addDays(data.asOf, -(windowDays - 1))
  const outOfStock = new Map(data.products.filter((product) => product.stock <= 0).map((product) => [product.id, product]))
  const byProduct = new Map<string, StockoutWithDemand>()

  for (const fact of getSalesFacts(data)) {
    const product = outOfStock.get(fact.productId)
    if (!product || !inRange(fact.date, start, data.asOf)) continue
    const entry = byProduct.get(product.id) ?? { product, unitsInWindow: 0, revenueInWindow: 0, lastSaleDate: fact.date }
    entry.unitsInWindow += fact.quantity
    entry.revenueInWindow += fact.amount
    if (fact.date > entry.lastSaleDate) entry.lastSaleDate = fact.date
    byProduct.set(product.id, entry)
  }
  return [...byProduct.values()].sort((a, b) => b.revenueInWindow - a.revenueInWindow)
}

// ── Negocio, metas y series ─────────────────────────────────────────────────

export interface UnitSummary {
  sales: number
  previousSales: number
  deltaPct: number | null
  orders: number
  averageTicket: number
}

const summarize = (orders: { date: string; amount: number }[], period: ResolvedPeriod): UnitSummary => {
  const current = orders.filter((order) => inRange(order.date, period.start, period.end))
  const sales = current.reduce((sum, order) => sum + order.amount, 0)
  const previousSales = orders.filter((order) => inRange(order.date, period.previousStart, period.previousEnd)).reduce((sum, order) => sum + order.amount, 0)
  return {
    sales,
    previousSales,
    deltaPct: deltaPct(sales, previousSales),
    orders: current.length,
    averageTicket: current.length ? Math.round(sales / current.length) : 0,
  }
}

export function getBusinessUnitSummary(data: CommercialData, period: ResolvedPeriod): Record<BusinessUnit | 'total', UnitSummary> {
  const mitra = summarize(data.wholesaleOrders, period)
  const mitraclick = summarize(data.retailOrders, period)
  const sales = mitra.sales + mitraclick.sales
  const previousSales = mitra.previousSales + mitraclick.previousSales
  const orders = mitra.orders + mitraclick.orders
  return {
    mitra,
    mitraclick,
    total: { sales, previousSales, deltaPct: deltaPct(sales, previousSales), orders, averageTicket: orders ? Math.round(sales / orders) : 0 },
  }
}

export interface GoalProgress {
  goal: number
  monthToDate: number
  /** Venta esperada a la fecha si el mes avanzara lineal hacia la meta. */
  expectedToDate: number
  /** Venta real / esperada a la fecha (1 = en ritmo). */
  pace: number
  /** Cierre proyectado al ritmo actual. */
  projected: number
  /** Cierre proyectado / meta. */
  projectedAttainment: number
}

export function getGoalProgress(data: CommercialData): Record<BusinessUnit, GoalProgress> {
  const month = monthOf(data.asOf)
  const totalDays = daysInMonth(data.asOf)
  const elapsed = Number(data.asOf.slice(8, 10))
  const progress = (unit: BusinessUnit, orders: { date: string; amount: number }[]): GoalProgress => {
    const goal = data.goals.find((item) => item.month === month && item.businessUnit === unit)?.amount ?? 0
    const monthToDate = orders.filter((order) => monthOf(order.date) === month && order.date <= data.asOf).reduce((sum, order) => sum + order.amount, 0)
    const expectedToDate = Math.round((goal * elapsed) / totalDays)
    const projected = Math.round((monthToDate / elapsed) * totalDays)
    return {
      goal,
      monthToDate,
      expectedToDate,
      pace: expectedToDate ? round2(monthToDate / expectedToDate) : 0,
      projected,
      projectedAttainment: goal ? round2(projected / goal) : 0,
    }
  }
  return { mitra: progress('mitra', data.wholesaleOrders), mitraclick: progress('mitraclick', data.retailOrders) }
}

export interface DailyPoint {
  date: string
  mitra: number
  mitraclick: number
}

export function getDailySeries(data: CommercialData, period: ResolvedPeriod): DailyPoint[] {
  const points = new Map<string, DailyPoint>()
  for (let offset = 0; offset < period.days; offset += 1) {
    const date = addDays(period.start, offset)
    points.set(date, { date, mitra: 0, mitraclick: 0 })
  }
  for (const order of data.wholesaleOrders) {
    const point = points.get(order.date)
    if (point) point.mitra += order.amount
  }
  for (const order of data.retailOrders) {
    const point = points.get(order.date)
    if (point) point.mitraclick += order.amount
  }
  return [...points.values()]
}
