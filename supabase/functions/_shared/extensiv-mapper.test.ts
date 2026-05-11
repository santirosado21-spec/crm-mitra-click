import { describe, it, expect } from 'vitest'
import {
  mapOrderToOperation,
  mapReceiverToOperation,
  isoDateOnly,
  type ExtensivOrder,
  type ExtensivReceiver,
  type ClientByExtId,
} from './extensiv-mapper'

// ─────────────────────────────────────────────────────────────────────────────
// Tests for Extensiv payload → operations row mapping.
// Estos tests validan que el webhook crea operaciones consistentes en la
// bitácora. Un mapping incorrecto crea operations rotas.
// NO se testea upsertOperation aquí (requiere Supabase client real).
// ─────────────────────────────────────────────────────────────────────────────

const CLIENT_MAP: ClientByExtId = new Map([
  [123, { codigo: 'BSF', name: 'BASF' }],
  [456, { codigo: 'LUL', name: 'LULULEMON' }],
])

describe('isoDateOnly', () => {
  it('toma los primeros 10 chars del ISO timestamp', () => {
    expect(isoDateOnly('2026-05-11T15:30:00Z')).toBe('2026-05-11')
  })

  it('funciona con fecha ya en formato YYYY-MM-DD', () => {
    expect(isoDateOnly('2026-05-11')).toBe('2026-05-11')
  })
})

describe('mapOrderToOperation', () => {
  const baseOrder: ExtensivOrder = {
    readOnly: {
      orderId: 9001,
      creationDate: '2026-05-10T12:00:00Z',
      customerIdentifier: { id: 123, name: 'BASF' },
    },
    referenceNum: 'PT-1001',
    requestedShipDate: '2026-05-15T00:00:00Z',
    shipTo: { name: 'Almacén MTY', city: 'Monterrey', state: 'NL' },
    routingInfo: { carrier: 'Estafeta', mode: 'Ground' },
    totalUnits: 50,
    totalLines: 5,
    notes: 'Entrega antes de las 2pm',
  }

  it('retorna null si no hay orderId', () => {
    const result = mapOrderToOperation({} as ExtensivOrder, CLIENT_MAP, 'webhook')
    expect(result).toBeNull()
  })

  it('mapea cliente conocido al código SC<CODIGO>-<ID>', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.referencia).toBe('SCBSF-9001')
    expect(result?.cliente_codigo).toBe('BSF')
    expect(result?.cliente_nombre).toBe('BASF')
  })

  it('cliente desconocido cae a SIN-MAPEO + prefix EXT-ORD', () => {
    const order: ExtensivOrder = { ...baseOrder, customerIdentifier: { id: 999, name: 'Otro' }, readOnly: { ...baseOrder.readOnly, customerIdentifier: { id: 999 } } }
    const result = mapOrderToOperation(order, CLIENT_MAP, 'webhook')
    expect(result?.referencia).toBe('EXT-ORD-9001')
    expect(result?.cliente_codigo).toBe('SIN-MAPEO')
    expect(result?.cliente_nombre).toBe('Otro')
  })

  it('tipo_operacion es siempre "salida" para orders', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.tipo_operacion).toBe('salida')
  })

  it('estado inicial es "creada"', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.estado).toBe('creada')
  })

  it('origen es "extensiv_auto"', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.origen).toBe('extensiv_auto')
  })

  it('asunto_cliente concatena name/city/state con coma', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.asunto_cliente).toBe('Almacén MTY, Monterrey, NL')
  })

  it('ref_cliente usa referenceNum o fallback EXT-ORD-<id>', () => {
    const withRef = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(withRef?.ref_cliente).toBe('PT-1001')

    const withoutRef = mapOrderToOperation({ ...baseOrder, referenceNum: undefined }, CLIENT_MAP, 'webhook')
    expect(withoutRef?.ref_cliente).toBe('EXT-ORD-9001')
  })

  it('incluye_transporte=true cuando hay carrier', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.incluye_transporte).toBe(true)
    expect(result?.proveedor).toBe('Estafeta')
  })

  it('incluye_transporte=false cuando no hay carrier', () => {
    const order = { ...baseOrder, routingInfo: undefined }
    const result = mapOrderToOperation(order, CLIENT_MAP, 'webhook')
    expect(result?.incluye_transporte).toBe(false)
    expect(result?.proveedor).toBe('')
  })

  it('fecha viene de requestedShipDate si existe', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.fecha).toBe('2026-05-15')
  })

  it('fecha cae a creationDate si requestedShipDate falta', () => {
    const order = { ...baseOrder, requestedShipDate: undefined }
    const result = mapOrderToOperation(order, CLIENT_MAP, 'webhook')
    expect(result?.fecha).toBe('2026-05-10')
  })

  it('extensiv_order_id se guarda como string', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.extensiv_order_id).toBe('9001')
    expect(typeof result?.extensiv_order_id).toBe('string')
  })

  it('extensiv_customer_id se guarda como number', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.extensiv_customer_id).toBe(123)
  })

  it('comentarios incluye numUnits, numLines, shipDate', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    const parsed = JSON.parse(result!.comentarios)
    expect(parsed.numUnits).toBe(50)
    expect(parsed.numLines).toBe(5)
    expect(parsed.shipDate).toBe('2026-05-15T00:00:00Z')
  })

  it('comentarios queda vacío si no hay datos relevantes', () => {
    const order: ExtensivOrder = {
      readOnly: { orderId: 1, creationDate: '2026-01-01T00:00:00Z' },
    }
    const result = mapOrderToOperation(order, CLIENT_MAP, 'webhook')
    expect(result?.comentarios).toBe('')
  })

  it('costo_proveedor y costo_cliente inicializan en 0', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.costo_proveedor).toBe(0)
    expect(result?.costo_cliente).toBe(0)
  })

  it('flags booleanos (rc_transporte, pod, evidencias, proforma) son false', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.rc_transporte).toBe(false)
    expect(result?.pod).toBe(false)
    expect(result?.evidencias).toBe(false)
    expect(result?.proforma).toBe(false)
  })

  it('creado_por usa el valor pasado', () => {
    const result = mapOrderToOperation(baseOrder, CLIENT_MAP, 'webhook')
    expect(result?.creado_por).toBe('webhook')
  })

  it('soporta orderId en el root (no en readOnly)', () => {
    const order: ExtensivOrder = {
      orderId: 7777,
      customerIdentifier: { id: 123 },
      referenceNum: 'PT-X',
    }
    const result = mapOrderToOperation(order, CLIENT_MAP, 'webhook')
    expect(result?.extensiv_order_id).toBe('7777')
    expect(result?.referencia).toBe('SCBSF-7777')
  })
})

