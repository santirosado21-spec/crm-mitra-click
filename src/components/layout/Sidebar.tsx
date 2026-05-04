import { Home, Users, FileText, FileCheck, ScanBarcode, Truck, Warehouse, LayoutDashboard, UserCheck, Route, PieChart, Calculator, CalendarClock, FileInput, FileCode, Inbox, Calendar, Repeat, UserCog, BarChart3, X } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { useSidebar } from '../../context/SidebarContext'
import { canAccessPath } from '../../config/permissions'

interface Link {
  to: string
  label: string
  icon: typeof Home
}

/*
  Contextual sidebar: shows ONLY the current module's links.
  To switch modules, user must return to the main menu (/) and pick another.
*/
const WMS_LINKS: Link[] = [
  { to: '/wms',                    label: 'Herramientas de WMS', icon: Warehouse },
  { to: '/sac/validador',          label: 'Validador SKU',        icon: ScanBarcode },
  { to: '/sac/receipt-generator',  label: 'Generador Receipt',    icon: FileInput },
  { to: '/rc',                     label: 'Rendición RC',         icon: FileCheck },
  { to: '/proformas',              label: 'Proformas',            icon: FileText },
  { to: '/wms/cfdi-generator',     label: 'Generador CFDI',       icon: FileCode },
  { to: '/clients',                label: 'Clientes',             icon: Users },
]

const TMS_LINKS: Link[] = [
  { to: '/tms',            label: 'TMS · Inicio',         icon: Truck },
  { to: '/tms/dashboard',  label: 'Dashboard',            icon: LayoutDashboard },
  { to: '/tms/vehiculos',  label: 'Vehículos',            icon: Truck },
  { to: '/tms/operadores', label: 'Operadores',           icon: UserCheck },
  { to: '/tms/viajes',     label: 'Viajes',               icon: Route },
  { to: '/tms/costos',     label: 'Costos',               icon: PieChart },
  { to: '/cotizador',      label: 'Cotizador',            icon: Calculator },
  { to: '/tramites',       label: 'Trámites',             icon: CalendarClock },
]

const ALMACEN_LINKS: Link[] = [
  { to: '/almacen',        label: 'CEDIS Lerma',          icon: Warehouse },
]

const TASKS_LINKS: Link[] = [
  { to: '/tasks',                  label: 'Mi bandeja',     icon: Inbox },
  { to: '/tasks/calendar',         label: 'Calendario',     icon: Calendar },
  { to: '/tasks/templates',        label: 'Plantillas',     icon: Repeat },
]

const TASKS_ADMIN_LINKS: Link[] = [
  { to: '/tasks/admin/team',       label: 'Equipo y horarios', icon: UserCog },
  { to: '/tasks/admin/reports',    label: 'Reportes operativos', icon: BarChart3 },
]

type ModuleKey = 'home' | 'wms' | 'tms' | 'almacen' | 'tasks'

function detectModule(pathname: string): ModuleKey {
  if (pathname === '/')                                                          return 'home'
  if (pathname === '/almacen')                                                   return 'almacen'
  if (pathname.startsWith('/tasks'))                                             return 'tasks'
  if (pathname.startsWith('/tms') || pathname === '/cotizador' || pathname === '/tramites')
    return 'tms'
  // Default: WMS (/, /wms, /sac/*, /rc, /proformas, /clients, etc.)
  return 'wms'
}

const MODULE_CONFIG: Record<Exclude<ModuleKey, 'home'>, { label: string; links: Link[] }> = {
  wms:     { label: 'Herramientas de WMS', links: WMS_LINKS },
  tms:     { label: 'Transportes',         links: TMS_LINKS },
  almacen: { label: 'Almacén',             links: ALMACEN_LINKS },
  tasks:   { label: 'Task Tracker',        links: TASKS_LINKS },
}

export function Sidebar() {
  const { pathname } = useLocation()
  const { user } = useAuthContext()
  const { open, close } = useSidebar()
  const currentModule = detectModule(pathname)

  // Auto-cerrar el drawer en móvil al cambiar de ruta
  useEffect(() => { close() }, [pathname, close])

  // On home page, no sidebar
  if (currentModule === 'home') return null

  const { label, links } = MODULE_CONFIG[currentModule]
  const visibleLinks = links.filter(link => canAccessPath(user?.role, link.to))
  const isAdmin = user?.role === 'admin'
  const showAdminTasks = currentModule === 'tasks' && isAdmin

  return (
    <>
      {/* Backdrop solo en móvil cuando está abierto */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 animate-fade-in"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:static z-40 top-0 bottom-0 left-0 w-[220px] shrink-0 flex flex-col border-r
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)' }}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Botón cerrar — solo móvil */}
        <button
          type="button"
          onClick={close}
          className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      <nav className="flex-1 flex flex-col gap-4 p-3 pt-5 overflow-y-auto">
        {/* "Back to home" — forces module switch via the main menu */}
        <NavLink
          to="/"
          end
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <Home size={16} className="shrink-0 text-gray-400 group-hover:text-[#1e3a5f] group-hover:scale-110 transition-all" />
          <span>Menú principal</span>
        </NavLink>

        <div className="border-t border-gray-100 -mx-3" />

        <div>
          <p className="text-[9px] font-bold tracking-widest uppercase px-3 mb-1.5" style={{ color: '#94a3b8' }}>
            {label}
          </p>
          <div className="flex flex-col gap-0.5">
            {visibleLinks.map(({ to, label: linkLabel, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/wms' || to === '/tms' || to === '/almacen'}
                aria-label={linkLabel}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                  ${isActive
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
                style={({ isActive }) => isActive
                  ? { background: 'var(--brand-navy)', boxShadow: '0 2px 8px rgba(30,58,95,0.25)' }
                  : undefined
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className={`shrink-0 transition-all ${isActive
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-[#1e3a5f] group-hover:scale-110'
                      }`}
                    />
                    <span className="truncate">{linkLabel}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {showAdminTasks && (
          <div>
            <p className="text-[9px] font-bold tracking-widest uppercase px-3 mb-1.5" style={{ color: '#94a3b8' }}>
              Administración
            </p>
            <div className="flex flex-col gap-0.5">
              {TASKS_ADMIN_LINKS.map(({ to, label: linkLabel, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                    ${isActive
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                  style={({ isActive }) => isActive
                    ? { background: 'var(--brand-navy)', boxShadow: '0 2px 8px rgba(30,58,95,0.25)' }
                    : undefined
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} aria-hidden="true" className={`shrink-0 transition-all ${isActive
                        ? 'text-white' : 'text-gray-400 group-hover:text-[#1e3a5f] group-hover:scale-110'}`} />
                      <span className="truncate">{linkLabel}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Botón "Cerrar sidebar" — solo móvil, visible al final de la lista */}
        <button
          type="button"
          onClick={close}
          className="lg:hidden mt-2 inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-white shadow-sm active:scale-[0.98]"
          style={{ background: 'var(--brand-navy)' }}
        >
          <X size={16} /> Cerrar sidebar
        </button>
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-2.5 px-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--brand-navy)' }}
            aria-hidden="true"
          >
            <span className="text-white text-[9px] font-bold">SC</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-700 truncate">Supply Chain MX</p>
            <p className="text-[9px] text-gray-400 truncate">v2.0 · {label}</p>
          </div>
        </div>
      </div>
    </aside>
    </>
  )
}
