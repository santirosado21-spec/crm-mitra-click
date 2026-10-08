import { describe, expect, it } from 'vitest'
import {
  LOCATION_KINDS,
  MAX_LEVEL,
  MAX_POSITION,
  SMALL_WAREHOUSE,
  allocatePick,
  describeLayout,
  locationCode,
  parseLocationCode,
  pickOrder,
  planLayout,
  validateLayout,
  type StockAtLocation,
} from './warehouse'

describe('locationCode', () => {
  it('arma el código con la posición a dos dígitos', () => {
    expect(locationCode('A', 1, 1)).toBe('A-01-1')
    expect(locationCode('B', 12, 4)).toBe('B-12-4')
  })

  it('normaliza la zona a mayúsculas y sin espacios', () => {
    expect(locationCode(' a ', 3, 2)).toBe('A-03-2')
  })

  it('una zona sin posición ni nivel es su propio código', () => {
    expect(locationCode('RECEPCION')).toBe('RECEPCION')
    expect(locationCode('embarque', null, null)).toBe('EMBARQUE')
  })
})

describe('parseLocationCode', () => {
  it('lee zona, posición y nivel', () => {
    expect(parseLocationCode('A-01-1')).toEqual({ zone: 'A', position: 1, level: 1 })
    expect(parseLocationCode('C-12-4')).toEqual({ zone: 'C', position: 12, level: 4 })
  })

  it('lee una zona suelta', () => {
    expect(parseLocationCode('RECEPCION')).toEqual({ zone: 'RECEPCION', position: null, level: null })
  })

  it('devuelve null si no tiene la forma esperada', () => {
    expect(parseLocationCode('A-01-1-2')).toBeNull()
    expect(parseLocationCode('')).toBeNull()
    expect(parseLocationCode('A-xx-1')).toBeNull()
  })

  it('es el inverso de locationCode', () => {
    expect(parseLocationCode(locationCode('B', 7, 3))).toEqual({ zone: 'B', position: 7, level: 3 })
  })
})

describe('pickOrder', () => {
  it('recorre zona por zona, y dentro de cada zona por posición y luego por nivel', () => {
    const codes: [string, number, number][] = [['B', 1, 1], ['A', 2, 1], ['A', 1, 2], ['A', 1, 1]]
    const sorted = [...codes].sort((a, b) => pickOrder(...a) - pickOrder(...b))
    expect(sorted.map(([zone, position, level]) => locationCode(zone, position, level)))
      .toEqual(['A-01-1', 'A-01-2', 'A-02-1', 'B-01-1'])
  })

  it('toma primero el nivel bajo: lo que está a la mano', () => {
    expect(pickOrder('A', 1, 1)).toBeLessThan(pickOrder('A', 1, 4))
  })

  it('las zonas sin posición (recepción, embarque) van al final', () => {
    expect(pickOrder('EMBARQUE')).toBeGreaterThan(pickOrder('Z', 99, 9))
  })
})

describe('planLayout', () => {
  it('genera una zona completa de posiciones por niveles', () => {
    const rows = planLayout([{ zone: 'A', positions: 2, levels: 3 }])
    expect(rows).toHaveLength(6)
    expect(rows.map((row) => row.code)).toEqual(['A-01-1', 'A-01-2', 'A-01-3', 'A-02-1', 'A-02-2', 'A-02-3'])
  })

  it('marca el nivel 1 como picking y el resto como almacenaje', () => {
    const rows = planLayout([{ zone: 'A', positions: 1, levels: 3 }])
    expect(rows.map((row) => row.kind)).toEqual(['picking', 'almacenaje', 'almacenaje'])
  })

  it('una zona sin posiciones es una sola ubicación con su propio tipo', () => {
    const rows = planLayout([{ zone: 'RECEPCION', positions: 0, levels: 0, kind: 'recepcion' }])
    expect(rows).toEqual([{ code: 'RECEPCION', zone: 'RECEPCION', position: null, level: null, kind: 'recepcion', pick_order: pickOrder('RECEPCION'), description: null }])
  })

  it('numera el recorrido en orden y sin repetir', () => {
    const orders = planLayout([{ zone: 'B', positions: 2, levels: 2 }, { zone: 'A', positions: 2, levels: 2 }]).map((row) => row.pick_order)
    expect(new Set(orders).size).toBe(orders.length)
    expect([...orders].sort((a, b) => a - b)).not.toEqual(orders)
  })

  it('la plantilla de bodega chica da 100 ubicaciones con las cuatro zonas de servicio', () => {
    const rows = planLayout(SMALL_WAREHOUSE)
    expect(rows).toHaveLength(100)
    expect(rows.filter((row) => row.kind === 'picking')).toHaveLength(24)
    expect(rows.filter((row) => row.position === null).map((row) => row.code)).toEqual(['RECEPCION', 'EMBARQUE', 'DEVOLUCIONES', 'CUARENTENA'])
  })
})

