import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BadgeCheck,
  Bot,
  Building2,
  ChevronRight,
  Database,
  LogIn,
  LogOut,
  FileText,
  GitFork,
  LayoutDashboard,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Store,
  Target,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMitraClick } from '../MitraClickContext'
import { useSession } from '../auth/SessionContext'
import { DemoBanner, UserAvatar } from './Primitives'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  keywords: string
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Dirección',
    items: [
      { label: 'Resumen', path: '/', icon: LayoutDashboard, keywords: 'inicio métricas ventas meta hoy' },
      { label: 'Vendedores', path: '/vendedores', icon: BadgeCheck, keywords: 'agentes de venta ranking cuota semáforo' },
      { label: 'Productos', path: '/productos', icon: PackageSearch, keywords: 'material demanda categorías agotados sin movimiento' },
    ],
  },
  {
    label: 'Negocios',
    items: [
      { label: 'Mitra mayorista', path: '/mitra', icon: Truck, keywords: 'b2b pedidos clientes cotizaciones categorías' },
      { label: 'Mitra Click', path: '/mitra-click', icon: Store, keywords: 'b2c tienda en línea shopify embudo canales' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Leads', path: '/leads', icon: Users, keywords: 'prospectos contactos' },
      { label: 'Empresas', path: '/empresas', icon: Building2, keywords: 'cuentas b2b clientes' },
      { label: 'Oportunidades', path: '/oportunidades', icon: Target, keywords: 'pipeline etapas negocios' },
      { label: 'Cotizaciones', path: '/cotizaciones', icon: FileText, keywords: 'propuestas valores' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Atribución', path: '/atribucion', icon: GitFork, keywords: 'canal campaña conversión' },
      { label: 'Actividad', path: '/actividad', icon: Activity, keywords: 'timeline seguimiento llamadas notas' },
      { label: 'Agentes Grok Bot', path: '/agentes', icon: Bot, keywords: 'grok bot agentes ia perfiles' },
      { label: 'Estado de datos', path: '/datos', icon: Database, keywords: 'fuentes supabase erp shopify sincronización carga' },
    ],
  },
]

const allNavItems = navGroups.flatMap((group) => group.items)
/** Rutas fuera del menú que también necesitan título en el encabezado. */
const extraRoutes: NavItem[] = [{ label: 'Iniciar sesión', path: '/entrar', icon: LogIn, keywords: 'entrar login google correo' }]

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center ${compact ? 'justify-center' : ''}`}>
      {compact ? (
        <img src="/mitraclick-mark.svg" alt="MitraClick" className="h-10 w-10 shrink-0" />
      ) : (
        <div className="min-w-0">
          <img src="/mitraclick-logo.jpg" alt="MitraClick" className="h-auto w-[172px] max-w-full mix-blend-multiply" />
          <p className="mt-0.5 pl-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-mc-muted">Intelligence</p>
        </div>
      )}
    </div>
  )
}

function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onMobileClose,
}: {
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onMobileClose: () => void
}) {
  return (
    <>
      {mobileOpen && <button type="button" aria-label="Cerrar navegación" onClick={onMobileClose} className="fixed inset-0 z-40 bg-mc-ink/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-mc-line bg-white text-mc-muted shadow-[8px_0_32px_rgba(48,53,54,.06)] transition-all duration-200 ${collapsed ? 'lg:w-[76px]' : 'lg:w-[244px]'} w-[270px] ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-18 items-center justify-between border-b border-mc-line-soft px-4">
          <Brand compact={collapsed} />
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink lg:hidden" onClick={onMobileClose} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              {!collapsed && <p className="mb-2 px-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-mc-muted">{group.label}</p>}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) => `group flex h-11 items-center rounded-xl text-sm font-semibold transition ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-mc-yellow-soft text-mc-ink shadow-sm ring-1 ring-mc-yellow-strong/50' : 'text-mc-muted hover:bg-mc-surface-2 hover:text-mc-ink'}`}
                    >
                      <Icon size={17} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-mc-line-soft p-3">
          <UserBox collapsed={collapsed} onNavigate={onMobileClose} />
          <button type="button" onClick={onToggle} className="mt-2 hidden h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink lg:flex">
            {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> <span>Contraer menú</span></>}
          </button>
        </div>
      </aside>
    </>
  )
}

