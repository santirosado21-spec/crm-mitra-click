// Motor de auto-pick: dada una lista de Rate[] elige la mejor combinación
// carrier/servicio para el envío.
//
// Reglas (en orden):
//   1. Si hay rates is_local=true Y rates is_local=false → solo locales.
//      (Preferencia dura: Mexicano gana sobre transnacional.)
//   2. Score compuesto:
//        score = (1/price_norm) × W_PRICE
//              + (1/days_norm)  × W_DAYS
//              + (1/dist_norm)  × W_DIST     (cuando hay distancia disponible)
//   3. Devuelve winner + ranking + reasoning legible.
//
// Pesos configurables al inicio del archivo. Si querés cambiar el balance
// solo edita las constantes; la firma del exporte queda igual.

import type { Rate } from './types'

export interface AutopickContext {
  distance_km?: number | null
}

export interface AutopickResult {
  winner:    Rate | null
  ranking:   { rate: Rate; score: number; reasoning: string }[]
  reasoning: string
}

const W_PRICE = 0.5
const W_DAYS  = 0.3
const W_DIST  = 0.2

/** Normaliza un valor a (0,1] dentro del rango observado. */
function normalize(value: number, min: number, max: number): number {
  if (max === min || !isFinite(value)) return 1
  // Mayor valor = peor → invertimos al final con (1 / norm).
  return (value - min) / (max - min) || 0.0001
}

export function pickCarrier(rates: Rate[], ctx: AutopickContext = {}): AutopickResult {
  if (rates.length === 0) {
    return { winner: null, ranking: [], reasoning: 'Sin cotizaciones disponibles.' }
  }

  // Regla 1: si hay locales E internacionales, filtrar a solo locales.
  const hasLocal    = rates.some(r => r.is_local)
  const hasIntl     = rates.some(r => !r.is_local)
  const eligible    = (hasLocal && hasIntl) ? rates.filter(r => r.is_local) : rates
  const localFilter = hasLocal && hasIntl

  // Regla 2: score compuesto.
  const prices  = eligible.map(r => r.price_mxn)
  const days    = eligible.map(r => r.delivery_days)
  const minP = Math.min(...prices), maxP = Math.max(...prices)
  const minD = Math.min(...days),   maxD = Math.max(...days)
  const distRef = ctx.distance_km ?? null

  const ranked = eligible.map(rate => {
    const priceNorm = normalize(rate.price_mxn, minP, maxP)
    const daysNorm  = normalize(rate.delivery_days, minD, maxD)
    // Distancia: como solo tenemos un valor (entrega), no normalizamos por
    // rate, sino que penalizamos rates que tarden más con respecto a la
    // distancia esperada. Si no hay distancia, ignoramos el componente.
    const distComponent = distRef && distRef > 0
      ? W_DIST * (1 / Math.max(0.0001, daysNorm + 1))
      : 0
    const score = (1 / Math.max(0.0001, priceNorm + 1)) * W_PRICE
                + (1 / Math.max(0.0001, daysNorm + 1))  * W_DAYS
                + distComponent
    const reasoning = [
      rate.is_local ? 'local' : 'transnacional',
      `$${rate.price_mxn.toLocaleString('es-MX')}`,
      `${rate.delivery_days}d`,
    ].join(' · ')
    return { rate, score, reasoning }
  })

  ranked.sort((a, b) => b.score - a.score)
  const winner = ranked[0]?.rate ?? null
  const reasoning = winner
    ? `${winner.carrier_label} ${winner.service_label} · ${ranked[0].reasoning}` +
      (localFilter ? ' (filtro local-first activo)' : '') +
      (distRef ? ` · ${distRef} km` : '')
    : 'Sin ganador'

  return { winner, ranking: ranked, reasoning }
}

/** Ahorro estimado en MXN: precio del 2º mejor menos precio del ganador. */
export function autopickSavings(result: AutopickResult): number {
  if (result.ranking.length < 2) return 0
  return Math.max(0, result.ranking[1].rate.price_mxn - result.ranking[0].rate.price_mxn)
}
