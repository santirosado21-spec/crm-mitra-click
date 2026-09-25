import type { ReactNode } from 'react'
import { useMitraClick } from '../MitraClickContext'
import { SessionContext } from './SessionContext'
import { useSupabaseSession } from './useSupabaseSession'

/** Una sola suscripción a Supabase Auth; al entrar o salir se recargan los datos. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { resetMocks } = useMitraClick()
  const value = useSupabaseSession({ onChange: resetMocks })
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
