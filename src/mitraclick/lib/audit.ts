// Lectura de la bitácora: qué cambió entre el antes y el después. Funciones puras.

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface FieldChange {
  field: string
  before: unknown
  after: unknown
}

type Snapshot = Record<string, unknown> | null

/** Campos que no aportan a quien revisa un cambio. */
const TECHNICAL = new Set(['id', 'created_at', 'updated_at'])
const isEmpty = (value: unknown) => value === null || value === undefined || value === ''
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function changedFields(action: AuditAction, before: Snapshot, after: Snapshot): FieldChange[] {
  const fields = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter((field) => !TECHNICAL.has(field))
  if (action === 'INSERT') return fields.filter((field) => !isEmpty(after?.[field])).map((field) => ({ field, before: undefined, after: after?.[field] }))
  if (action === 'DELETE') return fields.filter((field) => !isEmpty(before?.[field])).map((field) => ({ field, before: before?.[field], after: undefined }))
  return fields.filter((field) => !same(before?.[field], after?.[field])).map((field) => ({ field, before: before?.[field], after: after?.[field] }))
}

export function formatAuditValue(value: unknown): string {
  if (isEmpty(value)) return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.length ? value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ') : '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
