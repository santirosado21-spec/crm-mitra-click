import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { entityForTopic, mapShopifyCustomer, mapShopifyInventoryLevel, mapShopifyOrder, mapShopifyProduct, mexicoDate, verifyShopifyHmac } from './shopify.ts'

// Payloads con la forma de los ejemplos de la Admin API REST de Shopify (webhooks
// orders/create, products/update, customers/create, inventory_levels/update), con datos ficticios.

const customer = {
  id: 7001234,
  first_name: 'Ana',
  last_name: 'López',
  email: 'ANA@ferre.example',
  phone: null,
  note: 'Cliente frecuente',
  default_address: { company: 'Ferretería López', address1: 'Av. Juárez 10', address2: null, city: 'Puebla', province_code: 'PUE', zip: '72000', phone: '+52 222 000 0000' },
}

const order = {
  id: 820982911946154500,
  name: '#1001',
  created_at: '2026-10-02T23:40:00-06:00',
  cancelled_at: null,
  financial_status: 'paid',
  fulfillment_status: null,
  taxes_included: false,
  subtotal_price: '3880.00',
  total_tax: '620.80',
  total_price: '4649.80',
  total_shipping_price_set: { shop_money: { amount: '149.00', currency_code: 'MXN' } },
  referring_site: 'https://www.google.com/search?q=taladro',
  source_name: 'web',
  note: null,
  customer,
  shipping_address: { address1: 'Av. Juárez 10', address2: 'Local 3', city: 'Puebla', province_code: 'PUE', zip: '72000' },
  line_items: [
    { id: 1, variant_id: 4470001, product_id: 9001, sku: 'mc-001', title: 'Taladro percutor 20 V', variant_title: null, quantity: 2, price: '1850.00', total_discount: '0.00', tax_lines: [{ price: '592.00' }] },
    { id: 2, variant_id: 4470002, product_id: 9002, sku: 'MC-010', title: 'Guante de nitrilo', variant_title: 'M', quantity: 4, price: '50.00', total_discount: '20.00', tax_lines: [{ price: '28.80' }] },
    { id: 3, variant_id: null, product_id: null, sku: '', title: 'Propina', variant_title: null, quantity: 0, price: '10.00', total_discount: '0.00', tax_lines: [] },
  ],
}

describe('verifyShopifyHmac', () => {
  const secret = 'shpss_ejemplo'
  const body = JSON.stringify({ id: 1, name: '#1001' })
  const signature = createHmac('sha256', secret).update(body, 'utf8').digest('base64')

  it('acepta la firma correcta del cuerpo crudo', async () => {
    expect(await verifyShopifyHmac(body, signature, secret)).toBe(true)
  })

  it('rechaza una firma inválida, un cuerpo alterado o un secreto distinto', async () => {
    expect(await verifyShopifyHmac(body, 'AAAA', secret)).toBe(false)
    expect(await verifyShopifyHmac(`${body} `, signature, secret)).toBe(false)
    expect(await verifyShopifyHmac(body, signature, 'otro-secreto')).toBe(false)
  })

  it('sin firma o sin secreto configurado nunca es válido', async () => {
    expect(await verifyShopifyHmac(body, null, secret)).toBe(false)
    expect(await verifyShopifyHmac(body, signature, undefined)).toBe(false)
    expect(await verifyShopifyHmac(body, signature, '')).toBe(false)
  })
})

describe('entityForTopic', () => {
  it('reconoce los temas que se procesan', () => {
    expect(entityForTopic('orders/create')).toBe('order')
    expect(entityForTopic('orders/cancelled')).toBe('order')
    expect(entityForTopic('products/update')).toBe('product')
    expect(entityForTopic('customers/create')).toBe('customer')
    expect(entityForTopic('inventory_levels/update')).toBe('inventory')
  })

  it('ignora los demás', () => {
    expect(entityForTopic('carts/update')).toBeNull()
    expect(entityForTopic(null)).toBeNull()
  })
})

describe('mexicoDate', () => {
  it('usa el día de la Ciudad de México, no el de UTC', () => {
    expect(mexicoDate('2026-10-03T05:40:00Z')).toBe('2026-10-02')
    expect(mexicoDate('2026-10-02T23:40:00-06:00')).toBe('2026-10-02')
  })
})

describe('mapShopifyCustomer', () => {
  it('usa la empresa como nombre y a la persona como contacto', () => {
    expect(mapShopifyCustomer(customer)).toEqual({
      shopify_customer_id: '7001234',
      name: 'Ferretería López',
      kind: 'empresa',
      contact_name: 'Ana López',
      email: 'ana@ferre.example',
      phone: '+52 222 000 0000',
      shipping_address: 'Av. Juárez 10, 72000',
      city: 'Puebla',
      state: 'PUE',
      notes: 'Cliente frecuente',
    })
  })

  it('sin empresa es una persona; sin nombre ni correo no se puede registrar', () => {
    expect(mapShopifyCustomer({ id: 5, first_name: 'Luis', last_name: 'Pérez', email: null })).toMatchObject({ name: 'Luis Pérez', kind: 'persona', contact_name: null })
    expect(mapShopifyCustomer({ id: 6 })).toBeNull()
    expect(mapShopifyCustomer({ email: 'x@y.example' })).toBeNull()
  })
})

