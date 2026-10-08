import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { setSignedIn } from '../lib/crud'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase'
import { SessionContext, type Profile, type SessionStatus, type SessionValue } from './SessionContext'
import { DEV_ACCESS, DEV_CREDENTIALS, DEV_PROFILE } from './devAccess'
import { hasAnyRole, type AppRole } from './roles'

/** Mantiene la sesión de Supabase Auth y el perfil (roles) del usuario dado de alta en app_users. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  // Sin credenciales de desarrollo no hay sesión que esperar: se entra directo con el
  // perfil falso. Con credenciales se arranca en 'cargando' y el efecto inicia sesión.
  const devOnly = DEV_ACCESS && !DEV_CREDENTIALS
  const [profile, setProfile] = useState<Profile | null>(devOnly ? DEV_PROFILE : null)
  const [status, setStatus] = useState<SessionStatus>(devOnly ? 'listo' : configured ? 'cargando' : 'sin-configurar')

  // Lo que decide si la base va a responder es la sesión, no el perfil: con el acceso de
  // desarrollo sin credenciales hay perfil pero no sesión, y los datos no se ven.
  useEffect(() => {
    setSignedIn(session !== null)
  }, [session])

  useEffect(() => {
    if (devOnly || !configured) return
    const supabase = getSupabaseClient()
    let active = true

    const resolve = async (next: Session | null) => {
      if (!active) return
      setSession(next)
      if (!next) {
        setProfile(null)
        setStatus('sin-sesion')
        return
      }
      const { data, error } = await supabase.rpc('my_profile')
      if (!active) return
      const row = !error && data?.length ? data[0] : null
      if (!row) {
        setProfile(null)
        setStatus('no-autorizado')
        return
      }
      setProfile({ id: row.id, email: row.email, displayName: row.display_name, roles: row.roles as AppRole[] })
      setStatus('listo')
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      // Acceso de desarrollo con credenciales: entra solo, sin pasar por el login.
      if (!data.session && DEV_CREDENTIALS) {
        const { error } = await supabase.auth.signInWithPassword(DEV_CREDENTIALS)
        if (error) console.warn('Acceso de desarrollo: no se pudo iniciar sesión.', error.message)
        return
      }
      await resolve(data.session)
    })
    // El callback de Supabase no debe esperar otras llamadas al cliente: se difiere.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setTimeout(() => { void resolve(next) }, 0)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [configured, devOnly])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
    if (error) throw error
  }, [])

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await getSupabaseClient().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } })
    if (error) throw error
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await getSupabaseClient().auth.signOut()
  }, [])

  const value = useMemo<SessionValue>(
    () => ({
      status,
      session,
      profile,
      can: (roles) => hasAnyRole(profile?.roles ?? [], roles),
      signInWithGoogle,
      signInWithEmail,
      signInWithPassword,
      signOut,
    }),
    [status, session, profile, signInWithGoogle, signInWithEmail, signInWithPassword, signOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
