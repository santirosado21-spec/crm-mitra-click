import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BusinessUnit, CommercialData, PeriodKey } from '../domain'
import { useMitraClick } from '../MitraClickContext'
import { isPeriodKey, resolvePeriod } from './period'
import type { UnitFilter } from './selectors'

export const isUnitFilter = (value: string | null): value is BusinessUnit =>
  value === 'mitra' || value === 'mitraclick'

/**
 * Filtros de dashboard guardados en la URL (`?periodo=mes&unidad=mitra`).
 * Así un link reproduce exactamente la misma vista: sirve para compartir,
 * y para que los agentes de Grok Bot naveguen directo.
 */
export function useDashboardFilters({ defaultPeriod = 'mes' }: { defaultPeriod?: PeriodKey } = {}) {
  const [params, setParams] = useSearchParams()
  const commercial = useCommercialData()

  const periodParam = params.get('periodo')
  const unitParam = params.get('unidad')
  const periodKey: PeriodKey = isPeriodKey(periodParam) ? periodParam : defaultPeriod
  const unit: UnitFilter = isUnitFilter(unitParam) ? unitParam : 'todas'
  const period = useMemo(() => resolvePeriod(periodKey, commercial.asOf), [periodKey, commercial.asOf])

  const setParam = useCallback(
    (key: string, value: string, defaultValue: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (value === defaultValue) next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return {
    commercial,
    period,
    periodKey,
    unit,
    params,
    setPeriod: (value: PeriodKey) => setParam('periodo', value, defaultPeriod),
    setUnit: (value: UnitFilter) => setParam('unidad', value, 'todas'),
    setParam,
  }
}

export function useCommercialData(): CommercialData {
  const { data } = useMitraClick()
  if (!data) throw new Error('Los datos comerciales aún no están disponibles')
  return data.commercial
}
