// Shopify → Mitra Click. Código puro compartido por las Edge Functions `shopify-webhook`
// y `shopify-sync` (Deno) y probado con Vitest (Node): solo usa APIs web estándar.
//
// Aquí se traduce el formato de la Admin API REST de Shopify (pedidos, productos,
// clientes, niveles de inventario) a las filas que reciben las funciones
// public.shopify_apply_* de la base. No escribe nada.

type Json = Record<string, unknown>

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const clean = String(value).trim()
  return clean === '' ? null : clean
}
const num = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const round4 = (value: number) => Math.round(value * 10000) / 10000
const list = (value: unknown): Json[] => (Array.isArray(value) ? (value as Json[]) : [])
const id = (value: unknown): string | null => (value === null || value === undefined || value === '' ? null : String(value))

// ── Firma del webhook ───────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) diff |= (left[index] ?? 0) ^ (right[index] ?? 0)
  return diff === 0
}

/**
 * Verifica `X-Shopify-Hmac-Sha256`: HMAC-SHA256 del cuerpo crudo (sin parsear) con el
 * secreto del webhook, en base64. Sin secreto o sin firma, nunca es válido.
 */
export async function verifyShopifyHmac(rawBody: string, hmacHeader: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret || !hmacHeader) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody)))
  let binary = ''
  for (const byte of signature) binary += String.fromCharCode(byte)
  return timingSafeEqual(btoa(binary), hmacHeader.trim())
}

// ── Temas ───────────────────────────────────────────────────────────────────

export type ShopifyEntity = 'order' | 'product' | 'customer' | 'inventory'

/** `orders/create` → 'order'. Los temas que no se procesan devuelven null. */
export function entityForTopic(topic: string | null): ShopifyEntity | null {
  const [resource] = (topic ?? '').split('/')
  if (resource === 'orders') return 'order'
  if (resource === 'products') return 'product'
  if (resource === 'customers') return 'customer'
  if (resource === 'inventory_levels') return 'inventory'
  return null
}

// ── Clientes ────────────────────────────────────────────────────────────────

export interface CustomerRow {
  shopify_customer_id: string
  name: string
  kind: 'empresa' | 'persona'
  contact_name: string | null
  email: string | null
  phone: string | null
  shipping_address: string | null
  city: string | null
  state: string | null
  notes: string | null
}

const joinAddress = (address: Json | null) =>
  address ? text([address.address1, address.address2, address.zip].map(text).filter(Boolean).join(', ')) : null

export function mapShopifyCustomer(payload: Json): CustomerRow | null {
  const customerId = id(payload.id)
  if (!customerId) return null
  const address = (payload.default_address as Json | null) ?? null
  const person = text([payload.first_name, payload.last_name].map(text).filter(Boolean).join(' '))
  const company = text(address?.company)
  const email = text(payload.email)?.toLowerCase() ?? null
  const name = company ?? person ?? email
  if (!name) return null
  return {
    shopify_customer_id: customerId,
    name,
    kind: company ? 'empresa' : 'persona',
    contact_name: company ? person : null,
    email,
    phone: text(payload.phone) ?? text(address?.phone),
    shipping_address: joinAddress(address),
    city: text(address?.city),
    state: text(address?.province_code),
    notes: text(payload.note),
  }
}

// ── Productos ───────────────────────────────────────────────────────────────

export interface ProductRow {
  shopify_product_id: string
  shopify_variant_id: string
  shopify_inventory_item_id: string | null
  sku: string
  name: string
  description: string | null
  brand: string | null
  /** `product_type` de Shopify: solo se asigna si ya existe una familia con ese nombre. */
  family_name: string | null
  price: number | null
  barcode: string | null
  photo_url: string | null
  active: boolean
}

const stripHtml = (value: unknown) => text(String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' '))

/** Un producto de Shopify se convierte en una fila por variante con SKU. `skipped` lista las variantes sin SKU. */
export function mapShopifyProduct(payload: Json): { rows: ProductRow[]; skipped: string[] } {
  const productId = id(payload.id)
  const title = text(payload.title) ?? ''
  const rows: ProductRow[] = []
  const skipped: string[] = []
  if (!productId) return { rows, skipped }
  const image = text((payload.image as Json | null)?.src)
  const active = String(payload.status ?? 'active') === 'active'

  for (const variant of list(payload.variants)) {
    const variantId = id(variant.id)
    const sku = text(variant.sku)
    const variantTitle = text(variant.title)
    if (!variantId) continue
    if (!sku) {
      skipped.push(`${title}${variantTitle && variantTitle !== 'Default Title' ? ` · ${variantTitle}` : ''}: variante sin SKU`)
      continue
    }
    rows.push({
      shopify_product_id: productId,
      shopify_variant_id: variantId,
      shopify_inventory_item_id: id(variant.inventory_item_id),
      sku: sku.toUpperCase(),
      name: variantTitle && variantTitle !== 'Default Title' ? `${title} · ${variantTitle}` : title,
      description: stripHtml(payload.body_html),
      brand: text(payload.vendor),
      family_name: text(payload.product_type),
      price: variant.price === null || variant.price === undefined || variant.price === '' ? null : num(variant.price),
      barcode: text(variant.barcode),
      photo_url: image,
      active,
    })
  }
  return { rows, skipped }
}

