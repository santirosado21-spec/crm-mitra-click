import { describe, expect, it } from 'vitest'
import { changedFields, formatAuditValue } from './audit'

describe('changedFields', () => {
  it('en una modificación lista solo lo que cambió, con antes y después', () => {
    expect(changedFields('UPDATE', { id: '1', name: 'Taladro', price: 100, updated_at: 'a' }, { id: '1', name: 'Taladro', price: 120, updated_at: 'b' }))
      .toEqual([{ field: 'price', before: 100, after: 120 }])
  })

  it('compara por contenido arreglos y objetos', () => {
    expect(changedFields('UPDATE', { roles: ['ventas'] }, { roles: ['ventas'] })).toEqual([])
    expect(changedFields('UPDATE', { roles: ['ventas'] }, { roles: ['ventas', 'admin'] })).toEqual([{ field: 'roles', before: ['ventas'], after: ['ventas', 'admin'] }])
  })

  it('en un alta muestra los valores capturados y omite vacíos y campos técnicos', () => {
    expect(changedFields('INSERT', null, { id: '1', name: 'Ana', phone: null, created_at: 'x', updated_at: 'x' }))
      .toEqual([{ field: 'name', before: undefined, after: 'Ana' }])
  })

  it('en un borrado muestra lo que había', () => {
    expect(changedFields('DELETE', { id: '1', name: 'Ana' }, null)).toEqual([{ field: 'name', before: 'Ana', after: undefined }])
  })
})

describe('formatAuditValue', () => {
  it('hace legibles vacíos, booleanos y listas', () => {
    expect(formatAuditValue(null)).toBe('—')
    expect(formatAuditValue(undefined)).toBe('—')
    expect(formatAuditValue(true)).toBe('Sí')
    expect(formatAuditValue(false)).toBe('No')
    expect(formatAuditValue(['a', 'b'])).toBe('a, b')
    expect(formatAuditValue({ a: 1 })).toBe('{"a":1}')
    expect(formatAuditValue(12.5)).toBe('12.5')
  })
})
