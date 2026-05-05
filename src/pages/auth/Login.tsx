import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { Loader2 } from 'lucide-react'

type Mode = 'signin' | 'reset'

export function Login() {
  const { signIn, sendPasswordReset } = useAuthContext()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        navigate('/')
      } else {
        await sendPasswordReset(email)
        setInfo('Te enviamos un correo con instrucciones para restablecer tu contraseña.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1e3a5f] relative min-h-dvh w-full p-3 sm:p-5 overflow-y-auto font-sans selection:bg-[#1e3a5f] selection:text-white" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
    <div className="min-h-[calc(100dvh-1.5rem)] sm:min-h-[calc(100dvh-2.5rem)] w-full flex bg-white rounded-2xl overflow-hidden shadow-2xl">
      {/* Panel Izquierdo - Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-8 sm:px-12 lg:px-16 py-6 overflow-y-auto">
        <div className="w-full max-w-[380px] flex flex-col">
          {/* Logo Oficial con marco azul delgado, centrado */}
          <div className="mb-12 flex justify-center">
            <div className="bg-[#1e3a5f] inline-block p-0.5 rounded-2xl shadow-md">
              <div className="bg-white rounded-[calc(1rem-2px)] px-5 py-3 flex items-center justify-center">
                <img
                  src="/hd-logo.png"
                  alt="Supply Chain México"
                  className="h-44 w-auto object-contain select-none"
                />
              </div>
            </div>
          </div>

          {/* Card del login con marco azul delgado */}
          <div className="bg-[#1e3a5f] p-0.5 rounded-2xl shadow-md">
          <div className="bg-white rounded-[calc(1rem-2px)] p-6">

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#1a1a1a] tracking-tight mb-2">
              {mode === 'signin' ? 'Acceder a la plataforma' : 'Restablecer contraseña'}
            </h1>
            <p className="text-base text-gray-500 font-medium">
              {mode === 'signin'
                ? 'Ingresa tus credenciales para continuar'
                : 'Te enviamos un correo con un enlace para crear una nueva contraseña'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold tracking-wide text-gray-600 uppercase">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@supplychain.mx"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[15px] text-[#1a1a1a] placeholder-gray-400 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-all shadow-sm"
              />
            </div>

            {mode === 'signin' && (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold tracking-wide text-gray-600 uppercase">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[15px] text-[#1a1a1a] placeholder-gray-400 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-all shadow-sm"
                />
              </div>
            )}

            {error && (
              <div className="mt-1 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
            {info && (
              <div className="mt-1 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-md">
                <p className="text-sm text-emerald-700 font-medium">{info}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-[#1e3a5f] hover:bg-[#152a45] text-white text-[15px] font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none shadow-md shadow-[#1e3a5f]/20"
            >
              {loading
                ? <Loader2 className="animate-spin" size={20} />
                : (mode === 'signin' ? 'Acceder' : 'Enviar enlace')}
            </button>

            <div className="flex justify-between items-center text-xs">
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setInfo('') }}
                  className="text-gray-500 hover:text-[#1e3a5f] font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(''); setInfo('') }}
                  className="text-gray-500 hover:text-[#1e3a5f] font-medium transition-colors"
                >
                  ← Volver a inicio de sesión
                </button>
              )}
            </div>
          </form>

          </div>
          </div>

          <footer className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 font-medium">
            <span>© 2026 Supply Chain México</span>
            <a href="#" className="hover:text-[#1e3a5f] transition-colors">Soporte</a>
          </footer>
        </div>
      </div>

      {/* Panel Derecho - Hero image con marco animado pegado a la imagen */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-white items-center justify-center p-6">
        <div className="login-frame p-1.5 rounded-2xl shadow-md inline-block max-w-[68%] max-h-[calc(100vh-14rem)] overflow-hidden">
          <div className="bg-white rounded-xl overflow-hidden flex">
            <img
              src="/login-hero.png"
              alt="Supply Chain México · Logística Inteligente sin fronteras"
              className="block max-w-full max-h-[calc(100vh-15rem)] w-auto h-auto object-contain select-none"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
