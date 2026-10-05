// Convierte las exportaciones CSV de Shopify (Productos y Clientes) a filas del sistema.
// Funciones puras: reciben lo que entrega `parseCsv` (encabezados ya normalizados,
// p. ej. "Variant SKU" → variant_sku) y no tocan la red. `line` es la fila del archivo
// contando el encabezado como 1, para que la persona la encuentre en Excel.

import type { CsvRow } from './csv'

export interface ImportError {
  line: number
  message: string
}

export interface ImportResult<Row> {
  rows: Row[]
  errors: ImportError[]
  /** Filas que no representan un registro (p. ej. imágenes adicionales). */
  skipped: number
}

export interface ProductImportRow {
  sku: string
  name: string
  description: string | null
  brand: string | null
  /** Nombre del "Type" de Shopify. Solo se asigna si ya existe una familia con ese nombre. */
  family_name: string | null
  price: number | null
  cost: number | null
  barcode: string | null
  photo_url: string | null
  active: boolean
}

export interface CustomerImportRow {
  shopify_customer_id: string | null
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

const text = (value: string | undefined) => {
  const clean = (value ?? '').trim()
  return clean === '' ? null : clean
}

const money = (value: string | undefined) => {
  const clean = (value ?? '').replace(/[$,\s]/g, '')
  if (clean === '') return null
  const number = Number(clean)
  return Number.isFinite(number) ? number : null
}

const stripHtml = (value: string | undefined) =>
  text((value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' '))

export function mapShopifyProducts(input: CsvRow[]): ImportResult<ProductImportRow> {
  const first = input[0]
  if (!first || !('handle' in first) || !('title' in first) || !('variant_sku' in first)) {
    return { rows: [], skipped: 0, errors: [{ line: 1, message: 'El archivo no parece una exportación de productos de Shopify: faltan las columnas Handle, Title y Variant SKU.' }] }
  }

  const rows: ProductImportRow[] = []
  const errors: ImportError[] = []
  const seen = new Map<string, number>()
  let skipped = 0
  // Shopify escribe los datos del producto solo en su primera fila; las variantes los heredan.
  let parent: { handle: string; title: string; description: string | null; brand: string | null; family: string | null; photo: string | null; active: boolean } | null = null

  input.forEach((row, index) => {
    const line = index + 2
    const handle = (row.handle ?? '').trim()
    const title = text(row.title)
    if (title || !parent || parent.handle !== handle) {
      const status = (row.status ?? '').trim().toLowerCase()
      parent = {
        handle,
        title: title ?? handle,
        description: stripHtml(row.body_html),
        brand: text(row.vendor),
        family: text(row.type),
        photo: text(row.image_src),
        active: status === '' || status === 'active',
      }
    }

    const sku = text(row.variant_sku)
    const price = money(row.variant_price)
    if (!sku) {
      if (price === null && !title) skipped += 1
      else errors.push({ line, message: `${parent.title}: la variante no tiene SKU.` })
      return
    }

    const key = sku.toUpperCase()
    const previous = seen.get(key)
    if (previous) {
      errors.push({ line, message: `SKU ${key} repetido en el archivo (ya aparece en la fila ${previous}).` })
      return
    }
    seen.set(key, line)

    const options = [row.option1_value, row.option2_value, row.option3_value].map(text).filter((value): value is string => value !== null && value !== 'Default Title')
    rows.push({
      sku: key,
      name: options.length ? `${parent.title} · ${options.join(' / ')}` : parent.title,
      description: parent.description,
      brand: parent.brand,
      family_name: parent.family,
      price,
      cost: money(row.cost_per_item ?? row.variant_cost),
      barcode: text(row.variant_barcode),
      photo_url: text(row.variant_image) ?? parent.photo,
      active: parent.active,
    })
  })

  return { rows, errors, skipped }
}

export function mapShopifyCustomers(input: CsvRow[]): ImportResult<CustomerImportRow> {
  const first = input[0]
  if (!first || !('email' in first) || !('first_name' in first)) {
    return { rows: [], skipped: 0, errors: [{ line: 1, message: 'El archivo no parece una exportación de clientes de Shopify: faltan las columnas First Name y Email.' }] }
  }

  const rows: CustomerImportRow[] = []
  const errors: ImportError[] = []
  const seen = new Map<string, number>()

  input.forEach((row, index) => {
    const line = index + 2
    const person = text([row.first_name, row.last_name].map((part) => (part ?? '').trim()).filter(Boolean).join(' '))
    const company = text(row.default_address_company ?? row.company)
    const email = text(row.email)?.toLowerCase() ?? null
    const name = company ?? person ?? email
    if (!name) {
      errors.push({ line, message: 'El cliente no tiene nombre ni correo.' })
      return
    }
    if (email) {
      const previous = seen.get(email)
      if (previous) {
        errors.push({ line, message: `Correo ${email} repetido en el archivo (ya aparece en la fila ${previous}).` })
        return
      }
      seen.set(email, line)
    }

    const address = [row.default_address_address1 ?? row.address1, row.default_address_address2 ?? row.address2, row.default_address_zip ?? row.zip].map(text).filter(Boolean).join(', ')
    rows.push({
      // Shopify antepone un apóstrofo al ID para que Excel no lo convierta en número.
      shopify_customer_id: text((row.customer_id ?? '').replace(/^'/, '')),
      name,
      kind: company ? 'empresa' : 'persona',
      contact_name: company ? person : null,
      email,
      phone: text(row.phone) ?? text(row.default_address_phone),
      shipping_address: text(address),
      city: text(row.default_address_city ?? row.city),
      state: text(row.default_address_province_code ?? row.province_code),
      notes: text(row.note),
    })
  })

  return { rows, errors, skipped: 0 }
}
