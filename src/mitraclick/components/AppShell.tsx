import { useState } from 'react'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { ROLE_LABEL } from '../auth/roles'
import { NAV_GROUPS, findModule } from '../navigation'
import { UserAvatar } from './Primitives'

function Brand({ compact }: { compact: boolean }) {
  if (compact) return <img src="/mitraclick-mark.svg" alt="Mitra Click" className="h-10 w-10 shrink-0" />
  return <img src="/mitraclick-logo.jpg" alt="Mitra Click" className="h-auto w-[160px] max-w-full mix-blend-multiply" />
}

function UserBox({ collapsed }: { collapsed: boolean }) {
  const { profile, signOut } = useSession()
  if (!profile) return null
  return (
    <div className={`flex items-center rounded-xl bg-mc-surface-2 ${collapsed ? 'justify-center p-2' : 'gap-3 p-3'}`} data-testid="current-user">
      <UserAvatar name={profile.displayName} size="sm" />
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-mc-ink">{profile.displayName}</p>
          <p className="mt-0.5 truncate text-[10px] text-mc-muted">{profile.roles.map((role) => ROLE_LABEL[role]).join(', ') || 'Sin roles'}</p>
        </div>
      )}
      {!collapsed && (
        <button type="button" onClick={() => { void signOut() }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mc-muted hover:bg-white hover:text-mc-ink" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function Sidebar({ collapsed, mobileOpen, onToggle, onClose }: { collapsed: boolean; mobileOpen: boolean; onToggle: () => void; onClose: () => void }) {
  return (
    <>
      {mobileOpen && <button type="button" aria-label="Cerrar navegación" onClick={onClose} className="fixed inset-0 z-40 bg-mc-ink/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-mc-line bg-white transition-all duration-200 ${collapsed ? 'lg:w-[76px]' : 'lg:w-[248px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-16 items-center justify-between border-b border-mc-line-soft px-4">
          <Brand compact={collapsed} />
          <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink lg:hidden" onClick={onClose} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && <p className="mb-1.5 px-2 text-[11px] font-bold text-mc-gray-400">{group.label}</p>}
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
                        className={({ isActive }) => `flex h-10 items-center rounded-xl text-sm font-semibold transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-mc-yellow-soft text-mc-ink ring-1 ring-mc-yellow-strong/50' : module.ready ? 'text-mc-gray-600 hover:bg-mc-surface-2 hover:text-mc-ink' : 'text-mc-gray-400 hover:bg-mc-surface-2 hover:text-mc-gray-600'}`}
                      >
                        <Icon size={17} className="shrink-0" aria-hidden="true" />
                        {!collapsed && <span className="min-w-0 flex-1 truncate">{module.label}</span>}
                        {!collapsed && !module.ready && <span className="rounded-md bg-mc-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-mc-gray-500" title={`Se entrega en la fase ${module.phase}`}>Fase {module.phase}</span>}
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
          <button type="button" onClick={onToggle} className="mt-2 hidden h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink lg:flex">
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
  const current = findModule(location.pathname)

  return (
    <div className="min-h-dvh bg-mc-bg text-mc-ink">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => setCollapsed((value) => !value)} onClose={() => setMobileOpen(false)} />
      <div className={`min-h-dvh transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'}`}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-mc-line/90 bg-mc-bg/95 px-4 backdrop-blur-xl lg:hidden">
          <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-mc-line bg-white text-mc-gray-600" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación"><Menu size={18} /></button>
          <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-mc-ink">{current?.label ?? 'Mitra Click'}</p>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
