// ── Generador demo de datos comerciales ──────────────────────────────────────
// 90 días deterministas hasta `asOf` (misma fecha → mismos datos).
// Patrones del negocio (heredados del Dashboard V1):
//  · Mitra mayorista ~65 % del ingreso, débil en fin de semana, vendido por vendedores.
//  · Mitra Click ~35 %, ticket $1,800–4,500, fuerte en fin de semana.
//  · Conversión e-commerce 1.8–3.2 %.
// Perfiles de vendedor intencionales para la demo: estrellas, en meta, en riesgo
// y uno que dejó de vender hace 12 días.

import type {
  CommercialData,
  CommercialProduct,
  MonthlyGoal,
  OrderLine,
  RetailChannel,
  RetailOrder,
  SalesRep,
  TrafficDay,
  WholesaleClient,
  WholesaleOrder,
  WholesaleQuote,
} from '../../domain'
import { addDays, dayOfWeek, daysBetween, daysInMonth, monthOf } from '../../commercial/dates'
import { makeRng } from './prng'
import {
  REPS,
  RETAIL_CHANNELS,
  RETAIL_CHANNEL_WEIGHTS,
  RETAIL_PRODUCTS,
  WHOLESALE_CLIENT_NAMES,
  WHOLESALE_PRODUCTS,
} from './catalog'

const SEED = 20260922
const HISTORY_DAYS = 90
/** Ajusta el tamaño de pedido mayorista (~$27k promedio, ~5 pedidos por día hábil). */
const WHOLESALE_QTY_SCALE = 0.45

/** Productos mayoristas que dejaron de moverse hace N días (señal de "sin movimiento"). */
const WHOLESALE_STOPPED: Record<string, number> = { W005: 41, W006: 67, W028: 95 }
/** Agotados: se siguen pidiendo, pero no hay existencia. */
const OUT_OF_STOCK = new Set(['W010', 'W015', 'P017', 'P022', 'P031', 'P053', 'P057', 'P010', 'P047', 'P036'])

const CLIENT_TYPES: WholesaleClient['type'][] = ['Constructora', 'Industria', 'Taller', 'Revendedor']

