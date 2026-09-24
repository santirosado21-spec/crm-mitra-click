// Construcción de rutas internas con filtros en la URL. Los agentes de Grok Bot
// y los links compartidos dependen de que estas rutas sean estables.

import type { PeriodKey } from '../domain'
import type { UnitFilter } from './selectors'

export interface DashboardLinkParams {
  periodo?: PeriodKey
  unidad?: UnitFilter
}

export function withSearch(path: string, search: string | URLSearchParams | DashboardLinkParams = '') {
  let query: string
  if (typeof search === 'string') query = search
  else if (search instanceof URLSearchParams) query = search.toString()
  else {
    const params = new URLSearchParams()
    if (search.periodo) params.set('periodo', search.periodo)
    if (search.unidad && search.unidad !== 'todas') params.set('unidad', search.unidad)
    query = params.toString()
  }
  return query ? `${path}?${query}` : path
}

export const repPath = (repId: string, search: string | URLSearchParams | DashboardLinkParams = '') =>
  withSearch(`/vendedores/${repId}`, search)
