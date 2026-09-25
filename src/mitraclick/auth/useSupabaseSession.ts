import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../data/supabase/client'

export const isRealDataEnabled = () => import.meta.env.VITE_DATA_SOURCE === 'supabase' && isSupabaseConfigured()

/**
 * Sesión de Supabase Auth. Solo se activa con VITE_DATA_SOURCE=supabase y llaves
 * configuradas; en modo demo devuelve `enabled: false` y no toca la red.
 */
export function useSupabaseSession({ onChange }: { onChange?: () => void } = {}) {
  const enabled = isRealDataEnabled()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    const supabase = getSupabaseClient()
    let first = true
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      // La primera notificación es la sesión inicial: no hace falta recargar.
      if (first) {
        first = false
        return
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') onChange?.()
    })
    return () => data.subscription.unsubscribe()
  }, [enabled, onChange])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) throw error
  }, [])

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await getSupabaseClient().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: true } })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await getSupabaseClient().auth.signOut()
  }, [])

  return { enabled, session, loading, signInWithGoogle, signInWithEmail, signOut }
}