function UserBox({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { enabled, session, signOut } = useSession()
  const email = session?.user.email
  const name = email ? email.split('@')[0] : 'Usuario Demo'

  if (enabled && !session) {
    return (
      <NavLink to="/entrar" onClick={onNavigate} className={`flex items-center rounded-xl bg-mc-charcoal text-white hover:bg-mc-ink ${collapsed ? 'justify-center p-2' : 'gap-3 p-3'}`} data-testid="sign-in-link">
        <LogIn size={16} aria-hidden="true" />
        {!collapsed && <span className="text-xs font-bold">Iniciar sesión</span>}
      </NavLink>
    )
  }

  return (
    <div className={`flex items-center rounded-xl bg-mc-surface-2 ${collapsed ? 'justify-center p-2' : 'gap-3 p-3'}`}>
      <UserAvatar name={name} size="sm" />
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-mc-ink">{email ?? 'Usuario Demo'}</p>
          <p className="mt-0.5 truncate text-[10px] text-mc-muted">{session ? 'Sesión iniciada' : 'Modo demostración'}</p>
        </div>
      )}
      {session && !collapsed && (
        <button type="button" onClick={() => { void signOut() }} className="grid h-8 w-8 place-items-center rounded-lg text-mc-muted hover:bg-white hover:text-mc-ink" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { resetMocks } = useMitraClick()

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => inputRef.current?.focus())
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, open])

  const results = useMemo(() => {
    const normalized = query.toLocaleLowerCase('es-MX')
    return allNavItems.filter((item) => `${item.label} ${item.keywords}`.toLocaleLowerCase('es-MX').includes(normalized))
  }, [query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]">
      <button type="button" className="absolute inset-0 cursor-default bg-mc-ink/45 backdrop-blur-sm" onClick={onClose} aria-label="Cerrar búsqueda" />
      <div role="dialog" aria-modal="true" aria-label="Búsqueda global" className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-mc-line bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-mc-gray-100 px-4">
          <Search size={18} className="text-mc-gray-400" />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar módulos y acciones…" className="h-14 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-mc-gray-400" />
          <kbd className="rounded-md border border-mc-gray-200 bg-mc-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-mc-gray-400">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-mc-gray-400">Navegar</p>
          {results.map((item) => {
            const Icon = item.icon
            return <button key={item.path} type="button" onClick={() => { navigate(item.path); onClose() }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-mc-gray-700 hover:bg-mc-yellow-wash"><span className="grid h-8 w-8 place-items-center rounded-lg bg-mc-yellow-soft text-mc-ink"><Icon size={16} /></span><span className="flex-1">{item.label}</span><ChevronRight size={15} className="text-mc-gray-400" /></button>
          })}
          {!results.length && <p className="px-3 py-8 text-center text-sm text-mc-gray-400">No encontramos un módulo con esa búsqueda.</p>}
          <div className="my-2 border-t border-mc-gray-100" />
          <button type="button" onClick={() => { void resetMocks(); onClose() }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-mc-gray-700 hover:bg-mc-yellow-wash"><span className="grid h-8 w-8 place-items-center rounded-lg bg-mc-gray-100 text-mc-charcoal"><RefreshCw size={16} /></span><span className="flex-1"><span className="block">Restablecer datos simulados</span><span className="block text-[11px] font-normal text-mc-muted">Descarta cambios locales de esta sesión</span></span></button>
        </div>
        <div className="flex items-center justify-between border-t border-mc-gray-100 bg-mc-gray-50/80 px-4 py-2 text-[10px] text-mc-gray-400"><span>Selecciona una opción para navegar</span><span>Datos locales · sin API</span></div>
      </div>
    </div>
  )
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const { data } = useMitraClick()
  const { enabled, session } = useSession()
  const notice = data?.commercial.notice
  const current = [...allNavItems, ...extraRoutes].find((item) => item.path === location.pathname) ?? allNavItems.find((item) => item.path !== '/' && location.pathname.startsWith(item.path)) ?? allNavItems[0]

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-dvh bg-mc-bg text-mc-ink">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => setCollapsed((value) => !value)} onMobileClose={() => setMobileOpen(false)} />
      <div className={`min-h-dvh transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[244px]'}`}>
        <div className="sticky top-0 z-30 border-b border-mc-line/90 bg-mc-bg/95 backdrop-blur-xl">
          <header className="flex h-16 items-center gap-3 px-4 lg:px-6">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-mc-gray-200 bg-white text-mc-gray-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación"><Menu size={18} /></button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-mc-ink">{current.label}</p>
              <p className="hidden text-[11px] text-mc-muted sm:block">Inteligencia comercial de Mitra y Mitra Click</p>
            </div>
            <button type="button" onClick={() => setSearchOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border border-mc-line bg-white px-3 text-xs font-semibold text-mc-muted shadow-sm hover:border-mc-yellow-strong hover:text-mc-ink"><Search size={15} /><span className="hidden sm:inline">Buscar</span><kbd className="hidden rounded border border-mc-line bg-mc-surface-2 px-1.5 py-0.5 text-[9px] text-mc-muted md:inline">⌘ K</kbd></button>
            <NavLink to="/datos" aria-label="Ver estado de datos" className="rounded-full focus-visible:outline-offset-4"><DemoBanner source={data?.commercial.source} notice={notice} /></NavLink>
          </header>
          {notice && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-mc-warning/20 bg-mc-warning-soft px-4 py-2 text-xs text-mc-warning lg:px-6" role="status" data-testid="data-notice">
              <span className="font-semibold">{notice}</span>
              {enabled && !session ? <NavLink to="/entrar" className="font-bold underline">Iniciar sesión</NavLink> : <NavLink to="/datos" className="font-bold underline">Ver estado de datos</NavLink>}
            </div>
          )}
        </div>
        <main className="mx-auto w-full max-w-[1700px] p-4 lg:p-6"><Outlet /></main>
      </div>
      <CommandPalette key={searchOpen ? 'open' : 'closed'} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
