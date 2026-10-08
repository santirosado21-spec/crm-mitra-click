import { ArrowUpRight, CircleDashed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { PageHeader } from '../components/Primitives'
import { NAV_GROUPS } from '../navigation'

/** Inicio: acceso visual y directo a cada módulo del sistema. */
export function HomePage() {
  const { profile } = useSession()
  const firstName = profile?.displayName.split(' ')[0] ?? ''

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1280px] flex-col justify-center py-4 lg:min-h-[calc(100dvh-3rem)] lg:py-8">
      <PageHeader
        eyebrow="Mitra Click · Sistema operativo"
        title={firstName ? `Hola, ${firstName}` : 'Menú principal'}
        description="Elige el área con la que quieres trabajar."
      />

      <nav className="mt-7 space-y-7" aria-label="Módulos del sistema" data-testid="home-main-menu">
        {NAV_GROUPS.map((group) => {
          const modules = group.modules.filter((module) => module.path !== '/')
          if (modules.length === 0) return null

          return (
            <section key={group.label} aria-labelledby={`home-group-${group.label}`}>
              <h2 id={`home-group-${group.label}`} className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-mc-muted">
                {group.label}
              </h2>
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {modules.map((module, index) => {
                  const Icon = module.icon
                  return (
                    <li key={module.path} className="mc-menu-enter" style={{ animationDelay: `${index * 35}ms` }}>
                      <Link
                        to={module.path}
                        className={`mc-module-card group flex h-full min-h-24 w-full flex-col justify-between rounded-2xl border p-3.5 shadow-mc-card ${module.ready ? 'border-mc-line bg-mc-surface hover:border-mc-yellow-strong hover:bg-mc-yellow-wash' : 'border-mc-line bg-mc-surface-2 text-mc-muted hover:border-mc-charcoal'}`}
                        data-testid={`home-module-${module.path.slice(1)}`}
                      >
                        <span className={`mc-module-icon grid h-9 w-9 place-items-center rounded-xl ${module.ready ? 'bg-mc-yellow-soft text-mc-ink group-hover:bg-mc-yellow' : 'bg-mc-gray-100 text-mc-muted'}`}>
                          {module.ready ? <Icon size={18} aria-hidden="true" /> : <CircleDashed size={18} aria-hidden="true" />}
                        </span>
                        <span className="mt-3 flex items-end justify-between gap-2">
                          <span className={`text-left text-sm font-bold leading-5 ${module.ready ? 'text-mc-ink' : 'text-mc-muted'}`}>{module.label}</span>
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
