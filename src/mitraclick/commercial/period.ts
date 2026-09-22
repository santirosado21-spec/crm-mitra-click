import type { PeriodKey } from '../domain'
import { addDays, daysBetween, daysInMonth, firstDayOfMonth, formatDayLabel, sameDayPreviousMonth } from './dates'

export interface ResolvedPeriod {
  key: PeriodKey
  label: string
  /** Texto para comparativos: "vs. mismo día de la semana pasada". */
  comparisonLabel: string
  start: string
  end: string
  previousStart: string
  previousEnd: string
  days: number
  /** Fracción de la cuota mensual que corresponde al periodo. */
  quotaFactor: number
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Últimos 7 días' },
  { key: 'mes', label: 'Mes en curso' },
  { key: '30d', label: 'Últimos 30 días' },
  { key: '90d', label: 'Últimos 90 días' },
]

export const isPeriodKey = (value: string | null): value is PeriodKey =>
  PERIOD_OPTIONS.some((option) => option.key === value)

const rolling = (key: PeriodKey, asOf: string, days: number, label: string): ResolvedPeriod => {
  const start = addDays(asOf, -(days - 1))
  return {
    key,
    label,
    comparisonLabel: `vs. ${days} días anteriores`,
    start,
    end: asOf,
    previousStart: addDays(start, -days),
    previousEnd: addDays(start, -1),
    days,
    quotaFactor: days / 30,
  }
}

/** Traduce un periodo con nombre a fechas concretas contra la fecha de corte de los datos. */
export function resolvePeriod(key: PeriodKey, asOf: string): ResolvedPeriod {
  switch (key) {
    case 'hoy':
      return {
        key,
        label: `Hoy, ${formatDayLabel(asOf, { weekday: 'long', day: 'numeric', month: 'long' })}`,
        comparisonLabel: 'vs. mismo día de la semana pasada',
        start: asOf,
        end: asOf,
        previousStart: addDays(asOf, -7),
        previousEnd: addDays(asOf, -7),
        days: 1,
        quotaFactor: 1 / daysInMonth(asOf),
      }
    case 'mes': {
      const start = firstDayOfMonth(asOf)
      const days = daysBetween(start, asOf) + 1
      const previousEnd = sameDayPreviousMonth(asOf)
      return {
        key,
        label: `Mes en curso, ${formatDayLabel(start, { day: 'numeric', month: 'short' })} al ${formatDayLabel(asOf, { day: 'numeric', month: 'short' })}`,
        comparisonLabel: 'vs. mismo tramo del mes anterior',
        start,
        end: asOf,
        previousStart: firstDayOfMonth(previousEnd),
        previousEnd,
        days,
        quotaFactor: days / daysInMonth(asOf),
      }
    }
    case 'semana':
      return rolling(key, asOf, 7, 'Últimos 7 días')
    case '30d':
      return rolling(key, asOf, 30, 'Últimos 30 días')
    case '90d':
      return rolling(key, asOf, 90, 'Últimos 90 días')
  }
}
