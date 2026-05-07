// Aplica reglas de routing antes del motor de auto-pick.
//
// Flujo:
//   1. Ordenar reglas por priority asc (menor número se evalúa primero).
//   2. Para cada regla activa, evaluar condiciones:
//      - distance_km_min/max: la distancia del envío debe caer en el rango.
//      - max_cost_mxn: filtra rates que NO cuesten más que ese techo.
//   3. Si la regla matchea, aplicar acción:
//      - preferred_carrier: filtrar rates a los que igualan el carrier preferido.
//      - exclude_carriers: quitar rates que matcheen a esos carriers.
//   4. Si después de filtrar no queda ningún rate, ignorar la regla y seguir
//      con la siguiente (no penalizamos al usuario por reglas demasiado
//      estrictas).
//   5. Devolver el set filtrado para que `pickCarrier()` haga su scoring.

import type { Rate } from './types'
import type { ShippingRule } from '../../types/shippingRules'

export interface RulesContext {
  distance_km: number | null
}

export interface RuleApplication {
  applied:   ShippingRule[]
  rates:     Rate[]
  reasoning: string
}

export function applyRules(
  rates: Rate[],
  ctx: RulesContext,
  rules: ShippingRule[],
): RuleApplication {
  if (rates.length === 0) return { applied: [], rates, reasoning: 'Sin rates para evaluar' }
  if (rules.length === 0) return { applied: [], rates, reasoning: 'Sin reglas activas' }

  const applied: ShippingRule[] = []
  let current = [...rates]
  const reasonings: string[] = []

  const sorted = [...rules].filter(r => r.active).sort((a, b) => a.priority - b.priority)

  for (const rule of sorted) {
    // 1. Distancia: si la regla pide rango y no tenemos distancia, saltamos.
    if (rule.distance_km_min != null || rule.distance_km_max != null) {
      if (ctx.distance_km == null) continue
      if (rule.distance_km_min != null && ctx.distance_km < Number(rule.distance_km_min)) continue
      if (rule.distance_km_max != null && ctx.distance_km > Number(rule.distance_km_max)) continue
    }

    // 2. Costo: filtra los rates que NO superen max_cost_mxn (si la regla lo
    //    define). Si después no queda ninguno, la regla no aplica.
    let candidates = current
    if (rule.max_cost_mxn != null) {
      candidates = candidates.filter(r => r.price_mxn <= Number(rule.max_cost_mxn))
    }

    // 3. Acción: preferred_carrier reduce a esos rates; exclude_carriers los quita.
    let after = candidates
    if (rule.preferred_carrier) {
      after = after.filter(r => r.carrier === rule.preferred_carrier)
    }
    if (rule.exclude_carriers && rule.exclude_carriers.length > 0) {
      after = after.filter(r => !rule.exclude_carriers.includes(r.carrier))
    }
    if (rule.preferred_service) {
      after = after.filter(r => r.service === rule.preferred_service)
    }

    if (after.length === 0) continue

    applied.push(rule)
    current = after
    reasonings.push(`Regla "${rule.name}" → ${after.length} rates`)
  }

  return {
    applied,
    rates: current,
    reasoning: reasonings.length > 0 ? reasonings.join(' · ') : 'Ninguna regla matched',
  }
}
