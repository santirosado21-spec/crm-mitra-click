import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Limpieza one-shot de la llave del demo viejo (localStorage 'scmx_user')
// para evitar conflictos con la nueva sesión real de Supabase Auth.
if (typeof window !== 'undefined') {
  try { window.localStorage.removeItem('scmx_user') } catch { /* ignore */ }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
    storageKey:        'sb-scmx-auth',
    flowType:          'pkce',
    // Deshabilitamos el navigator-lock (causa "Lock broken by another request"
    // cuando hay múltiples pestañas o React StrictMode dispara el callback dos veces)
    lock: <R>(_n: string, _t: number, fn: () => Promise<R>) => fn(),
  },
})
