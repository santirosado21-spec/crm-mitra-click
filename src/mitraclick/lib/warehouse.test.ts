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
  planReplenishment,
  suggestPutaway,
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

// ── Acomodo guiado ──────────────────────────────────────────────────────────────
// Al recibir una compra, hoy la persona elige la ubicación a mano entre 100. El sistema
// propone: junto a lo que ya hay de ese producto, o lo más cerca posible del picking.

describe('suggestPutaway', () => {
  const vacia = (code: string, pick_order: number, max_units: number | null = 60) =>
    ({ locationId: code, code, pick_order, kind: 'almacenaje' as const, quantity: 0, max_units, productCount: 0 })

  it('propone primero donde ya hay del mismo producto, para no dispersarlo', () => {
    const candidatos = [
      vacia('A-01-2', 120),
      { ...vacia('C-05-3', 980), quantity: 10, productCount: 1 },
    ]
    const plan = suggestPutaway(candidatos, { quantity: 5, sameProductLocations: ['C-05-3'] })
    expect(plan.lines.map((line) => line.code)).toEqual(['C-05-3'])
    expect(plan.missing).toBe(0)
  })

  it('si no hay del producto en ninguna parte, usa la vacía más cercana al recorrido', () => {
    const plan = suggestPutaway([vacia('C-05-3', 980), vacia('A-01-2', 120)], { quantity: 5, sameProductLocations: [] })
    expect(plan.lines.map((line) => line.code)).toEqual(['A-01-2'])
  })

  it('respeta la capacidad y reparte el resto en la siguiente ubicación', () => {
    const plan = suggestPutaway([vacia('A-01-2', 120, 40), vacia('A-02-2', 130, 40)], { quantity: 55, sameProductLocations: [] })
    expect(plan.lines).toEqual([
      expect.objectContaining({ code: 'A-01-2', quantity: 40 }),
      expect.objectContaining({ code: 'A-02-2', quantity: 15 }),
    ])
    expect(plan.missing).toBe(0)
  })

  it('cuenta la existencia que ya hay al calcular el hueco que queda', () => {
    const casi = { ...vacia('A-01-2', 120, 40), quantity: 35, productCount: 1 }
    const plan = suggestPutaway([casi], { quantity: 10, sameProductLocations: ['A-01-2'] })
    expect(plan.lines).toEqual([expect.objectContaining({ code: 'A-01-2', quantity: 5 })])
    expect(plan.missing).toBe(5)
  })

  it('sin capacidad capturada no inventa un límite: cabe todo', () => {
    const plan = suggestPutaway([vacia('A-01-2', 120, null)], { quantity: 999, sameProductLocations: [] })
    expect(plan.lines).toEqual([expect.objectContaining({ code: 'A-01-2', quantity: 999 })])
    expect(plan.missing).toBe(0)
  })

  it('reporta lo que no cabe en vez de proponer una ubicación inventada', () => {
    const plan = suggestPutaway([vacia('A-01-2', 120, 10)], { quantity: 30, sameProductLocations: [] })
    expect(plan.missing).toBe(20)
  })

  it('no propone recepción, embarque, cuarentena ni devoluciones', () => {
    const servicio = [
      { ...vacia('RECEPCION', 1_000_000_001), kind: 'recepcion' as const },
      { ...vacia('CUARENTENA', 1_000_000_004), kind: 'cuarentena' as const },
      { ...vacia('A-01-2', 120), kind: 'almacenaje' as const },
    ]
    expect(suggestPutaway(servicio, { quantity: 5, sameProductLocations: [] }).lines.map((l) => l.code)).toEqual(['A-01-2'])
  })

  it('sin candidatos no propone nada y reporta todo como pendiente', () => {
    expect(suggestPutaway([], { quantity: 7, sameProductLocations: [] })).toEqual({ lines: [], missing: 7 })
  })
})

// ── Reposición del pick face ────────────────────────────────────────────────────
// El nivel 1 es de donde se surte y es el que se vacía. Hay que avisar cuándo bajar
// producto de los niveles altos antes de que el surtido se tropiece.

describe('planReplenishment', () => {
  const pf = (quantity: number, reserve: { code: string; quantity: number; pick_order: number }[] = []) => ({
    productId: 'p1',
    sku: 'MC-1001',
    name: 'Rotomartillo',
    pickFace: { locationId: 'A-01-1', code: 'A-01-1', pick_order: 111, quantity, max_units: 60 },
    reserve,
    demand: 0,
  })

  it('no propone nada si el pick face alcanza para la demanda', () => {
    expect(planReplenishment([{ ...pf(20), demand: 10 }])).toEqual([])
  })

  it('propone bajar lo que falta cuando la demanda supera el pick face', () => {
    const plan = planReplenishment([{ ...pf(4, [{ code: 'A-01-3', quantity: 30, pick_order: 113 }]), demand: 10 }])
    expect(plan).toHaveLength(1)
    expect(plan[0].lines).toEqual([expect.objectContaining({ code: 'A-01-3', quantity: 6 })])
    expect(plan[0].reason).toBe('demanda')
  })

  it('avisa aunque no haya demanda si el pick face quedó por debajo del mínimo', () => {
    const plan = planReplenishment([{ ...pf(2, [{ code: 'A-01-3', quantity: 30, pick_order: 113 }]), demand: 0 }], { minUnits: 6 })
    expect(plan[0].reason).toBe('minimo')
    expect(plan[0].lines[0].quantity).toBe(4)
  })

  it('baja primero del nivel más cercano al recorrido', () => {
    const plan = planReplenishment([{
      ...pf(0, [{ code: 'A-09-4', quantity: 50, pick_order: 194 }, { code: 'A-01-2', quantity: 3, pick_order: 112 }]),
      demand: 10,
    }])
    expect(plan[0].lines.map((l) => l.code)).toEqual(['A-01-2', 'A-09-4'])
    expect(plan[0].lines.map((l) => l.quantity)).toEqual([3, 7])
  })

  it('no sobrepasa la capacidad del pick face', () => {
    const plan = planReplenishment([{
      productId: 'p1', sku: 'MC-1', name: 'x',
      pickFace: { locationId: 'A-01-1', code: 'A-01-1', pick_order: 111, quantity: 0, max_units: 8 },
      reserve: [{ code: 'A-01-3', quantity: 90, pick_order: 113 }],
      demand: 50,
    }])
    expect(plan[0].lines[0].quantity).toBe(8)
    expect(plan[0].missing).toBe(42)
  })

  it('reporta el faltante cuando la reserva no alcanza', () => {
    const plan = planReplenishment([{ ...pf(1, [{ code: 'A-01-3', quantity: 2, pick_order: 113 }]), demand: 10 }])
    expect(plan[0].missing).toBe(7)
  })

  it('no propone nada si no hay reserva de dónde bajar', () => {
    expect(planReplenishment([{ ...pf(0, []), demand: 10 }])).toEqual([])
  })

  it('ordena lo más urgente primero', () => {
    const plan = planReplenishment([
      { ...pf(8, [{ code: 'A-01-3', quantity: 30, pick_order: 113 }]), productId: 'leve', demand: 10 },
      { ...pf(0, [{ code: 'A-02-3', quantity: 30, pick_order: 123 }]), productId: 'urgente', demand: 20 },
    ])
    expect(plan.map((item) => item.productId)).toEqual(['urgente', 'leve'])
  })
})
