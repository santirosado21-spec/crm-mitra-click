// Reglas de catálogo que se evalúan antes de guardar. Funciones puras.

export interface ProductRef {
  id?: string
  sku: string
  name: string
}

export interface SimilarProduct extends Required<ProductRef> {
  match: 'sku' | 'nombre'
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'en'])
const normalizeSku = (sku: string) => sku.trim().toUpperCase()

/** "Taladro 1/2\" 20 V" → ["taladro", "1", "2", "20v"]: sin acentos, puntuación ni palabras vacías. */
function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d)\s+(?=[a-z]\b)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((token) => token && !STOPWORDS.has(token))
}

/**
 * Productos existentes que parecen el mismo: mismo SKU, o un nombre cuyas palabras
 * están todas en el otro con a lo más una de diferencia. Es un aviso para quien
 * captura; la unicidad del SKU la impone la base.
 */
export function findSimilarProducts(candidate: ProductRef, existing: Required<ProductRef>[]): SimilarProduct[] {
  const sku = normalizeSku(candidate.sku)
  const tokens = new Set(nameTokens(candidate.name))
  const found: SimilarProduct[] = []
  for (const product of existing) {
    if (candidate.id && product.id === candidate.id) continue
    if (sku && normalizeSku(product.sku) === sku) {
      found.push({ ...product, match: 'sku' })
      continue
    }
    if (tokens.size < 2) continue
    const other = new Set(nameTokens(product.name))
    const shared = [...tokens].filter((token) => other.has(token)).length
    const smallest = Math.min(tokens.size, other.size)
    const largest = Math.max(tokens.size, other.size)
    if (shared >= 2 && shared === smallest && largest - shared <= 1) found.push({ ...product, match: 'nombre' })
  }
  return found
}

type ProductValues = Record<string, unknown>

const REASON_FIELDS: { column: string; label: string; numeric?: boolean }[] = [
  { column: 'family_id', label: 'familia' },
  { column: 'category_id', label: 'categoría' },
  { column: 'price', label: 'precio', numeric: true },
  { column: 'cost', label: 'costo', numeric: true },
]

const comparable = (value: unknown, numeric?: boolean) => {
  if (value === null || value === undefined || value === '') return null
  return numeric ? Number(value) : String(value)
}

/** Campos cuyo cambio exige escribir un motivo (queda en el historial del producto). */
export function reasonRequiredFields(before: ProductValues, after: ProductValues): string[] {
  return REASON_FIELDS.filter((field) => comparable(before[field.column], field.numeric) !== comparable(after[field.column], field.numeric)).map((field) => field.label)
}
