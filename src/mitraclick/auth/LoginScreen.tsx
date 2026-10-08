import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { readAuthError } from './authErrors'
import { useSession } from './SessionContext'
import { Button, Field, TextInput } from '../components/Controls'
import { ThemeToggle } from '../components/ThemeToggle'

/** Pantalla de entrada. Sin sesión no se ve nada del sistema. */
export function LoginScreen() {
  const { signInWithPassword } = useSession()
  const navigate = useNavigate()
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
    void run(async () => {
      await signInWithPassword(address, password)
      navigate('/', { replace: true })
    })
  }

  return (
    <main className="relative grid min-h-dvh place-items-center bg-mc-bg px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <img src="/mitraclick-logo.jpg" alt="Mitra Click" className="mc-brand-logo mx-auto w-44 mix-blend-multiply" />
        <h1 className="mt-6 text-center text-2xl font-extrabold text-mc-ink">Iniciar sesión</h1>
        <p className="mt-1 text-center text-sm text-mc-muted">Sistema operativo de Mitra Click. Solo cuentas autorizadas.</p>

        <div className="mt-6 rounded-2xl border border-mc-line bg-mc-surface p-5 shadow-mc-card">
          <form onSubmit={submit} className="space-y-3">
            <Field id="login-email" label="Correo" required>
              <TextInput id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@icloud.com" />
            </Field>
            <Field id="login-password" label="Contraseña" required>
              <TextInput id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Button type="submit" className="w-full" disabled={busy || !email.trim() || !password} data-testid="sign-in-submit">
              <KeyRound size={15} aria-hidden="true" />Entrar
            </Button>
          </form>
          {message && <p className={`mt-4 text-sm ${message.tone === 'ok' ? 'text-mc-success' : 'text-mc-danger'}`} role="status" aria-live="polite">{message.text}</p>}
        </div>
      </div>
    </main>
  )
}
