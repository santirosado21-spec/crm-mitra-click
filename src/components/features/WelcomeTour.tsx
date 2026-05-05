import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import {
  MODULE_BRIEFS,
  MODULE_LABEL,
  ROLE_LABEL,
  defaultRouteForRole,
  getModulesForRole,
  type AppModule,
} from '../../config/permissions'

const TOUR_VERSION = 'v1'

export function WelcomeTour() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const modules = useMemo(() => getModulesForRole(user?.role), [user?.role])
  const storageKey = user ? `scmx_welcome_tour_${TOUR_VERSION}_${user.email}_${user.role}` : ''

  useEffect(() => {
    if (!user || modules.length === 0) return
    const id = window.setTimeout(() => {
      try {
        setOpen(window.localStorage.getItem(storageKey) !== 'done')
      } catch {
        setOpen(true)
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [modules.length, storageKey, user])

  if (!user || !open) return null

  const close = () => {
    try { window.localStorage.setItem(storageKey, 'done') } catch { /* ignore */ }
    setOpen(false)
  }

  const start = () => {
    close()
    navigate(defaultRouteForRole(user.role))
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f172a]/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-none sm:max-h-[calc(100dvh-2rem)] overflow-y-auto animate-scale-in my-3 sm:my-0">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#dc3545] mb-1">
              Bienvenido · {ROLE_LABEL[user.role]}
            </p>
            <h2 className="text-2xl font-extrabold text-[#1e3a5f]">
              Tu espacio de trabajo está personalizado
            </h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Estos son los módulos que verás según tu perfil. El menú principal, la búsqueda y las rutas se ajustan a estos permisos.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Cerrar tour"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(module => (
            <ModuleBrief key={module} module={module} />
          ))}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Este brief aparece solo la primera vez por usuario y rol.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              Entendido
            </button>
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--brand-navy)' }}
            >
              Ir a mi primer módulo <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModuleBrief({ module }: { module: AppModule }) {
  const brief = MODULE_BRIEFS[module]

  return (
    <section className="border border-gray-100 rounded-2xl p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
        {MODULE_LABEL[module]}
      </p>
      <h3 className="text-base font-extrabold text-gray-900 mb-2">{brief.title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-3">{brief.body}</p>
      <ul className="space-y-2">
        {brief.tips.map(tip => (
          <li key={tip} className="flex items-start gap-2 text-xs text-gray-600">
            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-[#1e3a5f] shrink-0" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
