import { useState, type FormEvent } from 'react'
import { KeyRound, Mail } from 'lucide-react'
import { readAuthError } from './authErrors'
import { useSession } from './SessionContext'
import { Button, Field, TextInput } from '../components/Controls'

type Mode = 'enlace' | 'contrasena'

/** Pantalla de entrada. Sin sesión no se ve nada del sistema. */
export function LoginScreen() {
  const { signInWithGoogle, signInWithEmail, signInWithPassword } = useSession()
  const [mode, setMode] = useState<Mode>('enlace')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  // Si volvimos de Supabase con un error en la URL, hay que decirlo: es la única pista de
  // por qué el enlace o el proveedor no funcionaron. Se lee una vez, al montar.
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(() => {
    const text = readAuthError(window.location.hash, window.location.search)
    return text ? { tone: 'error', text } : null
  })

  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      if (success) setMessage({ tone: 'ok', text: success })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
      setMessage({ tone: 'error', text: text === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : text })
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const address = email.trim().toLowerCase()
    if (mode === 'enlace') void run(() => signInWithEmail(address), `Te enviamos un enlace a ${address}. Ábrelo en este mismo dispositivo.`)
    else void run(() => signInWithPassword(address, password))
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-mc-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <img src="/mitraclick-logo.jpg" alt="Mitra Click" className="mx-auto w-44 mix-blend-multiply" />
        <h1 className="mt-6 text-center text-2xl font-extrabold text-mc-ink">Iniciar sesión</h1>
        <p className="mt-1 text-center text-sm text-mc-muted">Sistema operativo de Mitra Click. Solo cuentas autorizadas.</p>

        <div className="mt-6 rounded-2xl border border-mc-line bg-mc-surface p-5 shadow-mc-card">
          <Button className="w-full" disabled={busy} onClick={() => { void run(signInWithGoogle) }} data-testid="sign-in-google">
            Continuar con Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-[11px] text-mc-muted"><span className="h-px flex-1 bg-mc-line" />o con tu correo<span className="h-px flex-1 bg-mc-line" /></div>

          <form onSubmit={submit} className="space-y-3">
            <Field id="login-email" label="Correo" required>
              <TextInput id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@mitraclick.com" />
            </Field>
            {mode === 'contrasena' && (
              <Field id="login-password" label="Contraseña" required>
                <TextInput id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
            )}
            <Button type="submit" variant="outline" className="w-full" disabled={busy || !email.trim() || (mode === 'contrasena' && !password)} data-testid="sign-in-submit">
              {mode === 'enlace' ? <><Mail size={15} aria-hidden="true" />Enviarme un enlace</> : <><KeyRound size={15} aria-hidden="true" />Entrar</>}
            </Button>
          </form>
          <button type="button" className="mt-3 w-full text-center text-xs font-semibold text-mc-muted underline hover:text-mc-ink" onClick={() => { setMode(mode === 'enlace' ? 'contrasena' : 'enlace'); setMessage(null) }}>
            {mode === 'enlace' ? 'Entrar con contraseña' : 'Entrar con un enlace por correo'}
          </button>
          {message && <p className={`mt-4 text-sm ${message.tone === 'ok' ? 'text-mc-success' : 'text-mc-danger'}`} role="status" aria-live="polite">{message.text}</p>}
        </div>
      </div>
    </main>
  )
}