describe('mapShopifyProduct', () => {
  const product = {
    id: 9002,
    title: 'Guante de nitrilo',
    body_html: '<p>Caja con <strong>100</strong> piezas</p>',
    vendor: 'Ansell',
    product_type: 'Seguridad',
    status: 'active',
    image: { src: 'https://cdn.shopify.com/g.jpg' },
    variants: [
      { id: 4470002, sku: 'mc-010', title: 'M', price: '50.00', barcode: '7501', inventory_item_id: 880002 },
      { id: 4470003, sku: '', title: 'G', price: '50.00', barcode: null, inventory_item_id: 880003 },
    ],
  }

  it('convierte cada variante con SKU y conserva los identificadores de Shopify', () => {
    const result = mapShopifyProduct(product)
    expect(result.rows).toEqual([{
      shopify_product_id: '9002',
      shopify_variant_id: '4470002',
      shopify_inventory_item_id: '880002',
      sku: 'MC-010',
      name: 'Guante de nitrilo · M',
      description: 'Caja con 100 piezas',
      brand: 'Ansell',
      family_name: 'Seguridad',
      price: 50,
      barcode: '7501',
      photo_url: 'https://cdn.shopify.com/g.jpg',
      active: true,
    }])
    expect(result.skipped).toEqual(['Guante de nitrilo · G: variante sin SKU'])
  })

  it('una variante única no agrega "Default Title" al nombre; un producto archivado queda inactivo', () => {
    const result = mapShopifyProduct({ id: 1, title: 'Taladro', status: 'archived', variants: [{ id: 2, sku: 'T-1', title: 'Default Title', price: '10' }] })
    expect(result.rows[0]).toMatchObject({ name: 'Taladro', active: false, photo_url: null })
  })
})

describe('mapShopifyOrder', () => {
  const mapped = mapShopifyOrder(order)!

  it('conserva identificadores, fecha en México, pago y origen', () => {
    expect(mapped).toMatchObject({
      shopify_order_id: '820982911946154500',
      shopify_order_name: '#1001',
      ordered_on: '2026-10-02',
      cancelled: false,
      fulfilled: false,
      payment_status: 'pagado',
      traffic_source: 'google.com',
      shipping_address: 'Av. Juárez 10, Local 3, Puebla, PUE, 72000',
    })
    expect(mapped.customer?.shopify_customer_id).toBe('7001234')
  })

  it('calcula renglones netos de descuento e ignora renglones en cero', () => {
    expect(mapped.lines).toEqual([
      { shopify_variant_id: '4470001', sku: 'MC-001', description: 'Taladro percutor 20 V', quantity: 2, unit_price: 1850, amount: 3700 },
      { shopify_variant_id: '4470002', sku: 'MC-010', description: 'Guante de nitrilo · M', quantity: 4, unit_price: 45, amount: 180 },
    ])
  })

  it('los totales cuadran: subtotal + IVA + envío = total', () => {
    expect(mapped.subtotal).toBe(3880)
    expect(mapped.tax).toBe(620.8)
    expect(mapped.shipping).toBe(149)
    expect(mapped.total).toBe(4649.8)
    expect(mapped.subtotal + mapped.tax + mapped.shipping).toBeCloseTo(mapped.total, 2)
  })

  it('con IVA incluido en precios, guarda el importe antes de impuestos', () => {
    const included = mapShopifyOrder({ id: 9, created_at: '2026-10-02T12:00:00Z', taxes_included: true, total_tax: '16.00', total_price: '116.00', line_items: [{ variant_id: 1, sku: 'A', title: 'Disco', quantity: 1, price: '116.00', total_discount: '0', tax_lines: [{ price: '16.00' }] }] })!
    expect(included.lines[0]).toMatchObject({ unit_price: 100, amount: 100 })
    expect(included.subtotal).toBe(100)
  })

  it('refleja cancelación, surtido y reembolso', () => {
    const changed = mapShopifyOrder({ ...order, cancelled_at: '2026-10-03T10:00:00Z', fulfillment_status: 'fulfilled', financial_status: 'refunded' })!
    expect(changed).toMatchObject({ cancelled: true, fulfilled: true, payment_status: 'reembolsado' })
  })

  it('sin identificador no hay pedido', () => {
    expect(mapShopifyOrder({ name: '#1' })).toBeNull()
  })
})

describe('mapShopifyInventoryLevel', () => {
  it('toma el artículo y lo disponible', () => {
    expect(mapShopifyInventoryLevel({ inventory_item_id: 880002, location_id: 55, available: 12 })).toEqual({ shopify_inventory_item_id: '880002', shopify_location_id: '55', available: 12 })
  })

  it('ignora niveles sin artículo o sin cantidad', () => {
    expect(mapShopifyInventoryLevel({ location_id: 55, available: 3 })).toBeNull()
    expect(mapShopifyInventoryLevel({ inventory_item_id: 1, available: null })).toBeNull()
  })
})
