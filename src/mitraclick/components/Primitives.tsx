import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, CircleSlash, Database, Info, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate, initials, statusTone } from '../utils'
import type { PerformanceStatus } from '../domain'

export function DemoBanner() {
  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-mc-yellow-strong/40 bg-mc-yellow-wash px-2.5 py-1 text-[11px] font-semibold text-mc-yellow-ink md:inline-flex"
      title="Datos simulados; todavía sin conexión al ERP, Shopify ni Analytics"
      data-testid="data-mode"
    >
      <Database size={12} aria-hidden="true" />
      Datos simulados
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold text-mc-yellow-ink">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold text-mc-ink lg:text-[30px]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-mc-muted">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className = '',
  padding = true,
  testId,
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  padding?: boolean
  testId?: string
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-mc-line bg-mc-surface shadow-mc-card ${className}`} data-testid={testId}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-mc-line-soft px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-mc-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs leading-5 text-mc-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

/** Pie de procedencia: toda cifra debe decir de dónde sale, qué periodo cubre y cuándo se actualizó. */
export function SourceStamp({ source, period, updatedAt }: { source: string; period?: string; updatedAt?: string }) {
  return (
    <p className="text-[11px] leading-4 text-mc-gray-400" data-testid="source-stamp">
      {source}
      {period && <>, {period}</>}
      {updatedAt && <>. Actualizado {formatDate(updatedAt, true)}</>}
    </p>
  )
}

export function Delta({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const positive = value >= 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular ${positive ? 'bg-mc-success-soft text-mc-success' : 'bg-mc-danger-soft text-mc-danger'}`}
      aria-label={`${positive ? 'Sube' : 'Baja'} ${Math.abs(value)}${suffix} contra el periodo anterior`}
    >
      <Icon size={12} aria-hidden="true" />
      {positive ? '+' : '−'}{Math.abs(value)}{suffix}
    </span>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  helper,
  icon: Icon,
  source,
  period,
  testId,
  emphasis = false,
}: {
  label: string
  value: string | number
  delta?: number
  helper?: string
  icon: LucideIcon
  /** @deprecated El acento ya no varía por tarjeta; se conserva por compatibilidad. */
  accent?: string
  source?: string
  period?: string
  testId?: string
  emphasis?: boolean
}) {
  return (
    <article
      className={`flex min-w-0 flex-col rounded-2xl border p-3 shadow-mc-card sm:p-4 ${emphasis ? 'border-mc-charcoal bg-mc-charcoal text-white' : 'border-mc-line bg-mc-surface'}`}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`min-w-0 text-xs font-semibold ${emphasis ? 'text-white/75' : 'text-mc-muted'}`}>{label}</p>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${emphasis ? 'bg-mc-yellow text-mc-ink' : 'bg-mc-surface-2 text-mc-charcoal'}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-2 break-words text-xl font-extrabold leading-tight tabular sm:text-[26px] ${emphasis ? 'text-white' : 'text-mc-ink'}`} data-testid={testId ? `${testId}-value` : undefined}>{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {delta !== undefined && <Delta value={delta} />}
        {helper && <span className={`text-[11px] ${emphasis ? 'text-white/75' : 'text-mc-muted'}`}>{helper}</span>}
      </div>
      {(source || period) && !emphasis && <div className="mt-3 border-t border-mc-line-soft pt-2"><SourceStamp source={source ?? 'Datos simulados'} period={period} /></div>}
    </article>
  )
}

const semaforo: Record<PerformanceStatus, { label: string; className: string; icon: LucideIcon }> = {
  cumple: { label: 'Cumple', className: 'bg-mc-success-soft text-mc-success border-mc-success/25', icon: CheckCircle2 },
  riesgo: { label: 'En riesgo', className: 'bg-mc-warning-soft text-mc-warning border-mc-warning/25', icon: AlertTriangle },
  'sin-ventas': { label: 'Sin ventas', className: 'bg-mc-danger-soft text-mc-danger border-mc-danger/25', icon: CircleSlash },
}

/** Estado de desempeño con icono + texto: nunca sólo color. */
export function Semaforo({ status, compact = false }: { status: PerformanceStatus; compact?: boolean }) {
  const tone = semaforo[status]
  const Icon = tone.icon
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone.className}`} data-status={status}>
      <Icon size={12} aria-hidden="true" />
      {compact ? <span className="sr-only">{tone.label}</span> : tone.label}
    </span>
  )
}

/** Barra de avance contra meta. El marcador vertical indica el 100 %. */
export function MeterBar({ value, max = 100, status, label }: { value: number; max?: number; status?: PerformanceStatus; label: string }) {
  const pct = max > 0 ? Math.min(value / max, 1.25) : 0
  const fill = status === 'sin-ventas' ? 'bg-mc-danger' : status === 'riesgo' ? 'bg-mc-warning' : status === 'cumple' ? 'bg-mc-success' : 'bg-mc-charcoal'
  return (
    <div className="relative h-2 w-full rounded-full bg-mc-gray-100" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(pct > 0 ? 3 : 0, (pct / 1.25) * 100)}%` }} />
      <span className="absolute inset-y-[-3px] w-0.5 rounded bg-mc-ink/50" style={{ left: `${100 / 1.25}%` }} aria-hidden="true" />
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const tones = {
    success: 'border-mc-success/25 bg-mc-success-soft text-mc-success',
    danger: 'border-mc-danger/25 bg-mc-danger-soft text-mc-danger',
    warning: 'border-mc-warning/25 bg-mc-warning-soft text-mc-warning',
    info: 'border-mc-yellow-strong/40 bg-mc-yellow-wash text-mc-yellow-ink',
    neutral: 'border-mc-line bg-mc-surface-2 text-mc-muted',
  }
  const tone = statusTone(status) as keyof typeof tones

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>
      {status}
    </span>
  )
}

export function IntegrationBadge({ label = 'Integración pendiente' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-mc-line bg-mc-surface-2 px-2.5 py-1 text-[11px] font-semibold text-mc-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-mc-yellow-strong" aria-hidden="true" />
      {label}
    </span>
  )
}

export function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-mc-yellow-soft font-extrabold text-mc-charcoal ${sizes[size]}`} role="img" aria-label={name}>
      {initials(name)}
    </span>
  )
}

export function ProductBar({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const width = max ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-semibold text-mc-gray-700">{label}</span>
        <span className="shrink-0 text-mc-muted tabular">{detail ?? formatCurrency(value, true)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mc-gray-100">
        <div className="h-full rounded-full bg-mc-charcoal" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mc-gray-100 text-mc-muted"><Info size={18} aria-hidden="true" /></span>
      <p className="text-sm font-bold text-mc-gray-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-mc-muted">{description}</p>
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-mc-bg" role="status">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-mc-line border-t-mc-yellow" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-mc-muted">Cargando información comercial…</p>
      </div>
    </div>
  )
}

export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-mc-bg px-5">
      <div className="w-full max-w-md rounded-2xl border border-mc-danger/30 bg-mc-surface p-6 text-center shadow-mc-card" role="alert">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mc-danger-soft text-mc-danger">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-extrabold text-mc-ink">No pudimos cargar la información</h1>
        <p className="mt-2 text-sm leading-6 text-mc-muted">La fuente de datos no respondió. Intenta cargarla de nuevo.</p>
        <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-mc-charcoal px-4 text-sm font-bold text-white hover:bg-mc-ink">
          <RotateCcw size={16} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </div>
  )
}
