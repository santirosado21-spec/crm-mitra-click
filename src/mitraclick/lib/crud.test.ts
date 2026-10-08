import { describe, expect, it } from 'vitest'
import { buildSearchFilter, describeError, setSignedIn } from './crud'
import { validateValues, type FieldDef } from './forms'

describe('describeError', () => {
  it('explica un duplicado sin tecnicismos', () => {
    expect(describeError({ code: '23505', message: 'duplicate key value violates unique constraint "products_sku_key"', details: 'Key (upper(btrim(sku)))=(MC-001) already exists.' }))
      .toBe('Ya existe un registro con ese valor (MC-001).')
  })

  it('explica que un registro está en uso', () => {
    expect(describeError({ code: '23503', message: 'update or delete on table "product_families" violates foreign key constraint' }))
      .toBe('No se puede completar: el registro está relacionado con otros que dependen de él.')
  })

  // Postgres responde lo mismo (42501) si entraste sin sesión y si tu rol no alcanza, y
  // para quien usa la app son problemas distintos: uno se arregla entrando, el otro
  // pidiendo permisos. El mensaje tiene que distinguirlos.
  it('con sesión, explica que el rol no alcanza', () => {
    setSignedIn(true)
    expect(describeError({ code: '42501', message: 'new row violates row-level security policy for table "products"' }))
      .toBe('Tu rol no tiene permiso para esta acción.')
  })

  it('sin sesión, dice que hay que entrar en vez de culpar al rol', () => {
    setSignedIn(false)
    expect(describeError({ code: '42501', message: 'permission denied for table products' }))
      .toBe('No hay sesión: entra con tu cuenta para ver estos datos.')
  })

  it('muestra tal cual los mensajes de reglas de negocio de la base', () => {
    expect(describeError({ code: 'P0001', message: 'La categoría no pertenece a la familia seleccionada' })).toBe('La categoría no pertenece a la familia seleccionada')
  })

  it('tiene un mensaje genérico para lo desconocido', () => {
    expect(describeError({ message: 'socket hang up' })).toBe('No se pudo completar la operación: socket hang up')
    expect(describeError(new Error('Failed to fetch'))).toBe('Sin conexión con la base de datos. Revisa tu internet e intenta de nuevo.')
  })
})

describe('buildSearchFilter', () => {
  it('arma un OR con ilike por cada columna', () => {
    expect(buildSearchFilter(['name', 'sku'], 'taladro')).toBe('name.ilike.%taladro%,sku.ilike.%taladro%')
  })

  it('quita caracteres que romperían el filtro y recorta espacios', () => {
    expect(buildSearchFilter(['name'], '  rotomartillo 1/2", (20 V)  ')).toBe('name.ilike.%rotomartillo 1/2 20 V%')
  })

  it('regresa null si no hay nada que buscar', () => {
    expect(buildSearchFilter(['name'], '   ')).toBeNull()
    expect(buildSearchFilter([], 'x')).toBeNull()
  })
})

describe('validateValues', () => {
  const fields: FieldDef[] = [
    { name: 'name', label: 'Nombre', type: 'text', required: true },
    { name: 'email', label: 'Correo', type: 'email' },
    { name: 'price', label: 'Precio', type: 'money', min: 0 },
    { name: 'roles', label: 'Roles', type: 'multiselect', options: [{ value: 'admin', label: 'Admin' }], required: true },
  ]

  it('acepta valores completos y válidos', () => {
    expect(validateValues(fields, { name: 'Ana', email: 'ana@mitraclick.com', price: '185.50', roles: ['admin'] })).toEqual({})
  })

  it('marca obligatorios vacíos, correos mal escritos y números fuera de rango', () => {
    expect(validateValues(fields, { name: '  ', email: 'ana@', price: '-1', roles: [] })).toEqual({
      name: 'Nombre es obligatorio.',
      email: 'Escribe un correo válido.',
      price: 'Precio no puede ser menor que 0.',
      roles: 'Elige al menos una opción en Roles.',
    })
  })

  it('rechaza texto donde va un número', () => {
    expect(validateValues(fields, { name: 'Ana', price: 'doce', roles: ['admin'] })).toEqual({ price: 'Precio debe ser un número.' })
  })
})
