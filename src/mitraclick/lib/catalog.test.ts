import { describe, expect, it } from 'vitest'
import { findSimilarProducts, reasonRequiredFields } from './catalog'

const existing = [
  { id: '1', sku: 'MC-001', name: 'Taladro percutor 1/2" 20 V' },
  { id: '2', sku: 'MC-002', name: 'Disco de corte 4 1/2"' },
  { id: '3', sku: 'mc-003', name: 'Guante de nitrilo talla M' },
]

describe('findSimilarProducts', () => {
  it('detecta el mismo SKU sin importar mayúsculas ni espacios', () => {
    expect(findSimilarProducts({ sku: ' mc-001 ', name: 'Otro' }, existing)).toEqual([{ id: '1', sku: 'MC-001', name: 'Taladro percutor 1/2" 20 V', match: 'sku' }])
  })

  it('detecta nombres iguales ignorando acentos, mayúsculas y puntuación', () => {
    expect(findSimilarProducts({ sku: 'X-9', name: 'TALADRO PERCUTOR 1/2 20V' }, existing).map((item) => [item.id, item.match])).toEqual([['1', 'nombre']])
  })

  it('detecta nombres casi iguales (mismas palabras con una de diferencia)', () => {
    expect(findSimilarProducts({ sku: 'X-9', name: 'Guante nitrilo talla M azul' }, existing).map((item) => item.id)).toEqual(['3'])
  })

  it('no marca productos distintos ni al propio registro que se edita', () => {
    expect(findSimilarProducts({ sku: 'X-9', name: 'Guante de carnaza talla G' }, existing)).toEqual([])
    expect(findSimilarProducts({ id: '2', sku: 'MC-002', name: 'Disco de corte 4 1/2"' }, existing)).toEqual([])
  })

  it('ignora nombres demasiado cortos para comparar', () => {
    expect(findSimilarProducts({ sku: 'X-9', name: 'M' }, existing)).toEqual([])
  })
})

describe('reasonRequiredFields', () => {
  const before = { family_id: 'f1', category_id: 'c1', price: 100, cost: 60, name: 'A' }

  it('pide motivo al reclasificar o cambiar precio o costo', () => {
    expect(reasonRequiredFields(before, { ...before, family_id: 'f2', category_id: 'c9', price: 120 })).toEqual(['familia', 'categoría', 'precio'])
    expect(reasonRequiredFields(before, { ...before, cost: 61 })).toEqual(['costo'])
  })

  it('no pide motivo por otros cambios ni por diferencias de formato', () => {
    expect(reasonRequiredFields(before, { ...before, name: 'B' })).toEqual([])
    expect(reasonRequiredFields({ ...before, price: '100.00' }, { ...before, price: 100 })).toEqual([])
    expect(reasonRequiredFields({ ...before, category_id: null }, { ...before, category_id: '' })).toEqual([])
  })
})
