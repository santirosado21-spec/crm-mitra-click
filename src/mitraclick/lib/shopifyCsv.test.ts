import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv'
import { mapShopifyCustomers, mapShopifyProducts } from './shopifyCsv'

describe('mapShopifyProducts', () => {
  const csv = [
    'Handle,Title,Body (HTML),Vendor,Type,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Barcode,Cost per item,Image Src,Status',
    'taladro-20v,Taladro percutor 20 V,<p>Con <b>maletín</b></p>,Truper,Herramienta eléctrica,Title,Default Title,MC-001,"1,850.00",7501234,1200,https://cdn.shopify.com/a.jpg,active',
    'guante,Guante de nitrilo,,Ansell,Seguridad,Talla,M,MC-010,45.5,,,https://cdn.shopify.com/g.jpg,active',
    'guante,,,,,,G,MC-011,45.5,,,,',
    'guante,,,,,,,,,,,https://cdn.shopify.com/g2.jpg,',
    'lija,Lija de agua,,,,Title,Default Title,,12,,,,draft',
    'cinta,Cinta métrica,,,,Title,Default Title,mc-001,99,,,,archived',
  ].join('\n')
  const result = mapShopifyProducts(parseCsv(csv))

  it('convierte cada variante con SKU en un producto', () => {
    expect(result.rows.map((row) => row.sku)).toEqual(['MC-001', 'MC-010', 'MC-011'])
    expect(result.rows[0]).toEqual({
      sku: 'MC-001',
      name: 'Taladro percutor 20 V',
      description: 'Con maletín',
      brand: 'Truper',
      family_name: 'Herramienta eléctrica',
      price: 1850,
      cost: 1200,
      barcode: '7501234',
      photo_url: 'https://cdn.shopify.com/a.jpg',
      active: true,
    })
  })

  it('hereda los datos del producto en las variantes y agrega la opción al nombre', () => {
    expect(result.rows[1]).toMatchObject({ sku: 'MC-010', name: 'Guante de nitrilo · M', brand: 'Ansell', family_name: 'Seguridad' })
    expect(result.rows[2]).toMatchObject({ sku: 'MC-011', name: 'Guante de nitrilo · G', brand: 'Ansell', photo_url: 'https://cdn.shopify.com/g.jpg', active: true })
  })

  it('ignora las filas que solo traen imágenes', () => {
    expect(result.skipped).toBe(1)
  })

  it('reporta variantes sin SKU y SKU repetidos, con su número de fila', () => {
    expect(result.errors).toEqual([
      { line: 6, message: 'Lija de agua: la variante no tiene SKU.' },
      { line: 7, message: 'SKU MC-001 repetido en el archivo (ya aparece en la fila 2).' },
    ])
  })

  it('avisa si el archivo no es una exportación de productos', () => {
    expect(mapShopifyProducts(parseCsv('nombre,precio\nA,1')).errors).toEqual([{ line: 1, message: 'El archivo no parece una exportación de productos de Shopify: faltan las columnas Handle, Title y Variant SKU.' }])
  })
})

describe('mapShopifyCustomers', () => {
  const csv = [
    'Customer ID,First Name,Last Name,Email,Default Address Company,Default Address Address1,Default Address City,Default Address Province Code,Default Address Zip,Phone,Default Address Phone,Note',
    "'7001,Ana,López,ANA@Ferre.mx,Ferretería López,Av. Juárez 10,Puebla,PUE,72000,,+52 222 000 0000,Cliente frecuente",
    "'7002,Luis,Pérez,luis@correo.mx,,Calle 5,Mérida,YUC,97000,5550001111,,",
    "'7003,,,,,,,,,,,",
    "'7004,Eva,Ruiz,ana@ferre.mx,,,,,,,,",
  ].join('\n')
  const result = mapShopifyCustomers(parseCsv(csv))

  it('usa la empresa como nombre y a la persona como contacto', () => {
    expect(result.rows[0]).toEqual({
      shopify_customer_id: '7001',
      name: 'Ferretería López',
      kind: 'empresa',
      contact_name: 'Ana López',
      email: 'ana@ferre.mx',
      phone: '+52 222 000 0000',
      shipping_address: 'Av. Juárez 10, 72000',
      city: 'Puebla',
      state: 'PUE',
      notes: 'Cliente frecuente',
    })
  })

  it('sin empresa, el cliente es una persona', () => {
    expect(result.rows[1]).toMatchObject({ name: 'Luis Pérez', kind: 'persona', contact_name: null, phone: '5550001111', notes: null })
  })

  it('reporta filas sin nombre ni correo y correos repetidos', () => {
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toEqual([
      { line: 4, message: 'El cliente no tiene nombre ni correo.' },
      { line: 5, message: 'Correo ana@ferre.mx repetido en el archivo (ya aparece en la fila 2).' },
    ])
  })
})
