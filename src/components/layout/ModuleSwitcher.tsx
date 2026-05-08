import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, Package, Truck, Warehouse, ClipboardList, ChevronRight,
} from 'lucide-react'
import { PackingPerson } from '../icons/PackingPerson'
import { useAuthContext } from '../../context/AuthContext'
import { canAccessModule, type AppModule } from '../../config/permissions'

interface ModuleEntry {
  id:    AppModule
  to:    string
  label: string
  icon:  React.ComponentType<{ size?: number }>
  color: string
}

// Todos los módulos usan el mismo color (navy) para mantener identidad
// visual unificada con el resto de la plataforma.
const NAVY = '#1e3a5f'

const MODULES: ModuleEntry[] = [
  { id: 'wms',     to: '/wms',                   label: 'Herramientas de WMS',     icon: Package,       color: NAVY },
  { id: 'tms',     to: '/tms',                   label: 'Transportes',             icon: Truck,         color: NAVY },
  { id: 'parcel',  to: '/tms/guias-paqueteria',  label: 'TMS Guías de Paquetería', icon: PackingPerson, color: NAVY },
  { id: 'almacen', to: '/almacen',               label: 'Almacén CEDIS Lerma',     icon: Warehouse,     color: NAVY },
  { id: 'tasks',   to: '/tasks',                 label: 'Task Tracker',            icon: ClipboardList, color: NAVY },
]

interface Props {
  /** Contenido a mostrar al lado del icono trigger. Acepta string o JSX
   *  (ej. <Home /> para una casita). Si es null, solo se muestra el icono. */
  label?: React.ReactNode | null
}

/**
 * Botón hamburger que abre un dropdown con navegación a todos los módulos
 * accesibles + un link a la página principal. Funciona desde cualquier página.
 */
export function ModuleSwitcher({ label }: Props) {
  const { user } = useAuthContext()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click fuera + tecla Escape para cerrar
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Cerrar al cambiar de ruta
  useEffect(() => { setOpen(false) }, [pathname])

  const visibleModules = MODULES.filter(m => canAccessModule(user?.role, m.id))

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menú principal"
        className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl text-sm sm:text-base font-bold transition-colors focus-visible:outline-none ${
          open ? 'bg-gray-100 text-[#1e3a5f]' : 'text-[#1e3a5f] hover:bg-gray-100'
        }`}
      >
        {/* Si hay label (ej. casita en homepage) lo usamos como único gráfico
             del trigger. Si no, fallback al icono PackingPerson para módulos. */}
        {label
          ? <span className="inline-flex items-center">{label}</span>
          : <PackingPerson size={22} aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-64 sm:w-72 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-fade-in"
        >
          {/* Home */}
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-100 transition-colors ${
              pathname === '/' ? 'bg-blue-50 text-[#1e3a5f]' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="w-8 h-8 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center shrink-0">
              <Home size={15} />
            </span>
            <span className="font-semibold">Página principal</span>
            {pathname === '/' && <ChevronRight size={14} className="ml-auto text-[#1e3a5f]" />}
          </Link>

          {/* Módulos */}
          <div className="py-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 pt-2 pb-1">
              Módulos
            </p>
            {visibleModules.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400">Tu rol no tiene módulos accesibles.</p>
            ) : (
              visibleModules.map(m => {
                const Icon = m.icon
                const active = pathname.startsWith(m.to.split('/')[1] ? `/${m.to.split('/')[1]}` : m.to)
                return (
                  <Link
                    key={m.id}
                    to={m.to}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      active ? 'bg-blue-50 text-[#1e3a5f]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ background: m.color }}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="font-semibold flex-1 truncate">{m.label}</span>
                    {active && <ChevronRight size={14} className="text-[#1e3a5f]" />}
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
