import { CalendarDays } from 'lucide-react'
import type { PeriodKey } from '../domain'
import { BUSINESS_UNIT_LABEL } from '../domain'
import { PERIOD_OPTIONS, type ResolvedPeriod } from '../commercial/period'
import type { UnitFilter } from '../commercial/selectors'
import { formatDayLabel } from '../commercial/dates'

interface SegmentOption<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  testId?: string
}) {
  return (
    <div role="group" aria-label={label} className="flex w-fit min-w-0 max-w-full overflow-x-auto rounded-xl border border-mc-line bg-mc-surface p-1" data-testid={testId}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            data-value={option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-9 shrink-0 whitespace-nowrap rounded-lg px-2.5 text-xs sm:px-3 font-semibold transition-colors ${active ? 'bg-mc-charcoal text-white' : 'text-mc-muted hover:bg-mc-surface-2 hover:text-mc-ink'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

const UNIT_OPTIONS: SegmentOption<UnitFilter>[] = [
  { value: 'todas', label: 'Ambos negocios' },
  { value: 'mitra', label: BUSINESS_UNIT_LABEL.mitra },
  { value: 'mitraclick', label: BUSINESS_UNIT_LABEL.mitraclick },
]

const PERIOD_SHORT: Record<PeriodKey, string> = { hoy: 'Hoy', semana: '7 días', mes: 'Mes', '30d': '30 días', '90d': '90 días' }

/** Barra de filtros estándar: periodo, unidad de negocio opcional y fecha de corte de los datos. */
export function FilterBar({
  period,
  onPeriodChange,
  unit,
  onUnitChange,
  asOf,
  periods = PERIOD_OPTIONS.map((option) => option.key),
}: {
  period: ResolvedPeriod
  onPeriodChange: (value: PeriodKey) => void
  unit?: UnitFilter
  onUnitChange?: (value: UnitFilter) => void
  asOf: string
  periods?: PeriodKey[]
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-mc-line bg-mc-surface-2/60 p-3 lg:flex-row lg:items-center lg:justify-between" data-testid="filter-bar">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Segmented label="Periodo" value={period.key} options={periods.map((key) => ({ value: key, label: PERIOD_SHORT[key] }))} onChange={onPeriodChange} testId="filter-period" />
        {unit && onUnitChange && <Segmented label="Unidad de negocio" value={unit} options={UNIT_OPTIONS} onChange={onUnitChange} testId="filter-unit" />}
      </div>
      <p className="flex items-center gap-2 text-xs text-mc-muted" data-testid="period-label">
        <CalendarDays size={14} aria-hidden="true" />
        <span>
          <span className="font-semibold text-mc-ink">{period.label}</span>
          <span className="hidden sm:inline">, datos al {formatDayLabel(asOf, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </span>
      </p>
    </div>
  )
}
