import { useState } from 'react'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { ROLE_LABEL } from '../auth/roles'
import { NAV_GROUPS, findModule } from '../navigation'
import { UserAvatar } from './Primitives'
import { ThemeToggle } from './ThemeToggle'

function Brand({ compact }: { compact: boolean }) {
  if (compact) return <img src="/mitraclick-mark.svg" alt="Mitra Click" className="mc-brand-logo h-10 w-10 shrink-0" />
  return <img src="/mitraclick-logo.jpg" alt="Mitra Click" className="mc-brand-logo h-auto w-[160px] max-w-full mix-blend-multiply" />
}

function UserBox({ collapsed }: { collapsed: boolean }) {
  const { profile, signOut } = useSession()
  if (!profile) return null
  return (
    <div className={`flex items-center gap-3 rounded-xl bg-mc-surface-2 p-3 ${collapsed ? 'lg:justify-center lg:gap-0 lg:p-2' : ''}`} data-testid="current-user">
      <UserAvatar name={profile.displayName} size="sm" />
        <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="truncate text-xs font-bold text-mc-ink">{profile.displayName}</p>
          <p className="mt-0.5 truncate text-[10px] text-mc-muted">{profile.roles.map((role) => ROLE_LABEL[role]).join(', ') || 'Sin roles'}</p>
        </div>
        <button type="button" onClick={() => { void signOut() }} className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mc-muted hover:bg-mc-surface hover:text-mc-ink ${collapsed ? 'lg:hidden' : ''}`} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={15} aria-hidden="true" />
        </button>
    </div>
  )
}

function Sidebar({ collapsed, mobileOpen, onToggle, onClose }: { collapsed: boolean; mobileOpen: boolean; onToggle: () => void; onClose: () => void }) {
  return (
    <>
      {mobileOpen && <button type="button" aria-label="Cerrar navegación" onClick={onClose} className="mc-sidebar-scrim fixed inset-0 z-40 bg-mc-ink/40 lg:hidden" />}
      <aside id="app-sidebar" data-collapsed={collapsed} className={`mc-sidebar fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-mc-line bg-mc-surface ${collapsed ? 'lg:w-[76px]' : 'lg:w-[248px]'} ${mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible lg:translate-x-0'}`}>
        <div className="flex h-16 items-center justify-between border-b border-mc-line-soft px-4">
          <span className="hidden lg:block"><Brand compact={collapsed} /></span>
          <span className="lg:hidden"><Brand compact={false} /></span>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink lg:hidden" onClick={onClose} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <nav className="mc-sidebar-nav min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mc-sidebar-group mb-1.5 truncate px-2 text-[11px] font-bold text-mc-gray-400">{group.label}</p>
              <ul className="space-y-0.5">
                {group.modules.map((module) => {
                  const Icon = module.icon
                  return (
                    <li key={module.path}>
                      <NavLink
                        to={module.path}
                        end={module.path === '/'}
                        onClick={onClose}
                        title={collapsed ? module.label : undefined}
                        aria-label={module.label}
                        className={({ isActive }) => `mc-nav-link relative isolate flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? 'text-mc-ink' : module.ready ? 'text-mc-gray-600 hover:bg-mc-surface-2 hover:text-mc-ink' : 'text-mc-gray-400 hover:bg-mc-surface-2 hover:text-mc-gray-600'}`}
                      >
                        <span className="mc-nav-icon shrink-0"><Icon size={17} aria-hidden="true" /></span>
                        <span className="mc-sidebar-label min-w-0 flex-1 truncate">{module.label}</span>
                        {!module.ready && <span className="mc-sidebar-label rounded-md bg-mc-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-mc-gray-500" title={`Se entrega en la fase ${module.phase}`}>Fase {module.phase}</span>}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-mc-line-soft p-3">
          <UserBox collapsed={collapsed} />
          <ThemeToggle showLabel={!collapsed} className="mt-2 w-full" />
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'} aria-expanded={!collapsed} aria-controls="app-sidebar" className="mc-press mt-2 hidden h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink lg:flex">
            {collapsed ? <PanelLeftOpen size={16} aria-label="Expandir menú" /> : <><PanelLeftClose size={16} aria-hidden="true" /> <span>Contraer menú</span></>}
          </button>
        </div>
      </aside>
    </>
  )
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'
  const current = findModule(location.pathname)

  return (
    <div className="min-h-dvh bg-mc-bg text-mc-ink">
      {!isHome && <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => setCollapsed((value) => !value)} onClose={() => setMobileOpen(false)} />}
      <div className={`min-h-dvh ${isHome ? '' : `mc-shell-content ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'}`}`}>
        {!isHome && <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-mc-line/90 bg-mc-bg/95 px-4 backdrop-blur-xl lg:hidden">
          <button type="button" className="mc-press grid h-11 w-11 place-items-center rounded-xl border border-mc-line bg-mc-surface text-mc-gray-600" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación" aria-expanded={mobileOpen} aria-controls="app-sidebar"><Menu size={18} /></button>
          <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-mc-ink">{current?.label ?? 'Mitra Click'}</p>
        </header>}
        <main className={isHome ? 'w-full p-4 lg:p-6' : 'mx-auto w-full max-w-[1500px] p-4 lg:p-6'}><div key={location.pathname} className="mc-page-enter"><Outlet /></div></main>
      </div>
    </div>
  )
}
