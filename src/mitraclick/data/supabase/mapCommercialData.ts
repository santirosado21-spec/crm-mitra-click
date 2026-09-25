// Convierte las filas de Supabase en `CommercialData`, el contrato que consumen
// los selectores y las pantallas. Función pura: no toca la red.

import type { CommercialData, RetailOrder, WholesaleOrder } from '../../domain'
import type { Tables } from './database.types'

type WholesaleOrderRow = Tables<'wholesale_orders'> & { wholesale_order_lines: Tables<'wholesale_order_lines'>[] }
type RetailOrderRow = Tables<'retail_orders'> & { retail_order_lines: Tables<'retail_order_lines'>[] }

export interface CommercialRows {
  reps: Tables<'sales_reps'>[]
  quotas: Tables<'rep_monthly_quotas'>[]
  goals: Tables<'business_goals'>[]
  products: Tables<'products'>[]
  inventory: Tables<'inventory_levels'>[]
  clients: Tables<'clients'>[]
  wholesaleOrders: WholesaleOrderRow[]
  retailOrders: RetailOrderRow[]
  quotes: Tables<'wholesale_quotes'>[]
  traffic: Tables<'ecommerce_traffic_daily'>[]
}

/** PostgREST puede devolver `numeric` como texto; siempre normalizamos a número. */
const toNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value ?? 0
  return Number.isFinite(parsed) ? parsed : 0
}

type Line = Tables<'wholesale_order_lines'> | Tables<'retail_order_lines'>
const mapLines = (lines: Line[]) =>
  [...lines]
    .sort((a, b) => a.line_number - b.line_number)
    .map((line) => ({
      productId: line.product_id,
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unit_price),
      amount: toNumber(line.amount),
    }))

export function mapCommercialData(rows: CommercialRows, { asOf, generatedAt }: { asOf: string; generatedAt: string }): CommercialData {
  const currentMonth = `${asOf.slice(0, 7)}-01`
  const quotaByRep = new Map(rows.quotas.filter((quota) => quota.month === currentMonth).map((quota) => [quota.rep_id, toNumber(quota.amount)]))

  const stockByProduct = new Map<string, number>()
  for (const level of rows.inventory) {
    stockByProduct.set(level.product_id, (stockByProduct.get(level.product_id) ?? 0) + toNumber(level.quantity))
  }

  const wholesaleOrders: WholesaleOrder[] = rows.wholesaleOrders
    .filter((order) => order.status !== 'cancelado')
    .map((order) => ({
      id: order.external_id,
      date: order.order_date,
      clientId: order.client_id ?? '',
      repId: order.rep_id ?? '',
      amount: toNumber(order.amount),
      status: order.status === 'pendiente' ? 'pendiente' : 'surtido',
      lines: mapLines(order.wholesale_order_lines),
    }))

  const retailOrders: RetailOrder[] = rows.retailOrders
    .filter((order): order is RetailOrderRow & { status: RetailOrder['status'] } => order.status !== 'cancelado')
    .map((order) => ({
      id: order.external_id,
      date: order.order_date,
      channel: order.channel ?? 'Sin canal',
      amount: toNumber(order.amount),
      status: order.status,
      lines: mapLines(order.retail_order_lines),
    }))

  return {
    source: 'erp',
    asOf,
    generatedAt,
    reps: rows.reps.map((rep) => ({
      id: rep.id,
      name: rep.name,
      zone: rep.zone ?? 'Sin zona',
      monthlyQuota: quotaByRep.get(rep.id) ?? 0,
      active: rep.active,
    })),
    products: rows.products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      brand: product.brand ?? 'Sin marca',
      category: product.category ?? 'Sin categoría',
      businessUnit: product.business_unit,
      unitPrice: toNumber(product.list_price),
      unit: product.unit,
      stock: stockByProduct.get(product.id) ?? 0,
      reorderPoint: toNumber(product.reorder_point),
    })),
    clients: rows.clients.map((client) => ({
      id: client.id,
      name: client.name,
      type: client.client_type ?? 'Sin tipo',
      repId: client.rep_id ?? '',
    })),
    wholesaleOrders,
    retailOrders,
    quotes: rows.quotes.map((quote) => ({
      id: quote.external_id,
      date: quote.quote_date,
      clientId: quote.client_id ?? '',
      repId: quote.rep_id ?? '',
      amount: toNumber(quote.amount),
      status: quote.status,
      ...(quote.closed_date ? { closedDate: quote.closed_date } : {}),
    })),
    traffic: rows.traffic.map((day) => ({
      date: day.day,
      visits: day.visits,
      productViews: day.product_views,
      carts: day.carts,
      checkouts: day.checkouts,
      orders: day.orders,
    })),
    goals: rows.goals.map((goal) => ({ month: goal.month.slice(0, 7), businessUnit: goal.business_unit, amount: toNumber(goal.amount) })),
  }
}
