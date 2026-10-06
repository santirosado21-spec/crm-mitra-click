// Reglas de los documentos comerciales (cotización, pedido, compra, envío, remisión,
// factura). Funciones puras para capturar y mostrar; la base recalcula totales y
// vuelve a validar cada transición al guardar.

/** IVA general. Los precios se capturan antes de IVA. */
export const TAX_RATE = 0.16

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const round3 = (value: number) => Math.round(value * 1000) / 1000
const toNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text.replace(/[$,\s]/g, '')))

export interface DraftLine {
  /** Vacío en renglones de texto libre (cotizaciones y pedidos lo permiten). */
  productId: string
  description: string
  quantity: string
  unitPrice: string
  discountPct: string
}

export const emptyLine = (): DraftLine => ({ productId: '', description: '', quantity: '1', unitPrice: '', discountPct: '0' })

export function lineAmount(quantity: number, unitPrice: number, discountPct: number): number {
  return round2(quantity * unitPrice * (1 - discountPct / 100))
}

export interface Totals {
  subtotal: number
  tax: number
  shipping: number
  total: number
}

export function documentTotals(lines: DraftLine[], options: { shipping?: number; taxRate?: number } = {}): Totals {
  const shipping = options.shipping ?? 0
  const subtotal = round2(
    lines.reduce((sum, line) => {
      const quantity = toNumber(line.quantity)
      const price = toNumber(line.unitPrice)
      const discount = line.discountPct.trim() === '' ? 0 : toNumber(line.discountPct)
      return Number.isFinite(quantity) && Number.isFinite(price) && Number.isFinite(discount) ? sum + lineAmount(quantity, price, discount) : sum
    }, 0),
  )
  const tax = round2(subtotal * (options.taxRate ?? TAX_RATE))
  return { subtotal, tax, shipping, total: round2(subtotal + tax + shipping) }
}

export function validateLines(lines: DraftLine[], options: { requireProduct?: boolean } = {}): string[] {
  if (!lines.length) return ['Agrega al menos un renglón.']
  const errors: string[] = []
  lines.forEach((line, index) => {
    const label = `Renglón ${index + 1}`
    const quantity = toNumber(line.quantity)
    const price = toNumber(line.unitPrice)
    const discount = line.discountPct.trim() === '' ? 0 : toNumber(line.discountPct)
    if (options.requireProduct && !line.productId) errors.push(`${label}: elige un producto.`)
    if (!options.requireProduct && !line.description.trim()) errors.push(`${label}: falta la descripción.`)
    if (!Number.isFinite(quantity) || quantity <= 0) errors.push(`${label}: la cantidad debe ser mayor que cero.`)
    if (!Number.isFinite(price)) errors.push(`${label}: falta el precio.`)
    else if (price < 0) errors.push(`${label}: el precio no puede ser negativo.`)
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) errors.push(`${label}: el descuento debe estar entre 0 y 100.`)
  })
  return errors
}

/** Renglones listos para las funciones de la base (`save_quote`, `save_order`, `save_purchase`). */
export function toLinePayload(lines: DraftLine[]): { product_id: string | null; description: string; quantity: number; unit_price: number; discount_pct: number }[] {
  return lines.map((line) => ({
    product_id: line.productId || null,
    description: line.description.trim(),
    quantity: toNumber(line.quantity),
    unit_price: toNumber(line.unitPrice),
    discount_pct: line.discountPct.trim() === '' ? 0 : toNumber(line.discountPct),
  }))
}

export type DocumentKind = 'quote' | 'order' | 'purchase' | 'shipment' | 'remission'

/**
 * Transiciones que una persona puede pedir. Las que dispara el sistema (una cotización
 * pasa a "ganada" al convertirse en pedido; un pedido a "enviado" al surtirse completo)
 * no aparecen aquí. La misma tabla vive en la base, que es la que decide.
 */
const TRANSITIONS: Record<DocumentKind, Record<string, string[]>> = {
  quote: {
    borrador: ['enviada'],
    enviada: ['negociacion', 'perdida', 'vencida'],
    negociacion: ['perdida', 'vencida'],
    vencida: ['enviada'],
  },
  order: {
    nuevo: ['confirmado', 'cancelado'],
    confirmado: ['en_surtido', 'cancelado'],
    en_compra: ['en_surtido', 'cancelado'],
    en_surtido: ['cancelado'],
  },
  purchase: {
    borrador: ['enviada', 'cancelada'],
    enviada: ['cancelada'],
  },
  shipment: {
    programado: ['en_ruta'],
    en_ruta: ['incidencia'],
    incidencia: ['en_ruta'],
  },
  remission: {
    entregada: ['verificada', 'rechazada'],
  },
}

export const nextStatuses = (kind: DocumentKind, status: string): string[] => TRANSITIONS[kind][status] ?? []

export const STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador', enviada: 'Enviada', negociacion: 'En negociación', ganada: 'Ganada', perdida: 'Perdida', vencida: 'Vencida',
  nuevo: 'Nuevo', confirmado: 'Confirmado', en_compra: 'En compra', en_surtido: 'En surtido', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado',
  parcial: 'Parcial', recibida: 'Recibida', cancelada: 'Cancelada',
  programado: 'Programado', en_ruta: 'En ruta', incidencia: 'Con incidencia',
  pendiente: 'Pendiente', entregada: 'Entregada', verificada: 'Verificada', rechazada: 'Rechazada',
  emitida: 'Emitida', pagada: 'Pagada', pagado: 'Pagado', reembolsado: 'Reembolsado',
}
export const statusLabel = (status: unknown) => STATUS_LABEL[String(status)] ?? String(status ?? '—')

/** Verbo del botón que lleva a cada estado. */
export const ACTION_LABEL: Record<string, string> = {
  enviada: 'Marcar como enviada', negociacion: 'Pasar a negociación', perdida: 'Marcar como perdida', vencida: 'Marcar como vencida',
  confirmado: 'Confirmar pedido', en_surtido: 'Pasar a surtido', cancelado: 'Cancelar', cancelada: 'Cancelar',
  en_ruta: 'Salió a ruta', incidencia: 'Reportar incidencia', verificada: 'Verificar', rechazada: 'Rechazar',
}

export function invoiceBalance(total: number, payments: number[]): { paid: number; balance: number; status: 'emitida' | 'parcial' | 'pagada' } {
  const paid = round2(payments.reduce((sum, amount) => sum + amount, 0))
  const balance = Math.max(0, round2(total - paid))
  return { paid, balance, status: paid <= 0 ? 'emitida' : balance === 0 ? 'pagada' : 'parcial' }
}

/** Lo que falta por surtir o recibir de un renglón. */
export const pendingQuantity = (ordered: number, done: number) => Math.max(0, round3(ordered - done))
