import { createContext, useContext } from 'react'
import type { useSupabaseSession } from './useSupabaseSession'

export type SessionValue = ReturnType<typeof useSupabaseSession>

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession debe usarse dentro de SessionProvider')
  return value
}
