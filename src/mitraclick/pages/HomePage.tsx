import { ArrowLeft, ArrowUpRight, CircleDashed, LogOut } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { ROLE_LABEL } from '../auth/roles'
import { PageHeader, UserAvatar } from '../components/Primitives'
import { ThemeToggle } from '../components/ThemeToggle'
import { AreaIllustration } from '../components/AreaIllustration'
import { NAV_GROUPS } from '../navigation'

const MODULE_ROW_STYLES = [
  { card: 'bg-mc-yellow-wash', icon: 'bg-mc-yellow-soft text-mc-ink' },
  { card: 'bg-mc-info-soft', icon: 'bg-mc-surface/75 text-mc-info' },
  { card: 'bg-mc-success-soft', icon: 'bg-mc-surface/75 text-mc-success' },
  { card: 'bg-mc-warning-soft', icon: 'bg-mc-surface/75 text-mc-warning' },
  { card: 'bg-mc-gray-100', icon: 'bg-mc-surface text-mc-charcoal' },
] as const

const AREA_DESCRIPTIONS: Record<string, string> = {
  'Dirección': 'Indicadores, prioridades y decisiones del negocio.',
  'Shopify': 'Ventas en línea, marketing e integración de tu tienda.',
  'Ventas': 'De la primera cotización al pedido confirmado.',
  'Compras': 'Proveedores, abastecimiento y órdenes de compra.',
  'Bodega': 'Inventario, surtido y operación del almacén.',
  'Logística': 'Fletes, viajes y entregas en un solo lugar.',
  'Finanzas': 'Facturas, cobros y estados de cuenta.',
  'Catálogo': 'Productos, familias y categorías de Mitra Click.',
  'Marketing': 'Prospección, leads y enlaces medibles.',
  'Sistema': 'Usuarios, permisos y trazabilidad del sistema.',
}

const areaKey = (label: string) => label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Inicio: acceso visual y directo a cada módulo del sistema. */
export function HomePage() {
  const { profile, signOut } = useSession()
  const firstName = profile?.displayName.split(' ')[0] ?? ''
  const [params] = useSearchParams()
  const selected = NAV_GROUPS.find((group) => areaKey(group.label) === params.get('area'))
  const pageRef = useRef<HTMLDivElement>(null)
  const selectedLabel = selected?.label
  useEffect(() => {
    // Cambiar de área también reinicia el recorrido de teclado y la posición móvil.
    pageRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [selectedLabel])

  return (
    <div ref={pageRef} tabIndex={-1} role="region" aria-label={selectedLabel ?? 'Selector de áreas'} className="mc-home-focus mx-auto min-h-[calc(100dvh-2rem)] max-w-[1280px] py-1 outline-none lg:min-h-[calc(100dvh-3rem)] lg:py-2">
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
        title={selected?.label ?? (firstName ? `Bienvenido, ${firstName}` : 'Bienvenido')}
        description={selected ? AREA_DESCRIPTIONS[selected.label] : 'Tu operación, en un solo lugar. Elige un área para descubrir sus herramientas.'}
        actions={selected ? <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-mc-line bg-mc-surface px-4 text-sm font-semibold"><ArrowLeft size={16} aria-hidden="true" /> Todas las áreas</Link> : undefined}
      />

      {!selected ? <nav className="mt-7" aria-label="Módulos del sistema" data-testid="home-main-menu">
        <ul className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_GROUPS.map((group, index) => {
            const tone = MODULE_ROW_STYLES[Math.floor(index / 3) % MODULE_ROW_STYLES.length]
            const sectionCount = group.modules.filter((module) => module.path !== '/').length
            return <li key={group.label} className="mc-menu-enter h-full" style={{ animationDelay: `${index * 35}ms` }}>
              <Link to={`/?area=${areaKey(group.label)}`} data-testid={`home-area-${areaKey(group.label)}`} aria-label={`Abrir ${group.label}`} className="mc-module-card group flex h-full flex-col overflow-hidden rounded-3xl border border-mc-line bg-mc-surface shadow-mc-card">
                <div className={`relative h-52 shrink-0 text-mc-gray-700 ${tone.card}`} data-testid="area-artwork">
                  <span className="absolute left-5 top-4 text-[11px] font-bold tracking-widest text-mc-muted">{String(index + 1).padStart(2, '0')}</span>
                  <AreaIllustration area={group.label} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-xl font-extrabold text-mc-ink">{group.label}</h2>
                  <p className="mb-5 mt-2 min-h-12 text-sm leading-6 text-mc-muted">{AREA_DESCRIPTIONS[group.label]}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-mc-line-soft pt-4 text-xs font-semibold text-mc-muted">
                    <span>{sectionCount} {sectionCount === 1 ? 'sección' : 'secciones'}</span>
                    <span className="flex items-center gap-2 text-mc-ink">Explorar área <ArrowUpRight size={17} aria-hidden="true" /></span>
                  </div>
                </div>
              </Link>
            </li>
          })}
        </ul>
      </nav> : <nav key={selected.label} className="mt-7 space-y-7" aria-label={`Secciones de ${selected.label}`} data-testid="home-area-sections">
        {[selected].map((group) => {
          const groupIndex = NAV_GROUPS.indexOf(group)
          const modules = group.modules.filter((module) => module.path !== '/')
          if (modules.length === 0) return null
          const rowStyle = MODULE_ROW_STYLES[groupIndex % MODULE_ROW_STYLES.length]

          return (
            <section key={group.label} aria-labelledby={`home-group-${group.label}`} data-row-tone={(groupIndex % MODULE_ROW_STYLES.length) + 1}>
              <h2 id={`home-group-${group.label}`} className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-mc-muted">
                {group.label}
              </h2>
              <ul className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((module, index) => {
                  const Icon = module.icon
                  return (
                    <li key={module.path} className="mc-menu-enter h-full" style={{ animationDelay: `${index * 35}ms` }}>
                      <Link
                        to={module.path}
                        className={`mc-module-card group flex h-full min-h-48 w-full flex-col rounded-2xl border p-5 shadow-mc-card ${module.ready ? `border-mc-line ${rowStyle.card} hover:border-mc-yellow-strong hover:bg-mc-surface` : 'border-mc-line bg-mc-surface-2 text-mc-muted hover:border-mc-charcoal'}`}
                        data-testid={`home-module-${module.path.slice(1)}`}
                      >
                        <span className={`mc-module-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl ${module.ready ? `${rowStyle.icon} group-hover:bg-mc-yellow group-hover:text-mc-ink` : 'bg-mc-gray-100 text-mc-muted'}`}>
                          {module.ready ? <Icon size={18} aria-hidden="true" /> : <CircleDashed size={18} aria-hidden="true" />}
                        </span>
                        <span className="mt-3 flex min-h-10 items-end justify-between gap-2">
                          <span className={`line-clamp-2 text-left text-sm font-bold leading-5 ${module.ready ? 'text-mc-ink' : 'text-mc-muted'}`}>{module.label}</span>
                          {module.ready ? <span className="mc-module-arrow mb-0.5 shrink-0 text-mc-muted group-hover:text-mc-ink"><ArrowUpRight size={15} aria-hidden="true" /></span> : <span className="text-[10px] font-bold">En construcción</span>}
                        </span>
                        <p className="mt-2 text-sm leading-6 text-mc-muted">{module.summary}</p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </nav>}
    </div>
  )
}
