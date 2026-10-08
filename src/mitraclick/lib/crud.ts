// Acceso genérico a tablas para los módulos de lista + formulario.
// La seguridad no vive aquí: la aplica la base con RLS por rol.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabase'

/** Cliente sin tipos por tabla: este módulo trabaja con nombres de tabla dinámicos. */
const db = () => getSupabaseClient() as unknown as SupabaseClient

interface DbError {
  code?: string
  message?: string
  details?: string | null
}

// Postgres responde 42501 («permission denied») en dos situaciones que para quien usa la
// app son muy distintas: entró sin sesión, o entró pero su rol no alcanza. Sin esto, el
// primer caso se anuncia como el segundo y manda a la persona a pedir permisos que ya
// tiene. SessionProvider mantiene la bandera al día.
let signedIn = false

export function setSignedIn(value: boolean) {
  signedIn = value
}

/** Convierte un error de Postgres/PostgREST en un mensaje que el usuario pueda entender. */
export function describeError(error: unknown): string {
  if (error instanceof TypeError || (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message))) {
    return 'Sin conexión con la base de datos. Revisa tu internet e intenta de nuevo.'
  }
  const { code, message = '', details } = (error ?? {}) as DbError
  switch (code) {
    case '23505': {
      const value = /=\((.+)\) already exists/.exec(details ?? '')?.[1]
      return value ? `Ya existe un registro con ese valor (${value}).` : 'Ya existe un registro con esos datos.'
    }
    case '23503':
      return 'No se puede completar: el registro está relacionado con otros que dependen de él.'
    case '23502':
      return 'Falta un dato obligatorio.'
    case '23514':
      return 'Algún dato no cumple las reglas del sistema. Revisa los valores capturados.'
    case '42501':
      return signedIn
        ? 'Tu rol no tiene permiso para esta acción.'
        : 'No hay sesión: entra con tu cuenta para ver estos datos.'
    case 'P0001':
      return message
    default:
      return `No se pudo completar la operación: ${message || 'error desconocido'}`
  }
}

/** Filtro `or` de PostgREST para buscar un término en varias columnas de texto. */
export function buildSearchFilter(columns: string[], term: string): string | null {
  const clean = term.replace(/[,()"%*\\]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean || !columns.length) return null
  return columns.map((column) => `${column}.ilike.%${clean}%`).join(',')
}

export interface ListParams {
  table: string
  select: string
  searchColumns?: string[]
  search?: string
  /** Igualdades exactas; los valores vacíos se ignoran. */
  filters?: Record<string, string | boolean | null | undefined>
  orderBy: { column: string; ascending?: boolean }
  page: number
  pageSize: number
}

export interface ListResult<Row> {
  rows: Row[]
  total: number
}

export async function listRows<Row = Record<string, unknown>>(params: ListParams): Promise<ListResult<Row>> {
  let query = db().from(params.table).select(params.select, { count: 'exact' })
  const search = buildSearchFilter(params.searchColumns ?? [], params.search ?? '')
  if (search) query = query.or(search)
  for (const [column, value] of Object.entries(params.filters ?? {})) {
    if (value !== undefined && value !== null && value !== '') query = query.eq(column, value)
  }
  const from = params.page * params.pageSize
  const { data, error, count } = await query
    .order(params.orderBy.column, { ascending: params.orderBy.ascending ?? true })
    .range(from, from + params.pageSize - 1)
  if (error) throw new Error(describeError(error))
  return { rows: (data ?? []) as Row[], total: count ?? 0 }
}

/** Crea (sin id) o actualiza (con id) y devuelve la fila guardada. */
export async function saveRow(table: string, id: string | null, values: Record<string, unknown>): Promise<Record<string, unknown>> {
  const request = id ? db().from(table).update(values).eq('id', id) : db().from(table).insert(values)
  const { data, error } = await request.select().single()
  if (error) throw new Error(describeError(error))
  return data as Record<string, unknown>
}

/** Llama una función de la base (operaciones atómicas: traspasos, conteos, importaciones). */
export async function callFunction<Result = unknown>(name: string, args: Record<string, unknown>): Promise<Result> {
  const { data, error } = await db().rpc(name, args)
  if (error) throw new Error(describeError(error))
  return data as Result
}

/** Llama una Edge Function con la sesión del usuario. Devuelve el cuerpo aunque responda con error de negocio. */
export async function invokeFunction<Result = unknown>(name: string, body: Record<string, unknown>): Promise<Result> {
  const { data, error } = await getSupabaseClient().functions.invoke(name, { body })
  if (error) {
    // Las funciones responden JSON con `error` en español; si existe, se muestra ese mensaje.
    const context = (error as { context?: Response }).context
    const detail = context && typeof context.json === 'function' ? ((await context.json().catch(() => null)) as { error?: string } | null) : null
    throw new Error(detail?.error ?? 'No se pudo contactar al servidor. Intenta de nuevo.')
  }
  return data as Result
}

/** Consulta libre de solo lectura para pantallas que no caben en `listRows` (joins, sin paginar). */
export async function selectRows<Row = Record<string, unknown>>(table: string, select: string, options: { filters?: Record<string, string | boolean | null | undefined>; orderBy?: { column: string; ascending?: boolean }; limit?: number } = {}): Promise<Row[]> {
  let query = db().from(table).select(select)
  for (const [column, value] of Object.entries(options.filters ?? {})) {
    if (value !== undefined && value !== null && value !== '') query = query.eq(column, value)
  }
  if (options.orderBy) query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
  const { data, error } = await query.limit(options.limit ?? 500)
  if (error) throw new Error(describeError(error))
  return (data ?? []) as unknown as Row[]
}

/** Opciones para un campo relacionado (id + etiqueta), hasta 1,000. */
export async function listOptions(table: string, labelColumn: string, extraColumns: string[] = [], onlyActive = true): Promise<Record<string, unknown>[]> {
  let query = db().from(table).select(['id', labelColumn, ...extraColumns].join(',')).order(labelColumn).limit(1000)
  if (onlyActive) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(describeError(error))
  return (data ?? []) as unknown as Record<string, unknown>[]
}
