import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Solo llaves públicas (URL + publishable key). La service_role nunca llega al navegador:
// la carga de datos desde las APIs corre del lado servidor.
const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

let client: SupabaseClient<Database> | null = null

export const isSupabaseConfigured = () => Boolean(url && publishableKey)

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!url || !publishableKey) {
    throw new Error('Supabase no está configurado: faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY.')
  }
  client ??= createClient<Database>(url, publishableKey)
  return client
}
