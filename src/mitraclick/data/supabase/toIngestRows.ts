// Convierte `CommercialData` al formato de carga de `ingest_batch` (campos en español
// del contrato del ERP). Sirve para sembrar los datos simulados en Supabase como
// fuente `demo` y probar el flujo completo, y documenta en código el formato esperado.

import type { CommercialData, OrderLine } from '../../domain'

export const INGEST_ORDER = ['vendedores', 'cuotas', 'metas', 'productos', 'existencias', 'clientes', 'pedidos', 'ordenes', 'cotizaciones', 'trafico'] as const
export type IngestEntity = (typeof INGEST_ORDER)[number]

type IngestValue = string | number | boolean | null | IngestLine[]
export type IngestRow = Record<string, IngestValue>
interface IngestLine {
  linea: number
  producto_id: string
  cantidad: number
  precio_unitario: number
  importe: number
  [key: string]: string | number
}

const lines = (items: OrderLine[]): IngestLine[] =>
  items.map((line, index) => ({ linea: index + 1, producto_id: line.productId, cantidad: line.quantity, precio_unitario: line.unitPrice, importe: line.amount }))

export function toIngestRows(data: CommercialData): Record<IngestEntity, IngestRow[]> {
  const month = data.asOf.slice(0, 7)
  return {
    vendedores: data.reps.map((rep) => ({ id: rep.id, nombre: rep.name, zona: rep.zone, activo: rep.active })),
    cuotas: data.reps.map((rep) => ({ vendedor_id: rep.id, mes: month, importe: rep.monthlyQuota })),
    metas: data.goals.map((goal) => ({ mes: goal.month, unidad: goal.businessUnit, importe: goal.amount })),
    productos: data.products.map((product) => ({
      id: product.id,
      sku: product.sku,
      nombre: product.name,
      marca: product.brand,
      categoria: product.category,
      unidad_negocio: product.businessUnit,
      unidad: product.unit,
      precio_lista: product.unitPrice,
      punto_reorden: product.reorderPoint,
    })),
    existencias: data.products.map((product) => ({ producto_id: product.id, bodega: 'principal', existencia: product.stock, fecha_corte: data.asOf })),
    clientes: data.clients.map((client) => ({ id: client.id, nombre: client.name, tipo: client.type, vendedor_id: client.repId })),
    pedidos: data.wholesaleOrders.map((order) => ({
      folio: order.id,
      fecha: order.date,
      cliente_id: order.clientId,
      vendedor_id: order.repId,
      importe: order.amount,
      estatus: order.status,
      lineas: lines(order.lines),
    })),
    ordenes: data.retailOrders.map((order) => ({
      folio: order.id,
      fecha: order.date,
      canal: order.channel,
      importe: order.amount,
      estatus: order.status,
      lineas: lines(order.lines),
    })),
    cotizaciones: data.quotes.map((quote) => ({
      folio: quote.id,
      fecha: quote.date,
      cliente_id: quote.clientId,
      vendedor_id: quote.repId,
      importe: quote.amount,
      estatus: quote.status,
      fecha_cierre: quote.closedDate ?? null,
    })),
    trafico: data.traffic.map((day) => ({
      fecha: day.date,
      visitas: day.visits,
      vistas_producto: day.productViews,
      carritos: day.carts,
      checkouts: day.checkouts,
      ordenes: day.orders,
    })),
  }
}
