// Utilidades de servidor compartidas por las Edge Functions (Deno).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.1'

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

/** Llaves de servidor del proyecto (nuevas `sb_secret_…` o la service_role heredada). */
export function secretKeys(): string[] {
  const keys: string[] = []
  try {
    keys.push(...(Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')) as string[]))
  } catch {
    // Sin llaves nuevas configuradas.
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) keys.push(legacy)
  return keys.filter(Boolean)
}

/** Cliente con permisos de servidor. Nunca se devuelve ni se registra la llave. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = secretKeys()[0]
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o la llave de servidor en el entorno de la función.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * Valida el JWT de quien llama y devuelve su perfil del sistema (o null).
 * Se usa en funciones que un usuario dispara desde la app.
 */
export async function callerProfile(req: Request): Promise<{ id: string; roles: string[] } | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authorization = req.headers.get('Authorization')
  if (!url || !anon || !authorization) return null
  const client = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.rpc('my_profile')
  const profile = Array.isArray(data) ? data[0] : data
  if (error || !profile) return null
  return { id: String(profile.id), roles: (profile.roles as string[]) ?? [] }
}

export const hasRole = (profile: { roles: string[] } | null, allowed: string[]) => Boolean(profile && profile.roles.some((role) => allowed.includes(role)))