export function generateCommercialData({ asOf, now = new Date() }: { asOf: string; now?: Date }): CommercialData {
  const rng = makeRng(SEED)
  const start = addDays(asOf, -(HISTORY_DAYS - 1))

  const reps: SalesRep[] = REPS.map(({ id, name, zone, monthlyQuota }) => ({ id, name, zone, monthlyQuota, active: true }))

  // Cartera: cada cliente pertenece a un vendedor (reparto circular determinista).
  const clients: WholesaleClient[] = WHOLESALE_CLIENT_NAMES.map((name, index) => ({
    id: `CL${String(index + 1).padStart(3, '0')}`,
    name,
    type: CLIENT_TYPES[rng.weighted([5, 4, 2, 2])],
    repId: REPS[index % REPS.length].id,
  }))
  const clientsByRep = new Map(REPS.map((rep) => [rep.id, clients.filter((client) => client.repId === rep.id)]))

  const retailWeights = RETAIL_PRODUCTS.map((product) => product.pop)

  const wholesaleOrders: WholesaleOrder[] = []
  const retailOrders: RetailOrder[] = []
  const quotes: WholesaleQuote[] = []
  const traffic: TrafficDay[] = []
  let orderSeq = 4180
  let retailSeq = 2304
  let quoteSeq = 1530

  for (let dayIndex = 0; dayIndex < HISTORY_DAYS; dayIndex += 1) {
    const date = addDays(start, dayIndex)
    const dow = dayOfWeek(date)
    const daysAgo = daysBetween(date, asOf)
    const growth = 1 + (dayIndex / HISTORY_DAYS) * 0.12

    // — Vendedores activos este día y sus pesos —
    const activeReps = REPS.filter((rep) => rep.stoppedDaysAgo === undefined || daysAgo > rep.stoppedDaysAgo)
    const repWeights = activeReps.map((rep) => rep.weight)
    const wholesaleWeights = WHOLESALE_PRODUCTS.map((product) => {
      const stopped = WHOLESALE_STOPPED[product.id]
      return stopped !== undefined && daysAgo <= stopped ? 0 : product.pop
    })

    // — Mayorista: pedidos hasta alcanzar el objetivo del día —
    const wholesaleFactor = dow === 0 ? 0.15 : dow === 6 ? 0.5 : 1
    const wholesaleTarget = 132_000 * wholesaleFactor * growth * rng.range(0.78, 1.25)
    let wholesaleSum = 0
    while (wholesaleSum < wholesaleTarget && activeReps.length) {
      const rep = activeReps[rng.weighted(repWeights)]
      const client = rng.pick(clientsByRep.get(rep.id) ?? clients)
      const lineCount = rng.int(1, 3)
      const lines: OrderLine[] = []
      for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
        const product = WHOLESALE_PRODUCTS[rng.weighted(wholesaleWeights)]
        const quantity = Math.max(1, Math.round(rng.int(product.qty[0], product.qty[1]) * WHOLESALE_QTY_SCALE))
        lines.push({ productId: product.id, quantity, unitPrice: product.price, amount: quantity * product.price })
      }
      const amount = lines.reduce((sum, line) => sum + line.amount, 0)
      wholesaleOrders.push({
        id: `PED-${orderSeq++}`,
        date,
        clientId: client.id,
        repId: rep.id,
        amount,
        status: daysAgo <= 3 && rng.chance(0.55) ? 'pendiente' : 'surtido',
        lines,
      })
      wholesaleSum += amount
    }

    // — Mitra Click: órdenes Shopify —
    const retailFactor = dow === 0 ? 1.15 : dow === 6 ? 1.3 : 1
    const retailTarget = 68_000 * retailFactor * growth * rng.range(0.72, 1.3)
    let retailSum = 0
    let retailCount = 0
    while (retailSum < retailTarget) {
      const itemCount = rng.weighted([6, 3, 1]) + 1
      const lines: OrderLine[] = []
      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const product = RETAIL_PRODUCTS[rng.weighted(retailWeights)]
        const quantity = rng.chance(0.88) ? 1 : 2
        lines.push({ productId: product.id, quantity, unitPrice: product.price, amount: quantity * product.price })
      }
      const amount = lines.reduce((sum, line) => sum + line.amount, 0)
      retailOrders.push({
        id: `MC-${retailSeq++}`,
        date,
        channel: RETAIL_CHANNELS[rng.weighted(RETAIL_CHANNEL_WEIGHTS)] as RetailChannel,
        amount,
        status: daysAgo <= 2 && rng.chance(0.5) ? 'pendiente' : daysAgo <= 6 ? 'enviado' : 'entregado',
        lines,
      })
      retailSum += amount
      retailCount += 1
    }

    // — Embudo e-commerce —
    const conversion = rng.range(0.018, 0.032)
    const visits = Math.round(retailCount / conversion)
    const carts = Math.round(visits * rng.range(0.06, 0.09))
    traffic.push({
      date,
      visits,
      productViews: Math.round(visits * rng.range(0.5, 0.65)),
      carts,
      checkouts: Math.max(retailCount, Math.round(carts * rng.range(0.45, 0.6))),
      orders: retailCount,
    })

    // — Cotizaciones mayoristas (principalmente entre semana) —
    const quoteCount = dow === 0 ? 0 : dow === 6 ? rng.int(0, 2) : rng.int(3, 7)
    for (let quoteIndex = 0; quoteIndex < quoteCount && activeReps.length; quoteIndex += 1) {
      const rep = activeReps[rng.weighted(repWeights)]
      const client = rng.pick(clientsByRep.get(rep.id) ?? clients)
      let status: WholesaleQuote['status']
      if (daysAgo <= 1) status = 'enviada'
      else if (daysAgo <= 6) status = rng.pick(['enviada', 'enviada', 'negociacion', 'ganada'] as const)
      else if (daysAgo <= 14) status = rng.pick(['ganada', 'ganada', 'perdida', 'negociacion', 'enviada'] as const)
      else status = rng.pick(['ganada', 'ganada', 'ganada', 'perdida', 'perdida', 'negociacion'] as const)
      const closed = status === 'ganada' || status === 'perdida'
      quotes.push({
        id: `COT-${quoteSeq++}`,
        date,
        clientId: client.id,
        repId: rep.id,
        amount: Math.round(rng.range(18_000, 85_000) / 100) * 100,
        status,
        ...(closed ? { closedDate: addDays(date, Math.min(rng.int(3, 15), Math.max(1, daysAgo))) } : {}),
      })
    }
  }

  const products: CommercialProduct[] = [
    ...RETAIL_PRODUCTS.map((seed) => ({
      id: seed.id,
      sku: `MC-${seed.id}`,
      name: seed.name,
      brand: seed.brand,
      category: seed.category,
      businessUnit: 'mitraclick' as const,
      unitPrice: seed.price,
      unit: 'pieza',
      stock: OUT_OF_STOCK.has(seed.id) ? 0 : rng.int(2, 38),
      reorderPoint: 5,
    })),
    ...WHOLESALE_PRODUCTS.map((seed) => ({
      id: seed.id,
      sku: `MI-${seed.id}`,
      name: seed.name,
      brand: seed.brand,
      category: seed.category,
      businessUnit: 'mitra' as const,
      unitPrice: seed.price,
      unit: seed.unit,
      stock: OUT_OF_STOCK.has(seed.id) ? 0 : rng.int(seed.qty[1], seed.qty[1] * 6),
      reorderPoint: seed.qty[1],
    })),
  ]

  // — Metas del mes: ritmo del mes en curso + 6 % (mayorista) / 8 % (Click) —
  const month = monthOf(asOf)
  const monthDays = daysInMonth(asOf)
  const elapsed = Number(asOf.slice(8, 10))
  const monthSales = (orders: { date: string; amount: number }[]) =>
    orders.filter((order) => monthOf(order.date) === month).reduce((sum, order) => sum + order.amount, 0)
  const pace = (total: number) => (total / Math.max(1, elapsed)) * monthDays
  const goals: MonthlyGoal[] = [
    { month, businessUnit: 'mitra', amount: Math.round((pace(monthSales(wholesaleOrders)) * 1.06) / 50_000) * 50_000 },
    { month, businessUnit: 'mitraclick', amount: Math.round((pace(monthSales(retailOrders)) * 1.08) / 25_000) * 25_000 },
  ]

  return {
    source: 'demo',
    asOf,
    generatedAt: now.toISOString(),
    reps,
    products,
    clients,
    wholesaleOrders,
    retailOrders,
    quotes,
    traffic,
    goals,
  }
}
