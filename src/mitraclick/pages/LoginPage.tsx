import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Mail } from 'lucide-react'
import { useSession } from '../auth/SessionContext'
import { EmptyState, PageHeader, Panel } from '../components/Primitives'
import { Button, Input } from '../components/Controls'

export function LoginPage() {
  const { enabled, session, signInWithGoogle, signInWithEmail, signOut } = useSession()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [sending, setSending] = useState(false)

  if (!enabled) {
    return (
      <Panel>
        <EmptyState title="El inicio de sesión todavía no está activo" description="Se activa cuando la app lee datos reales (VITE_DATA_SOURCE=supabase). Mientras tanto, todo se muestra con datos simulados y no hace falta entrar." />
        <p className="text-center text-sm"><Link to="/datos" className="font-semibold text-mc-ink underline">Ver estado de datos</Link></p>
      </Panel>
    )
  }

  if (session) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <PageHeader title="Sesión iniciada" description={`Entraste como ${session.user.email ?? 'usuario'}.`} />
        <div className="flex flex-wrap gap-2">
          <Link to="/" className="inline-flex items-center rounded-xl bg-mc-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-mc-ink">Ir al Resumen</Link>
          <Button variant="outline" onClick={() => { void signOut() }}><LogOut size={15} aria-hidden="true" />Cerrar sesión</Button>
        </div>
      </div>
    )
  }

  const run = async (action: () => Promise<void>, success?: string) => {
    setSending(true)
    setStatus(null)
    try {
      await action()
      if (success) setStatus({ tone: 'ok', text: success })
    } catch (error) {
      setStatus({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' })
    } finally {
      setSending(false)
    }
  }

  const submitEmail = (event: FormEvent) => {
    event.preventDefault()
    void run(() => signInWithEmail(email.trim()), `Te enviamos un enlace a ${email.trim()}. Ábrelo en este mismo navegador.`)
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <PageHeader title="Iniciar sesión" description="Entra con tu cuenta de Google autorizada. Solo las cuentas dadas de alta por dirección ven datos reales." />
      <Panel>
        <Button className="w-full" onClick={() => { void run(signInWithGoogle) }} disabled={sending} data-testid="sign-in-google">
          Continuar con Google
        </Button>
        <div className="my-5 flex items-center gap-3 text-[11px] text-mc-muted"><span className="h-px flex-1 bg-mc-line" />o con un enlace por correo<span className="h-px flex-1 bg-mc-line" /></div>
        <form onSubmit={submitEmail} className="space-y-3">
          <Input id="login-email" type="email" label="Correo" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@mitramex.com" />
          <Button type="submit" variant="outline" className="w-full" disabled={sending || !email.trim()}><Mail size={15} aria-hidden="true" />Enviarme un enlace</Button>
        </form>
        {status && <p className={`mt-4 text-sm ${status.tone === 'ok' ? 'text-mc-success' : 'text-mc-danger'}`} role="status" aria-live="polite">{status.text}</p>}
      </Panel>
      <p className="text-xs text-mc-muted">Si entras y ves "no está autorizada", pide que den de alta tu correo en <code>app_users</code>.</p>
    </div>
  )
}
