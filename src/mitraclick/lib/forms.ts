// Definición y validación de formularios. Funciones puras: no tocan React ni la red.

export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'money' | 'date' | 'select' | 'multiselect' | 'checkbox'

export interface FieldOption {
  value: string
  label: string
}

/** Opciones tomadas de otra tabla (p. ej. la familia de un producto). */
export interface FieldRelation {
  table: string
  labelColumn: string
  /** Muestra solo las opciones cuyo `column` coincide con el valor de otro campo del formulario. */
  filterBy?: { field: string; column: string }
  onlyActive?: boolean
}

export interface FieldDef {
  name: string
  label: string
  type: FieldType
  required?: boolean
  hint?: string
  placeholder?: string
  min?: number
  max?: number
  options?: FieldOption[]
  relation?: FieldRelation
  /** Ocupa las dos columnas del formulario. */
  wide?: boolean
  /** No se puede cambiar después de crear el registro. */
  lockedOnEdit?: boolean
  /** Solo aparece al editar (p. ej. el motivo de un cambio). */
  onlyOnEdit?: boolean
  transform?: 'lower' | 'upper'
}

export type FormValue = string | boolean | string[] | null | undefined
export type FormValues = Record<string, FormValue>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isBlank = (value: FormValue) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

/** Devuelve un mensaje por campo con problema; objeto vacío si todo es válido. */
export function validateValues(fields: FieldDef[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    const value = values[field.name]

    if (field.type === 'multiselect') {
      if (field.required && (!Array.isArray(value) || value.length === 0)) errors[field.name] = `Elige al menos una opción en ${field.label}.`
      continue
    }
    if (field.type === 'checkbox') continue

    if (isBlank(value)) {
      if (field.required) errors[field.name] = `${field.label} es obligatorio.`
      continue
    }
    const text = String(value).trim()

    if (field.type === 'email' && !EMAIL.test(text)) {
      errors[field.name] = 'Escribe un correo válido.'
    } else if (field.type === 'number' || field.type === 'money') {
      const number = Number(text.replace(/[$,\s]/g, ''))
      if (!Number.isFinite(number)) errors[field.name] = `${field.label} debe ser un número.`
      else if (field.min !== undefined && number < field.min) errors[field.name] = `${field.label} no puede ser menor que ${field.min}.`
      else if (field.max !== undefined && number > field.max) errors[field.name] = `${field.label} no puede ser mayor que ${field.max}.`
    }
  }
  return errors
}

/** Valores del formulario → fila lista para guardar (vacíos a null, números a number). */
export function toRow(fields: FieldDef[], values: FormValues): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const field of fields) {
    const value = values[field.name]
    if (field.type === 'checkbox') row[field.name] = Boolean(value)
    else if (field.type === 'multiselect') row[field.name] = Array.isArray(value) ? value : []
    else if (isBlank(value)) row[field.name] = null
    else if (field.type === 'number' || field.type === 'money') row[field.name] = Number(String(value).replace(/[$,\s]/g, ''))
    else {
      const text = String(value).trim()
      row[field.name] = field.transform === 'lower' ? text.toLowerCase() : field.transform === 'upper' ? text.toUpperCase() : text
    }
  }
  return row
}

/** Fila de la base → valores iniciales del formulario. */
export function fromRow(fields: FieldDef[], row: Record<string, unknown> | null, defaults: FormValues = {}): FormValues {
  const values: FormValues = {}
  for (const field of fields) {
    const raw = row ? row[field.name] : defaults[field.name]
    if (field.type === 'checkbox') values[field.name] = raw === undefined || raw === null ? Boolean(defaults[field.name] ?? true) : Boolean(raw)
    else if (field.type === 'multiselect') values[field.name] = Array.isArray(raw) ? raw.map(String) : []
    else values[field.name] = raw === undefined || raw === null ? '' : String(raw)
  }
  return values
}
