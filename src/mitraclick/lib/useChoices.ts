import type { ProductOption } from '../components/DocumentParts'
import { listOptions } from './crud'
import { useQuery } from './useQuery'

export interface Choice {
  value: string
  label: string
}

/** Opciones activas de una tabla para un select (id + etiqueta). */
export function useChoices(table: string, labelColumn: string): Choice[] {
  const query = useQuery(`choices|${table}|${labelColumn}`, async () => {
    const rows = await listOptions(table, labelColumn)
    return rows.map((row) => ({ value: String(row.id), label: String(row[labelColumn]) }))
  })
  return query.data ?? []
}

/** Productos activos con precio y costo, para capturar renglones. */
export function useProductOptions(): ProductOption[] {
  const query = useQuery('product-options', async () => {
    const rows = await listOptions('products', 'name', ['sku', 'price', 'cost'])
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      sku: String(row.sku),
      price: row.price === null || row.price === undefined ? null : Number(row.price),
      cost: row.cost === null || row.cost === undefined ? null : Number(row.cost),
    }))
  })
  return query.data ?? []
}