// ── Pedidos ─────────────────────────────────────────────────────────────────

export interface OrderLineRow {
  shopify_variant_id: string | null
  sku: string | null
  description: string
  quantity: number
  /** Precio unitario neto: después de descuentos y antes de IVA. */
  unit_price: number
  amount: number
}

export interface OrderRow {
  shopify_order_id: string
  shopify_order_name: string | null
  /** Fecha del pedido en hora de la Ciudad de México (YYYY-MM-DD). */
  ordered_on: string
  cancelled: boolean
  fulfilled: boolean
  payment_status: 'pendiente' | 'parcial' | 'pagado' | 'reembolsado'
  subtotal: number
  tax: number
  shipping: number
  total: number
  traffic_source: string | null
  shipping_address: string | null
  notes: string | null
  customer: CustomerRow | null
  lines: OrderLineRow[]
}

const PAYMENT: Record<string, OrderRow['payment_status']> = {
  paid: 'pagado',
  partially_paid: 'parcial',
  refunded: 'reembolsado',
  partially_refunded: 'reembolsado',
}

/** Fecha en México de un instante ISO. Un pedido de las 23:30 en CDMX no debe caer en el día siguiente (UTC). */
export function mexicoDate(iso: unknown): string {
  const date = new Date(String(iso ?? ''))
  const safe = Number.isNaN(date.getTime()) ? new Date() : date
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(safe)
}

function trafficSource(payload: Json): string | null {
  const referrer = text(payload.referring_site)
  if (referrer) {
    try {
      return new URL(referrer).hostname.replace(/^www\./, '')
    } catch {
      return referrer
    }
  }
  return text(payload.source_name)
}

export function mapShopifyOrder(payload: Json): OrderRow | null {
  const orderId = id(payload.id)
  if (!orderId) return null
  const taxesIncluded = payload.taxes_included === true

  const lines: OrderLineRow[] = list(payload.line_items)
    .filter((item) => num(item.quantity) > 0)
    .map((item) => {
      const quantity = num(item.quantity)
      const gross = num(item.price) * quantity - num(item.total_discount)
      // Si la tienda muestra precios con IVA incluido, se resta para guardar el importe antes de impuestos.
      const includedTax = taxesIncluded ? list(item.tax_lines).reduce((sum, tax) => sum + num(tax.price), 0) : 0
      const amount = round2(gross - includedTax)
      const variantTitle = text(item.variant_title)
      return {
        shopify_variant_id: id(item.variant_id),
        sku: text(item.sku)?.toUpperCase() ?? null,
        description: [text(item.title) ?? 'Producto', variantTitle].filter(Boolean).join(' · '),
        quantity,
        unit_price: round4(amount / quantity),
        amount,
      }
    })

  const tax = round2(num(payload.total_tax))
  const shipping = round2(num(((payload.total_shipping_price_set as Json | null)?.shop_money as Json | null)?.amount))
  const subtotal = round2(lines.reduce((sum, line) => sum + line.amount, 0))
  const customer = payload.customer ? mapShopifyCustomer(payload.customer as Json) : null
  const address = (payload.shipping_address as Json | null) ?? null

  return {
    shopify_order_id: orderId,
    shopify_order_name: text(payload.name),
    ordered_on: mexicoDate(payload.created_at),
    cancelled: Boolean(payload.cancelled_at),
    fulfilled: payload.fulfillment_status === 'fulfilled',
    payment_status: PAYMENT[String(payload.financial_status ?? '')] ?? 'pendiente',
    subtotal,
    tax,
    shipping,
    total: round2(num(payload.total_price)),
    traffic_source: trafficSource(payload),
    shipping_address: address ? text([address.address1, address.address2, address.city, address.province_code, address.zip].map(text).filter(Boolean).join(', ')) : null,
    notes: text(payload.note),
    customer,
    lines,
  }
}

// ── Inventario ──────────────────────────────────────────────────────────────

export interface InventoryRow {
  shopify_inventory_item_id: string
  shopify_location_id: string | null
  available: number
}

/** Nivel de inventario que reporta Shopify. Se guarda para conciliar; nunca sobrescribe la existencia del sistema. */
export function mapShopifyInventoryLevel(payload: Json): InventoryRow | null {
  const item = id(payload.inventory_item_id)
  if (!item || payload.available === null || payload.available === undefined) return null
  return { shopify_inventory_item_id: item, shopify_location_id: id(payload.location_id), available: num(payload.available) }
}
