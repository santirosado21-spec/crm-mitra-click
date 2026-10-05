import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AppRole } from './roles'

export interface Profile {
  id: string
  email: string
  displayName: string
  roles: AppRole[]
}

/**
 * sin-configurar: faltan las llaves públicas de Supabase.
 * cargando: verificando la sesión.
 * sin-sesion: hay que iniciar sesión.
 * no-autorizado: inició sesión, pero su correo no está dado de alta o está inactivo.
 * listo: sesión válida con perfil y roles.
 */
export type SessionStatus = 'sin-configurar' | 'cargando' | 'sin-sesion' | 'no-autorizado' | 'listo'

export interface SessionValue {
  status: SessionStatus
  session: Session | null
  profile: Profile | null
  /** ¿El usuario tiene alguno de estos roles? */
  can: (roles: readonly AppRole[]) => boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession debe usarse dentro de SessionProvider')
  return value
}
