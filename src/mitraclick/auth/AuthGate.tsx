import type { ReactNode } from 'react'
import { LogOut, ShieldAlert, Wrench } from 'lucide-react'
import { useSession } from './SessionContext'
import { LoginScreen } from './LoginScreen'
import { LoadingScreen } from '../components/Primitives'
import { Button } from '../components/Controls'

function Notice({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-mc-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-mc-line bg-mc-surface p-6 text-center shadow-mc-card" role="alert">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mc-warning-soft text-mc-warning">{icon}</span>
        <h1 className="mt-4 text-lg font-extrabold text-mc-ink">{title}</h1>
        <div className="mt-2 space-y-3 text-sm leading-6 text-mc-muted">{children}</div>
      </div>
    </main>
  )
}

/** Solo deja pasar a usuarios con sesión y dados de alta. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, session, signOut } = useSession()

  if (status === 'sin-configurar') {
    return (
      <Notice icon={<Wrench size={22} aria-hidden="true" />} title="Falta conectar la base de datos">
        <p>Configura <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> en el entorno y vuelve a desplegar.</p>
      </Notice>
    )
  }
  if (status === 'cargando') return <LoadingScreen />
  if (status === 'sin-sesion') return <LoginScreen />
  if (status === 'no-autorizado') {
    return (
      <Notice icon={<ShieldAlert size={22} aria-hidden="true" />} title="Tu cuenta no está autorizada">
        <p>Entraste como <strong className="text-mc-ink">{session?.user.email}</strong>, pero ese correo no está dado de alta o está inactivo.</p>
        <p>Pide a dirección o administración que lo agregue en Usuarios y permisos.</p>
        <Button variant="outline" onClick={() => { void signOut() }}><LogOut size={15} aria-hidden="true" />Cerrar sesión</Button>
      </Notice>
    )
  }
  return <>{children}</>
}
