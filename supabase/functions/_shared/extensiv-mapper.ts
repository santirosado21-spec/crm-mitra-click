// Shared helpers: Extensiv payload → operations row.
// Imported by extensiv-webhook, extensiv-sync, and extensiv-refresh-one.
//
// Design goals:
//   - One source of truth for field mapping (no drift between webhook and sync).
//   - Merge-safe: if operations.sac_editado_at is not null, commercial fields
//     stay untouched. Only extensiv_* metadata is refreshed.
//   - Small `extensiv_payload_snap` footprint to respect the 12 GB budget.

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface ExtensivOrder {
  readOnly?: {
    orderId?: number | string
    creationDate?: string
    customerIdentifier?: { id?: number; name?: string }
  }
  orderId?: number | string
  customerIdentifier?: { id?: number; name?: string }
  referenceNum?: string
  requestedShipDate?: string
  shipTo?: {
    name?: string
    city?: string
    state?: string
    country?: string
  }
  routingInfo?: {
    carrier?: string
    mode?: string
    account?: string
  }
  totalUnits?: number
  totalLines?: number
  numUnits?: number
  numLines?: number
  notes?: string
  priority?: string | number
}

export interface ExtensivReceiver {
  readOnly?: {
    receiverId?: number | string
    creationDate?: string
    customerIdentifier?: { id?: number; name?: string }
  }
  receiverId?: number | string
  customerIdentifier?: { id?: number; name?: string }
  poNum?: string
  referenceNum?: string
  expectedDate?: string
  supplierIdentifier?: { name?: string }
  notes?: string
  numSkus?: number
  numLines?: number
  totalExpected?: number
  warehouseInstructions?: string
}

export interface ClientMapping {
  codigo: string | null
  name: string
}

export type ClientByExtId = Map<number, ClientMapping>

export interface OperationRow {
  referencia: string
  cliente_codigo: string
  cliente_nombre: string
  fecha: string
  estado: string
  asunto_cliente: string
  ref_cliente: string
  tipo_operacion: 'entrada' | 'salida'
  incluye_transporte: boolean
  proveedor: string
  costo_proveedor: number
  factura_proveedor: string
  rc_transporte: boolean
  pod: boolean
  evidencias: boolean
  proforma: boolean
  comentarios: string
  costo_cliente: number
  factura_supply: string
  folio_factura: string
  fecha_envio_rc: string
  fecha_envio_factura: string
  url_evidencias: string
  url_pod: string
  creado_por: string
  extensiv_order_id?: string | null
  extensiv_receipt_id?: string | null
  extensiv_customer_id: number | null
  extensiv_payload_snap: Record<string, unknown>
  origen: 'extensiv_auto'
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

export function isoDateOnly(ts: string): string {
  return ts.slice(0, 10)
}

function buildReferencia(prefix: 'EXT-ORD' | 'EXT-RCV', codigo: string | null, extId: string): string {
  if (!codigo || codigo === 'SIN-MAPEO') return `${prefix}-${extId}`
  return `SC${codigo}-${extId}`
}

function compactJsonString(obj: Record<string, unknown>): string {
  const filtered: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') filtered[k] = v
  }
  return Object.keys(filtered).length ? JSON.stringify(filtered) : ''
}

/* ─── Order → operation row ─────────────────────────────────────────── */

export function mapOrderToOperation(
  o: ExtensivOrder,
  clientByExtId: ClientByExtId,
  creadoPor: string,
): OperationRow | null {
  const orderId = o?.readOnly?.orderId ?? o?.orderId
  if (!orderId) return null
  const orderIdStr = String(orderId)

  const extCustomerId = Number(
    o?.customerIdentifier?.id ?? o?.readOnly?.customerIdentifier?.id ?? 0,
  )
  const mapped = extCustomerId ? clientByExtId.get(extCustomerId) : undefined

  const creationDate = o?.readOnly?.creationDate ?? new Date().toISOString()
  const fechaSource = o?.requestedShipDate ?? creationDate
  const referenceNum = o?.referenceNum ?? `EXT-ORD-${orderIdStr}`

  const shipToLabel = [o?.shipTo?.name, o?.shipTo?.city, o?.shipTo?.state]
    .filter(Boolean)
    .join(', ')

  const carrier = o?.routingInfo?.carrier ?? ''

  const comentariosObj = {
    numUnits: o?.totalUnits ?? o?.numUnits,
    numLines: o?.totalLines ?? o?.numLines,
    shipDate: o?.requestedShipDate,
    priority: o?.priority,
    notes: o?.notes,
    mode: o?.routingInfo?.mode,
  }

  const snap = {
    referenceNum: o?.referenceNum,
    shipTo: o?.shipTo,
    routingInfo: o?.routingInfo,
    totalUnits: o?.totalUnits ?? o?.numUnits,
    totalLines: o?.totalLines ?? o?.numLines,
  }

  return {
    referencia:           buildReferencia('EXT-ORD', mapped?.codigo ?? null, orderIdStr),
    cliente_codigo:       mapped?.codigo ?? 'SIN-MAPEO',
    cliente_nombre:       mapped?.name ?? (o?.customerIdentifier?.name ?? 'Sin mapeo'),
    fecha:                isoDateOnly(fechaSource),
    estado:               'creada',
    asunto_cliente:       shipToLabel,
    ref_cliente:          referenceNum,
    tipo_operacion:       'salida',
    incluye_transporte:   Boolean(carrier),
    proveedor:            carrier,
    costo_proveedor:      0,
    factura_proveedor:    '',
    rc_transporte:        false,
    pod:                  false,
    evidencias:           false,
    proforma:             false,
    comentarios:          compactJsonString(comentariosObj),
    costo_cliente:        0,
    factura_supply:       '',
    folio_factura:        '',
    fecha_envio_rc:       '',
    fecha_envio_factura:  '',
    url_evidencias:       '',
    url_pod:              '',
    creado_por:           creadoPor,
    extensiv_order_id:    orderIdStr,
    extensiv_customer_id: extCustomerId || null,
    extensiv_payload_snap: snap,
    origen:               'extensiv_auto',
  }
}

