import { describe, expect, it } from 'vitest'
import { attentionItems, changePct, marginNote, type OperationsKpis } from './kpis'

describe('changePct', () => {
  it('calcula el cambio contra el periodo anterior', () => {
    expect(changePct(120, 100)).toBe(20)
    expect(changePct(75, 100)).toBe(-25)
    expect(changePct(100, 100)).toBe(0)
  })

  it('no inventa un porcentaje cuando no hay base de comparación', () => {
    expect(changePct(500, 0)).toBeUndefined()
    expect(changePct(0, 0)).toBeUndefined()
  })

  it('redondea a un decimal', () => {
    expect(changePct(1, 3)).toBe(-66.7)
  })
})

describe('marginNote', () => {
  it('avisa cuando no hay costos para calcular el margen', () => {
    expect(marginNote(null, 0)).toBe('Sin costos capturados: no se puede calcular.')
  })

  it('indica la cobertura cuando el margen es parcial', () => {
    expect(marginNote(0.31, 0.62)).toBe('Calculado sobre el 62% de la venta (el resto no tiene costo).')
  })

  it('no agrega nota cuando casi toda la venta tiene costo', () => {
    expect(marginNote(0.31, 0.98)).toBeUndefined()
  })
})

describe('attentionItems', () => {
  const zero: OperationsKpis = {
    orders_in_process: 0, orders_to_deliver: 0, orders_late: 0, purchases_pending: 0, shipments_pending: 0, remissions_to_verify: 0,
    incidents_open: 0, counts_pending: 0, stock_negative: 0, stock_low: 0, stock_movements: 0, issues_open: 0, issues_high: 0, alerts_new: 0,
    days_order_to_delivery: null, days_purchase_to_receipt: null, days_invoice_to_payment: null,
  }

  it('sin excepciones no hay nada que atender', () => {
    expect(attentionItems(zero)).toEqual([])
  })

  it('lista solo lo que tiene casos, lo urgente primero, con su link', () => {
    const items = attentionItems({ ...zero, remissions_to_verify: 3, orders_late: 2, stock_low: 4, orders_in_process: 9 })
    expect(items.map((item) => [item.label, item.count, item.to, item.urgent])).toEqual([
      ['Pedidos atrasados contra su fecha prometida', 2, '/pedidos', true],
      ['Remisiones por verificar', 3, '/remisiones?estado=entregada', false],
      ['Productos en punto de reorden', 4, '/inventario?estado=bajo', false],
    ])
  })
})