describe('validateLayout', () => {
  it('acepta una zona razonable', () => {
    expect(validateLayout([{ zone: 'A', positions: 8, levels: 4 }])).toEqual([])
  })

  it('exige nombre de zona y rechaza duplicados', () => {
    expect(validateLayout([{ zone: '  ', positions: 1, levels: 1 }])).toEqual(['Zona 1: escribe el nombre.'])
    expect(validateLayout([{ zone: 'A', positions: 1, levels: 1 }, { zone: 'a', positions: 1, levels: 1 }]))
      .toEqual(['Zona 2: "A" está repetida.'])
  })

  it('rechaza cantidades imposibles y avisa si se pasa del tope', () => {
    expect(validateLayout([{ zone: 'A', positions: -1, levels: 1 }])).toEqual(['Zona A: las posiciones y los niveles no pueden ser negativos.'])
    expect(validateLayout([{ zone: 'A', positions: 200, levels: 9 }])).toEqual(['Zona A: 1,800 ubicaciones es demasiado para una zona; el máximo son 500.'])
  })
})

describe('describeLayout', () => {
  it('resume lo que se va a crear', () => {
    expect(describeLayout([{ zone: 'A', positions: 8, levels: 4 }, { zone: 'RECEPCION', positions: 0, levels: 0, kind: 'recepcion' }]))
      .toBe('33 ubicaciones: A (8 × 4) y RECEPCION.')
  })

  it('no inventa nada cuando no hay zonas', () => {
    expect(describeLayout([])).toBe('Sin zonas: no se creará ninguna ubicación.')
  })
})

describe('allocatePick', () => {
  const stock: StockAtLocation[] = [
    { locationId: 'l-b1', code: 'B-01-1', pick_order: 2000, quantity: 10 },
    { locationId: 'l-a1', code: 'A-01-1', pick_order: 1000, quantity: 4 },
    { locationId: 'l-a2', code: 'A-02-1', pick_order: 1100, quantity: 3 },
  ]

  it('toma de la ubicación más cercana al inicio del recorrido', () => {
    expect(allocatePick(stock, 3)).toEqual({ lines: [{ locationId: 'l-a1', code: 'A-01-1', pick_order: 1000, quantity: 3 }], missing: 0 })
  })

  it('reparte entre varias ubicaciones cuando una no alcanza, sin cruzar la bodega de más', () => {
    expect(allocatePick(stock, 6).lines).toEqual([
      { locationId: 'l-a1', code: 'A-01-1', pick_order: 1000, quantity: 4 },
      { locationId: 'l-a2', code: 'A-02-1', pick_order: 1100, quantity: 2 },
    ])
  })

  it('reporta lo que falta en vez de inventar existencia', () => {
    expect(allocatePick(stock, 20)).toEqual({
      lines: [
        { locationId: 'l-a1', code: 'A-01-1', pick_order: 1000, quantity: 4 },
        { locationId: 'l-a2', code: 'A-02-1', pick_order: 1100, quantity: 3 },
        { locationId: 'l-b1', code: 'B-01-1', pick_order: 2000, quantity: 10 },
      ],
      missing: 3,
    })
  })

  it('sin existencia, todo queda faltante', () => {
    expect(allocatePick([], 5)).toEqual({ lines: [], missing: 5 })
  })

  it('ignora ubicaciones en cero o en negativo', () => {
    expect(allocatePick([{ locationId: 'x', code: 'A-01-1', pick_order: 1, quantity: -2 }], 1)).toEqual({ lines: [], missing: 1 })
  })

  it('respeta decimales sin arrastrar error de punto flotante', () => {
    const partial: StockAtLocation[] = [{ locationId: 'x', code: 'A-01-1', pick_order: 1, quantity: 0.3 }]
    expect(allocatePick(partial, 0.1)).toEqual({ lines: [{ locationId: 'x', code: 'A-01-1', pick_order: 1, quantity: 0.1 }], missing: 0 })
    expect(allocatePick(partial, 0.4).missing).toBe(0.1)
  })
})

describe('LOCATION_KINDS', () => {
  it('cubre los tipos que usa la bodega y los nombra en español', () => {
    expect(Object.keys(LOCATION_KINDS)).toEqual(['almacenaje', 'picking', 'recepcion', 'embarque', 'devoluciones', 'cuarentena'])
    expect(LOCATION_KINDS.devoluciones).toBe('Devoluciones')
  })
})

describe('límites del orden de recorrido', () => {
  it('cabe en un integer de Postgres aun en el peor caso', () => {
    expect(pickOrder('ZZZ', MAX_POSITION, MAX_LEVEL)).toBeLessThan(2_147_483_647)
    expect(pickOrder('ZZZ')).toBeLessThan(2_147_483_647)
  })

  it('distingue zonas por sus tres primeros caracteres, incluidos dígitos', () => {
    const codes = ['A', 'A1', 'A2', 'B', 'PA1', 'PA2', 'REC', 'EMB']
    expect(new Set(codes.map((zone) => pickOrder(zone, 1, 1))).size).toBe(codes.length)
  })

  it('cualquier zona de servicio va después de cualquier anaquel', () => {
    expect(pickOrder('AAA')).toBeGreaterThan(pickOrder('ZZZ', MAX_POSITION, MAX_LEVEL))
  })

  it('validateLayout rechaza lo que no cabe en la fórmula', () => {
    expect(validateLayout([{ zone: 'A', positions: 1, levels: 10 }])).toEqual([`Zona A: el máximo son ${MAX_POSITION} posiciones y ${MAX_LEVEL} niveles.`])
  })
})
