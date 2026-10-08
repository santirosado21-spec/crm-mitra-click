import { ArrowUpRight, CircleDashed, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { ROLE_LABEL } from '../auth/roles'
import { PageHeader, UserAvatar } from '../components/Primitives'
import { ThemeToggle } from '../components/ThemeToggle'
import { NAV_GROUPS } from '../navigation'

const MODULE_ROW_STYLES = [
  { card: 'bg-mc-yellow-wash', icon: 'bg-mc-yellow-soft text-mc-ink' },
  { card: 'bg-mc-info-soft', icon: 'bg-mc-surface/75 text-mc-info' },
  { card: 'bg-mc-success-soft', icon: 'bg-mc-surface/75 text-mc-success' },
  { card: 'bg-mc-warning-soft', icon: 'bg-mc-surface/75 text-mc-warning' },
  { card: 'bg-mc-gray-100', icon: 'bg-mc-surface text-mc-charcoal' },
] as const

/** Inicio: acceso visual y directo a cada módulo del sistema. */
export function HomePage() {
  const { profile, signOut } = useSession()
  const firstName = profile?.displayName.split(' ')[0] ?? ''

  return (
    <div className="mx-auto min-h-[calc(100dvh-2rem)] max-w-[1280px] py-1 lg:min-h-[calc(100dvh-3rem)] lg:py-2">
      <div className="mb-5 flex min-h-14 items-center justify-between gap-4 px-1">
        <img src="/mitraclick-logo.jpg" alt="Mitra Click" className="mc-brand-logo h-auto w-[145px] mix-blend-multiply sm:w-[170px]" />
        {profile && (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <UserAvatar name={profile.displayName} size="sm" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xs font-bold text-mc-ink">{profile.displayName}</p>
              <p className="truncate text-[10px] text-mc-muted">{profile.roles.map((role) => ROLE_LABEL[role]).join(', ') || 'Sin roles'}</p>
            </div>
            <button type="button" onClick={() => { void signOut() }} className="mc-press grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-mc-line bg-mc-surface text-mc-muted shadow-mc-card hover:bg-mc-yellow-wash hover:text-mc-ink" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <PageHeader
        eyebrow="Mitra Click · Sistema operativo"
        title={firstName ? `Bienvenido, ${firstName}` : 'Bienvenido'}
        description="Elige un módulo para comenzar. El menú de navegación aparecerá dentro del sistema."
      />

      <nav className="mt-7 space-y-7" aria-label="Módulos del sistema" data-testid="home-main-menu">
        {NAV_GROUPS.map((group, groupIndex) => {
          const modules = group.modules.filter((module) => module.path !== '/')
          if (modules.length === 0) return null
          const rowStyle = MODULE_ROW_STYLES[groupIndex % MODULE_ROW_STYLES.length]

          return (
            <section key={group.label} aria-labelledby={`home-group-${group.label}`} data-row-tone={(groupIndex % MODULE_ROW_STYLES.length) + 1}>
              <h2 id={`home-group-${group.label}`} className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-mc-muted">
                {group.label}
              </h2>
              <ul className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {modules.map((module, index) => {
                  const Icon = module.icon
                  return (
                    <li key={module.path} className="mc-menu-enter h-full" style={{ animationDelay: `${index * 35}ms` }}>
                      <Link
                        to={module.path}
                        className={`mc-module-card group flex h-28 w-full flex-col justify-between rounded-2xl border p-3.5 shadow-mc-card ${module.ready ? `border-mc-line ${rowStyle.card} hover:border-mc-yellow-strong hover:bg-mc-surface` : 'border-mc-line bg-mc-surface-2 text-mc-muted hover:border-mc-charcoal'}`}
                        data-testid={`home-module-${module.path.slice(1)}`}
                      >
                        <span className={`mc-module-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl ${module.ready ? `${rowStyle.icon} group-hover:bg-mc-yellow group-hover:text-mc-ink` : 'bg-mc-gray-100 text-mc-muted'}`}>
                          {module.ready ? <Icon size={18} aria-hidden="true" /> : <CircleDashed size={18} aria-hidden="true" />}
                        </span>
                        <span className="mt-3 flex min-h-10 items-end justify-between gap-2">
                          <span className={`line-clamp-2 text-left text-sm font-bold leading-5 ${module.ready ? 'text-mc-ink' : 'text-mc-muted'}`}>{module.label}</span>
                          {module.ready ? <span className="mc-module-arrow mb-0.5 shrink-0 text-mc-muted group-hover:text-mc-ink"><ArrowUpRight size={15} aria-hidden="true" /></span> : <span className="text-[10px] font-bold">En construcción</span>}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </nav>
    </div>
  )
}
