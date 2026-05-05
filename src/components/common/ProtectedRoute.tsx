import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'
import type { UserRole } from '../../types'

interface Props {
  children:      ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-min-h-dvh flex items-center justify-center text-gray-400 gap-2">
        <Spinner size={24} /> Cargando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-min-h-dvh flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-5xl font-bold text-gray-200">403</p>
        <p className="text-lg font-semibold text-gray-700">Acceso denegado</p>
        <p className="text-sm text-gray-400 max-w-xs">
          No tienes permisos para acceder a esta sección. Contacta al administrador.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
