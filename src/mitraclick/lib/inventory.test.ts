import { describe, expect, it } from 'vitest'
import { countOutcome, toMovementRow, validateMovement, type MovementDraft } from './inventory'

const base: MovementDraft = { type: 'entrada', productId: 'p1', locationId: 'l1', quantity: '5', reason: '' }

describe('validateMovement', () => {
  it('acepta una entrada completa', () => {
    expect(validateMovement(base, 0)).toEqual({ errors: {}, warning: null })
  })

  it('exige producto, ubicación y una cantidad mayor que cero', () => {
    expect(validateMovement({ ...base, productId: '', locationId: '', quantity: '0' }, 0).errors).toEqual({
      productId: 'Elige un producto.',
      locationId: 'Elige una ubicación.',
      quantity: 'La cantidad debe ser mayor que cero.',
    })
    expect(validateMovement({ ...base, quantity: 'doce' }, 0).errors).toEqual({ quantity: 'La cantidad debe ser un número.' })
  })

  it('en un traspaso exige un destino distinto del origen', () => {
    expect(validateMovement({ ...base, type: 'traspaso' }, 10).errors).toEqual({ toLocationId: 'Elige la ubicación de destino.' })
    expect(validateMovement({ ...base, type: 'traspaso', toLocationId: 'l1' }, 10).errors).toEqual({ toLocationId: 'El destino debe ser distinto del origen.' })
  })

  it('en un ajuste exige motivo y permite cantidades negativas, pero no cero', () => {
    expect(validateMovement({ ...base, type: 'ajuste', quantity: '-7' }, 10).errors).toEqual({ reason: 'El ajuste necesita un motivo.' })
    expect(validateMovement({ ...base, type: 'ajuste', quantity: '-7', reason: 'Merma' }, 10).errors).toEqual({})
    expect(validateMovement({ ...base, type: 'ajuste', quantity: '0', reason: 'x' }, 10).errors).toEqual({ quantity: 'La cantidad no puede ser cero.' })
  })

  it('avisa, sin bloquear, cuando la salida deja la existencia en negativo', () => {
    expect(validateMovement({ ...base, type: 'salida', quantity: '8' }, 5)).toEqual({ errors: {}, warning: 'La existencia registrada es 5; quedaría en -3.' })
    expect(validateMovement({ ...base, type: 'salida', quantity: '5' }, 5).warning).toBeNull()
    expect(validateMovement({ ...base, type: 'salida', quantity: '1' }, null).warning).toBeNull()
  })
})

describe('toMovementRow', () => {
  it('pone el signo según el tipo', () => {
    expect(toMovementRow({ ...base, reason: ' Compra ' })).toEqual({ product_id: 'p1', location_id: 'l1', movement_type: 'entrada', quantity_delta: 5, reason: 'Compra' })
    expect(toMovementRow({ ...base, type: 'salida' })).toEqual({ product_id: 'p1', location_id: 'l1', movement_type: 'salida', quantity_delta: -5, reason: null })
    expect(toMovementRow({ ...base, type: 'ajuste', quantity: '-2', reason: 'Merma' }).quantity_delta).toBe(-2)
  })
})

describe('countOutcome', () => {
  it('calcula la diferencia contra el sistema', () => {
    expect(countOutcome(13, 20)).toEqual({ difference: -7, status: 'pendiente', label: 'Faltan 7' })
    expect(countOutcome(22.5, 20)).toEqual({ difference: 2.5, status: 'pendiente', label: 'Sobran 2.5' })
    expect(countOutcome(20, 20)).toEqual({ difference: 0, status: 'sin_diferencia', label: 'Sin diferencia' })
  })

  it('no arrastra errores de punto flotante', () => {
    expect(countOutcome(0.3, 0.1).difference).toBe(0.2)
  })
})
