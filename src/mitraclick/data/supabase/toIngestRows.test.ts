import { describe, expect, it } from 'vitest'
import { generateCommercialData } from '../demo/generateCommercialData'
import { INGEST_ORDER, toIngestRows } from './toIngestRows'

const data = generateCommercialData({ asOf: '2026-09-22', now: new Date('2026-09-22T12:00:00Z') })

describe('toIngestRows', () => {
  const rows = toIngestRows(data)

  it('produce una carga por entidad, en orden de dependencias', () => {
    expect(INGEST_ORDER).toEqual(['vendedores', 'cuotas', 'metas', 'productos', 'existencias', 'clientes', 'pedidos', 'ordenes', 'cotizaciones', 'trafico'])
    expect(Object.keys(rows).sort()).toEqual([...INGEST_ORDER].sort())
  })

  it('usa los nombres de campo del contrato del ERP', () => {
    expect(rows.vendedores[0]).toEqual({ id: 'rep-1', nombre: 'Ricardo Castillo', zona: 'CDMX Norte', activo: true })
    expect(rows.cuotas[0]).toEqual({ vendedor_id: 'rep-1', mes: '2026-09', importe: 650000 })
    expect(Object.keys(rows.productos[0]).sort()).toEqual(['categoria', 'id', 'marca', 'nombre', 'precio_lista', 'punto_reorden', 'sku', 'unidad', 'unidad_negocio'])
    expect(rows.existencias[0]).toMatchObject({ producto_id: data.products[0].id, bodega: 'principal', existencia: data.products[0].stock })
  })

  it('lleva los pedidos con sus líneas y la referencia a producto', () => {
    const order = data.wholesaleOrders[0]
    expect(rows.pedidos[0]).toEqual({
      folio: order.id,
      fecha: order.date,
      cliente_id: order.clientId,
      vendedor_id: order.repId,
      importe: order.amount,
      estatus: order.status,
      lineas: order.lines.map((line, index) => ({ linea: index + 1, producto_id: line.productId, cantidad: line.quantity, precio_unitario: line.unitPrice, importe: line.amount })),
    })
    expect(rows.pedidos).toHaveLength(data.wholesaleOrders.length)
    expect(rows.ordenes).toHaveLength(data.retailOrders.length)
    expect(rows.ordenes[0]).toHaveProperty('canal', data.retailOrders[0].channel)
  })

  it('incluye cotizaciones cerradas con fecha de cierre y tráfico diario', () => {
    const closed = rows.cotizaciones.find((quote) => quote.fecha_cierre)
    expect(closed).toBeDefined()
    expect(rows.trafico[0]).toEqual({ fecha: data.traffic[0].date, visitas: data.traffic[0].visits, vistas_producto: data.traffic[0].productViews, carritos: data.traffic[0].carts, checkouts: data.traffic[0].checkouts, ordenes: data.traffic[0].orders })
    expect(rows.metas).toEqual(data.goals.map((goal) => ({ mes: goal.month, unidad: goal.businessUnit, importe: goal.amount })))
  })
})