describe('mapReceiverToOperation', () => {
  const baseReceiver: ExtensivReceiver = {
    readOnly: {
      receiverId: 8001,
      creationDate: '2026-05-10T08:00:00Z',
      customerIdentifier: { id: 456, name: 'LULULEMON' },
    },
    poNum: 'PO-555',
    expectedDate: '2026-05-12T10:00:00Z',
    supplierIdentifier: { name: 'Proveedor X' },
    numSkus: 12,
    numLines: 24,
    totalExpected: 1200,
    warehouseInstructions: 'Recibir en muelle 3',
  }

  it('retorna null si no hay receiverId', () => {
    const result = mapReceiverToOperation({} as ExtensivReceiver, CLIENT_MAP, 'webhook')
    expect(result).toBeNull()
  })

  it('mapea cliente conocido al código SC<CODIGO>-<ID>', () => {
    const result = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    expect(result?.referencia).toBe('SCLUL-8001')
    expect(result?.cliente_codigo).toBe('LUL')
  })

  it('tipo_operacion es siempre "entrada" para receivers', () => {
    const result = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    expect(result?.tipo_operacion).toBe('entrada')
  })

  it('asunto_cliente es "ASN <poNum>"', () => {
    const result = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    expect(result?.asunto_cliente).toBe('ASN PO-555')
  })

  it('proveedor viene de supplierIdentifier.name', () => {
    const result = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    expect(result?.proveedor).toBe('Proveedor X')
  })

  it('ref_cliente usa poNum primero, referenceNum después', () => {
    const withPo = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    expect(withPo?.ref_cliente).toBe('PO-555')

    const noPoButRef = mapReceiverToOperation(
      { ...baseReceiver, poNum: undefined, referenceNum: 'ALT-REF' },
      CLIENT_MAP,
      'webhook',
    )
    expect(noPoButRef?.ref_cliente).toBe('ALT-REF')

    const neither = mapReceiverToOperation(
      { ...baseReceiver, poNum: undefined, referenceNum: undefined },
      CLIENT_MAP,
      'webhook',
    )
    expect(neither?.ref_cliente).toBe('EXT-RCV-8001')
  })

  it('fecha viene de expectedDate si existe', () => {
    const result = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    expect(result?.fecha).toBe('2026-05-12')
  })

  it('incluye_transporte siempre false en receivers (entrada)', () => {
    const result = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    expect(result?.incluye_transporte).toBe(false)
  })

  it('extensiv_receipt_id se guarda como string (no extensiv_order_id)', () => {
    const result = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    expect(result?.extensiv_receipt_id).toBe('8001')
    expect(result?.extensiv_order_id).toBeUndefined()
  })

  it('comentarios incluye numSkus, numLines, totalExpected', () => {
    const result = mapReceiverToOperation(baseReceiver, CLIENT_MAP, 'webhook')
    const parsed = JSON.parse(result!.comentarios)
    expect(parsed.numSkus).toBe(12)
    expect(parsed.numLines).toBe(24)
    expect(parsed.totalExpected).toBe(1200)
    expect(parsed.warehouseInstructions).toBe('Recibir en muelle 3')
  })

  it('soporta receiverId en root (no en readOnly)', () => {
    const r: ExtensivReceiver = {
      receiverId: 5555,
      customerIdentifier: { id: 456 },
      poNum: 'PO-X',
    }
    const result = mapReceiverToOperation(r, CLIENT_MAP, 'webhook')
    expect(result?.extensiv_receipt_id).toBe('5555')
    expect(result?.referencia).toBe('SCLUL-5555')
  })
})

describe('invariantes — orden y receiver coinciden en estructura', () => {
  it('ambos retornan estado "creada"', () => {
    const order = mapOrderToOperation(
      { orderId: 1, customerIdentifier: { id: 123 } },
      CLIENT_MAP,
      'w',
    )
    const receiver = mapReceiverToOperation(
      { receiverId: 1, customerIdentifier: { id: 123 } },
      CLIENT_MAP,
      'w',
    )
    expect(order?.estado).toBe('creada')
    expect(receiver?.estado).toBe('creada')
  })

  it('ambos retornan origen "extensiv_auto"', () => {
    const order = mapOrderToOperation(
      { orderId: 1, customerIdentifier: { id: 123 } },
      CLIENT_MAP,
      'w',
    )
    const receiver = mapReceiverToOperation(
      { receiverId: 1, customerIdentifier: { id: 123 } },
      CLIENT_MAP,
      'w',
    )
    expect(order?.origen).toBe('extensiv_auto')
    expect(receiver?.origen).toBe('extensiv_auto')
  })
})