/* ─── Receiver → operation row ──────────────────────────────────────── */

export function mapReceiverToOperation(
  r: ExtensivReceiver,
  clientByExtId: ClientByExtId,
  creadoPor: string,
): OperationRow | null {
  const receiverId = r?.readOnly?.receiverId ?? r?.receiverId
  if (!receiverId) return null
  const receiverIdStr = String(receiverId)

  const extCustomerId = Number(
    r?.customerIdentifier?.id ?? r?.readOnly?.customerIdentifier?.id ?? 0,
  )
  const mapped = extCustomerId ? clientByExtId.get(extCustomerId) : undefined

  const creationDate = r?.readOnly?.creationDate ?? new Date().toISOString()
  const fechaSource = r?.expectedDate ?? creationDate
  const poNum = r?.poNum ?? r?.referenceNum ?? `EXT-RCV-${receiverIdStr}`

  const supplier = r?.supplierIdentifier?.name ?? ''

  const comentariosObj = {
    expectedDate: r?.expectedDate,
    numSkus: r?.numSkus,
    numLines: r?.numLines,
    totalExpected: r?.totalExpected,
    warehouseInstructions: r?.warehouseInstructions,
    notes: r?.notes,
  }

  const snap = {
    poNum: r?.poNum,
    supplier,
    expectedDate: r?.expectedDate,
    numSkus: r?.numSkus,
    totalExpected: r?.totalExpected,
  }

  return {
    referencia:           buildReferencia('EXT-RCV', mapped?.codigo ?? null, receiverIdStr),
    cliente_codigo:       mapped?.codigo ?? 'SIN-MAPEO',
    cliente_nombre:       mapped?.name ?? (r?.customerIdentifier?.name ?? 'Sin mapeo'),
    fecha:                isoDateOnly(fechaSource),
    estado:               'creada',
    asunto_cliente:       poNum ? `ASN ${poNum}` : '',
    ref_cliente:          poNum,
    tipo_operacion:       'entrada',
    incluye_transporte:   false,
    proveedor:            supplier,
    costo_proveedor:      0,
    factura_proveedor:    '',
    rc_transporte:        false,
    pod:                  false,
    evidencias:           false,
    proforma:             false,
    comentarios:          compactJsonString(comentariosObj),
    costo_cliente:        0,
    factura_supply:       '',
    folio_factura:        '',
    fecha_envio_rc:       '',
    fecha_envio_factura:  '',
    url_evidencias:       '',
    url_pod:              '',
    creado_por:           creadoPor,
    extensiv_receipt_id:  receiverIdStr,
    extensiv_customer_id: extCustomerId || null,
    extensiv_payload_snap: snap,
    origen:               'extensiv_auto',
  }
}

/* ─── Merge-safe upsert ─────────────────────────────────────────────── */
// deno-lint-ignore no-explicit-any
export async function upsertOperation(sb: any, row: OperationRow): Promise<{ imported: number; error?: string }> {
  const extIdCol = row.extensiv_order_id ? 'extensiv_order_id' : 'extensiv_receipt_id'
  const extIdVal = row.extensiv_order_id ?? row.extensiv_receipt_id

  // 1. Look for existing row
  const { data: existing, error: selErr } = await sb
    .from('operations')
    .select('id, sac_editado_at')
    .eq(extIdCol, extIdVal)
    .maybeSingle()

  if (selErr) return { imported: 0, error: `select: ${selErr.message}` }

  if (!existing) {
    // New — full insert
    const { error: insErr } = await sb.from('operations').insert(row)
    if (insErr) {
      if (String(insErr.message).includes('duplicate')) return { imported: 0 }
      return { imported: 0, error: `insert: ${insErr.message}` }
    }
    return { imported: 1 }
  }

  // 2. Existing — decide what to patch
  if (existing.sac_editado_at) {
    // SAC already edited — refresh only metadata, never commercial fields
    const patch = {
      extensiv_customer_id:  row.extensiv_customer_id,
      extensiv_payload_snap: row.extensiv_payload_snap,
    }
    const { error: updErr } = await sb.from('operations').update(patch).eq('id', existing.id)
    if (updErr) return { imported: 0, error: `update-meta: ${updErr.message}` }
    return { imported: 0 }
  }

  // SAC hasn't touched it — safe to refresh all Extensiv-derived fields
  const patch = {
    cliente_codigo:        row.cliente_codigo,
    cliente_nombre:        row.cliente_nombre,
    fecha:                 row.fecha,
    asunto_cliente:        row.asunto_cliente,
    ref_cliente:           row.ref_cliente,
    incluye_transporte:    row.incluye_transporte,
    proveedor:             row.proveedor,
    comentarios:           row.comentarios,
    extensiv_customer_id:  row.extensiv_customer_id,
    extensiv_payload_snap: row.extensiv_payload_snap,
  }
  const { error: updErr } = await sb.from('operations').update(patch).eq('id', existing.id)
  if (updErr) return { imported: 0, error: `update-full: ${updErr.message}` }
  return { imported: 0 }
}
