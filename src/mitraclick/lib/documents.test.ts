import { describe, expect, it } from 'vitest'
import { documentTotals, invoiceBalance, lineAmount, nextStatuses, pendingQuantity, statusLabel, validateLines, type DraftLine } from './documents'

const line = (changes: Partial<DraftLine> = {}): DraftLine => ({ productId: 'p1', description: 'Taladro', quantity: '2', unitPrice: '100', discountPct: '0', ...changes })

describe('lineAmount', () => {
  it('multiplica cantidad por precio y aplica el descuento', () => {
    expect(lineAmount(2, 100, 0)).toBe(200)
    expect(lineAmount(3, 19.99, 10)).toBe(53.97)
  })

  it('redondea a centavos sin errores de punto flotante', () => {
    expect(lineAmount(3, 0.1, 0)).toBe(0.3)
    expect(lineAmount(1, 1.005, 0)).toBe(1.01)
  })
})

describe('documentTotals', () => {
  it('suma renglones, calcula IVA sobre el subtotal y agrega el envío', () => {
    expect(documentTotals([line(), line({ quantity: '1', unitPrice: '50', discountPct: '20' })], { shipping: 99 })).toEqual({ subtotal: 240, tax: 38.4, shipping: 99, total: 377.4 })
  })

  it('ignora renglones incompletos mientras se capturan', () => {
    expect(documentTotals([line(), line({ quantity: '', unitPrice: 'abc' })])).toEqual({ subtotal: 200, tax: 32, shipping: 0, total: 232 })
  })

  it('un documento vacío vale cero', () => {
    expect(documentTotals([])).toEqual({ subtotal: 0, tax: 0, shipping: 0, total: 0 })
  })
})

describe('validateLines', () => {
  it('acepta renglones completos', () => {
    expect(validateLines([line()])).toEqual([])
  })

  it('exige al menos un renglón', () => {
    expect(validateLines([])).toEqual(['Agrega al menos un renglón.'])
  })

  it('señala cada problema con su número de renglón', () => {
    expect(validateLines([line(), line({ description: ' ', quantity: '0', unitPrice: '-1', discountPct: '120' })])).toEqual([
      'Renglón 2: falta la descripción.',
      'Renglón 2: la cantidad debe ser mayor que cero.',
      'Renglón 2: el precio no puede ser negativo.',
      'Renglón 2: el descuento debe estar entre 0 y 100.',
    ])
  })

  it('en compras exige producto', () => {
    expect(validateLines([line({ productId: '' })], { requireProduct: true })).toEqual(['Renglón 1: elige un producto.'])
  })
})

describe('nextStatuses', () => {
  it('una cotización avanza hasta ganarse o perderse, y ahí termina', () => {
    expect(nextStatuses('quote', 'borrador')).toEqual(['enviada'])
    expect(nextStatuses('quote', 'enviada')).toEqual(['negociacion', 'perdida', 'vencida'])
    expect(nextStatuses('quote', 'ganada')).toEqual([])
  })

  it('un pedido entregado o cancelado ya no cambia', () => {
    expect(nextStatuses('order', 'nuevo')).toEqual(['confirmado', 'cancelado'])
    expect(nextStatuses('order', 'entregado')).toEqual([])
    expect(nextStatuses('order', 'cancelado')).toEqual([])
  })

  it('un estado desconocido no tiene salidas', () => {
    expect(nextStatuses('purchase', 'inventado')).toEqual([])
  })
})

describe('statusLabel', () => {
  it('presenta en español los estados de cotizaciones de flete y viajes', () => {
    expect(statusLabel('solicitada')).toBe('Solicitada')
    expect(statusLabel('cotizada')).toBe('Cotizada')
    expect(statusLabel('aceptada')).toBe('Aceptada')
    expect(statusLabel('completado')).toBe('Completado')
  })
})

describe('invoiceBalance', () => {
  it('sin pagos queda emitida con todo el saldo', () => {
    expect(invoiceBalance(1160, [])).toEqual({ paid: 0, balance: 1160, status: 'emitida' })
  })

  it('con pagos parciales queda parcial', () => {
    expect(invoiceBalance(1160, [500, 160.1])).toEqual({ paid: 660.1, balance: 499.9, status: 'parcial' })
  })

  it('al cubrir el total queda pagada, sin saldo negativo', () => {
    expect(invoiceBalance(1160, [1000, 160])).toEqual({ paid: 1160, balance: 0, status: 'pagada' })
  })
})

describe('pendingQuantity', () => {
  it('lo pedido menos lo ya surtido o recibido, nunca negativo', () => {
    expect(pendingQuantity(10, 4)).toBe(6)
    expect(pendingQuantity(10, 10)).toBe(0)
    expect(pendingQuantity(10, 12)).toBe(0)
    expect(pendingQuantity(0.3, 0.1)).toBe(0.2)
  })
})
