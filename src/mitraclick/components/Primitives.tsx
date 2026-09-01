import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Database, Info, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency, initials, statusTone } from '../utils'

export function DemoBanner() {
  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 md:inline-flex"
      title="Datos simulados con corte fijo al 27 de agosto de 2026; sin conexiones externas"
    >
      <Database size={12} aria-hidden="true" />
      Datos demo
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
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e25f45]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 lg:text-[30px]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
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
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)] ${className}`}>
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  helper,
  icon: Icon,
  accent = 'blue',
}: {
  label: string
  value: string | number
  delta?: number
  helper?: string
  icon: LucideIcon
  accent?: 'blue' | 'coral' | 'green' | 'amber' | 'violet'
}) {
  const accents = {
    blue: 'bg-blue-50 text-blue-700',
    coral: 'bg-orange-50 text-[#d65339]',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accents[accent]}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
        {delta !== undefined && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
      {helper && <p className="mt-1 text-[11px] text-slate-500">{helper}</p>}
    </article>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  }
  const tone = statusTone(status) as keyof typeof tones

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>
      {status}
    </span>
  )
}

export function IntegrationBadge({ label = 'Integración pendiente' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {label}
    </span>
  )
}

export function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#e8edf6] font-extrabold text-[#23395d] ${sizes[size]}`} aria-label={name}>
      {initials(name)}
    </span>
  )
}

export function ProductBar({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const width = max ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-400">{detail ?? formatCurrency(value, true)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-[#23395d] to-[#4975b7]" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Info size={18} /></span>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">{description}</p>
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f5f4ef]">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#e25f45]" />
        <p className="mt-3 text-sm font-semibold text-slate-500">Preparando entorno demostrativo…</p>
      </div>
    </div>
  )
}

export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f5f4ef] px-5">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-700">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-extrabold text-slate-950">No pudimos preparar la información</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">La fuente de datos no respondió correctamente. Puedes intentar cargar nuevamente el entorno.</p>
        <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#23395d] px-4 text-sm font-bold text-white hover:bg-[#192b49]">
          <RotateCcw size={16} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </div>
  )
}
