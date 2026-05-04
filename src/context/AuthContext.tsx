import { createContext, useContext, type ReactNode } from 'react'
import { useAuth, type LocalUser } from '../hooks/useAuth'

interface AuthContextType {
  user:               LocalUser | null
  loading:            boolean
  signIn:             (email: string, password: string) => Promise<LocalUser | null>
  signOut:            () => Promise<void>
  sendPasswordReset:  (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
