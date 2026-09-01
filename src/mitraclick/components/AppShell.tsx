import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Bot,
  Building2,
  ChevronRight,
  FileBarChart,
  FileText,
  GitFork,
  LayoutDashboard,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Target,
  Users,
  Workflow,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMitraClick } from '../MitraClickContext'
import { DemoBanner, UserAvatar } from './Primitives'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  keywords: string
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Inteligencia',
    items: [
      { label: 'Dashboard ejecutivo', path: '/', icon: LayoutDashboard, keywords: 'inicio métricas ventas' },
      { label: 'Reportes', path: '/reportes', icon: FileBarChart, keywords: 'analytics análisis' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { label: 'Leads', path: '/leads', icon: Users, keywords: 'prospectos contactos' },
      { label: 'Empresas', path: '/empresas', icon: Building2, keywords: 'cuentas b2b clientes' },
      { label: 'Oportunidades', path: '/oportunidades', icon: Target, keywords: 'pipeline etapas negocios' },
      { label: 'Cotizaciones', path: '/cotizaciones', icon: FileText, keywords: 'propuestas valores' },
      { label: 'Productos', path: '/productos', icon: PackageSearch, keywords: 'demanda categorías marcas' },
    ],
  },
  {
    label: 'Orquestación',
    items: [
      { label: 'Atribución', path: '/atribucion', icon: GitFork, keywords: 'canal campaña conversión' },
      { label: 'Actividad', path: '/actividad', icon: Activity, keywords: 'timeline seguimiento llamadas notas' },
      { label: 'Automatizaciones', path: '/automatizaciones', icon: Workflow, keywords: 'trigger condición acción reglas' },
      { label: 'Agentes IA', path: '/agentes', icon: Bot, keywords: 'asistente ejecutivo comercial reportes' },
    ],
  },
]

const allNavItems = navGroups.flatMap((group) => group.items)

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'justify-center' : 'gap-3'}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ef6d52] to-[#d94b34] text-white shadow-lg shadow-orange-950/20">
        <Sparkles size={18} />
      </span>
      {!compact && (
        <div>
          <p className="text-[15px] font-black leading-none tracking-tight text-white">MitraClick</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Intelligence</p>
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
      {mobileOpen && <button type="button" aria-label="Cerrar navegación" onClick={onMobileClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#14213d] text-slate-300 shadow-xl transition-all duration-200 ${collapsed ? 'lg:w-[76px]' : 'lg:w-[244px]'} w-[270px] ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-18 items-center justify-between border-b border-white/8 px-4">
          <Brand compact={collapsed} />
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/8 hover:text-white lg:hidden" onClick={onMobileClose} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              {!collapsed && <p className="mb-2 px-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{group.label}</p>}
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
                      className={({ isActive }) => `group flex h-11 items-center rounded-xl text-sm font-semibold transition ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-white text-[#14213d] shadow-sm' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}
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
        <div className="border-t border-white/8 p-3">
          <div className={`flex items-center rounded-xl bg-white/6 ${collapsed ? 'justify-center p-2' : 'gap-3 p-3'}`}>
            <UserAvatar name="Usuario Demo" size="sm" />
            {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">Usuario Demo</p><p className="mt-0.5 truncate text-[10px] text-slate-300">Entorno sin integraciones</p></div>}
          </div>
          <button type="button" onClick={onToggle} className="mt-2 hidden h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/8 hover:text-white lg:flex">
            {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> <span>Contraer menú</span></>}
          </button>
        </div>
      </aside>
    </>
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
      <button type="button" className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm" onClick={onClose} aria-label="Cerrar búsqueda" />
      <div role="dialog" aria-modal="true" aria-label="Búsqueda global" className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search size={18} className="text-slate-400" />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar módulos y acciones…" className="h-14 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Navegar</p>
          {results.map((item) => {
            const Icon = item.icon
            return <button key={item.path} type="button" onClick={() => { navigate(item.path); onClose() }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-[#23395d]"><Icon size={16} /></span><span className="flex-1">{item.label}</span><ChevronRight size={15} className="text-slate-300" /></button>
          })}
          {!results.length && <p className="px-3 py-8 text-center text-sm text-slate-400">No encontramos un módulo con esa búsqueda.</p>}
          <div className="my-2 border-t border-slate-100" />
          <button type="button" onClick={() => { void resetMocks(); onClose() }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-[#d65339]"><RefreshCw size={16} /></span><span className="flex-1"><span className="block">Restablecer datos simulados</span><span className="block text-[11px] font-normal text-slate-400">Descarta cambios locales de esta sesión</span></span></button>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] text-slate-400"><span>Selecciona una opción para navegar</span><span>Datos locales · sin API</span></div>
      </div>
    </div>
  )
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const current = allNavItems.find((item) => item.path === location.pathname) ?? allNavItems[0]

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
    <div className="min-h-dvh bg-[#f5f4ef] text-slate-900">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => setCollapsed((value) => !value)} onMobileClose={() => setMobileOpen(false)} />
      <div className={`min-h-dvh transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[244px]'}`}>
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f5f4ef]/90 backdrop-blur-xl">
          <header className="flex h-16 items-center gap-3 px-4 lg:px-6">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación"><Menu size={18} /></button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-slate-900">{current.label}</p>
              <p className="hidden text-[11px] text-slate-400 sm:block">MitraClick Intelligence · Centro de inteligencia comercial</p>
            </div>
            <button type="button" onClick={() => setSearchOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-800"><Search size={15} /><span className="hidden sm:inline">Buscar</span><kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-400 md:inline">⌘ K</kbd></button>
            <DemoBanner />
            <button type="button" disabled title="Se habilitará al conectar configuración real" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 disabled:cursor-not-allowed" aria-label="Configuración pendiente"><Settings2 size={17} /></button>
          </header>
        </div>
        <main className="mx-auto w-full max-w-[1700px] p-4 lg:p-6"><Outlet /></main>
      </div>
      <CommandPalette key={searchOpen ? 'open' : 'closed'} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
