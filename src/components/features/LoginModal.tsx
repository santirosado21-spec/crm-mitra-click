import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'

interface Props {
  onClose: () => void
}

export function LoginModal({ onClose }: Props) {
  const { signIn } = useAuthContext()
  const navigate   = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(5,5,10,0.75)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm relative rounded-xl p-8 bg-white"
        style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.06)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors">
          <X size={17} />
        </button>

        <img src="/logo.jpeg" alt="Supply Chain México" className="h-8 w-auto mb-6 rounded" />

        <h2 className="text-gray-900 font-semibold mb-1" style={{ fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
          Iniciar sesión
        </h2>
        <p className="text-sm text-gray-400 mb-7">Accede con tu cuenta corporativa</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: 'Correo electrónico', type: 'email', value: email, setter: setEmail, placeholder: 'usuario@supplychain.mx' },
            { label: 'Contraseña',          type: 'password', value: password, setter: setPassword, placeholder: '••••••••' },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{f.label}</label>
              <input
                type={f.type}
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                placeholder={f.placeholder}
                required
                className="border border-gray-200 rounded-md px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none bg-white transition-colors"
                onFocus={e => { e.currentTarget.style.borderColor = '#1e3a5f' }}
                onBlur={e =>  { e.currentTarget.style.borderColor = '#e5e7eb' }}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-md mt-1 transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f', boxShadow: '0 2px 8px rgba(30,58,95,0.3)' }}
          >
            {loading ? <><Spinner size={15} /> Iniciando sesión...</> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
