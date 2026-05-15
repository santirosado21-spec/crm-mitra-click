// Motor de markup — aplica un porcentaje configurable sobre el costo del
// carrier para obtener el precio que se cobra al cliente.
//
// La matriz de reglas vive en markup_profiles + markup_profile_rules.
// Una regla matchea cuando cliente / carrier / service coinciden (o están en
// NULL = comodín). Gana la regla más prioritaria del perfil más prioritario
// (prioridad ascendente: menor número = mayor prioridad).

import type { MarkupProfile, MarkupProfileRule } from '../../types/techship'

export interface MarkupContext {
  profiles: MarkupProfile[]
  rules:    MarkupProfileRule[]
}

export interface MarkupTarget {
  clienteId: string | null
  carrier:   string | null
  service:   string | null
}

export interface MarkupResult {
  base_price:    number
  final_price:   number
  markup_amount: number
  markup_pct:    number
  rule_id:       string | null
  profile_name:  string | null
}

function ruleMatches(rule: MarkupProfileRule, target: MarkupTarget): boolean {
  if (rule.cliente_id && rule.cliente_id !== target.clienteId) return false
  if (rule.carrier && target.carrier &&
      rule.carrier.toLowerCase() !== target.carrier.toLowerCase()) return false
  if (rule.carrier && !target.carrier) return false
  if (rule.service && target.service &&
      rule.service.toLowerCase() !== target.service.toLowerCase()) return false
  if (rule.service && !target.service) return false
  return true
}

/** Especificidad: reglas con más campos concretos ganan ante empate de prioridad. */
function specificity(rule: MarkupProfileRule): number {
  return (rule.cliente_id ? 1 : 0) + (rule.carrier ? 1 : 0) + (rule.service ? 1 : 0)
}

/**
 * Aplica el markup correspondiente a un costo base. Si no hay regla aplicable
 * devuelve el precio sin cambios (markup 0).
 */
export function applyMarkupToRate(
  basePrice: number,
  target: MarkupTarget,
  ctx: MarkupContext,
): MarkupResult {
  const activeProfiles = ctx.profiles
    .filter(p => p.activo)
    .sort((a, b) => a.prioridad - b.prioridad)

  for (const profile of activeProfiles) {
    const candidates = ctx.rules
      .filter(r => r.profile_id === profile.id && ruleMatches(r, target))
      .sort((a, b) => (a.prioridad - b.prioridad) || (specificity(b) - specificity(a)))

    const rule = candidates[0]
    if (!rule) continue

    let markupAmount = basePrice * (Number(rule.markup_pct) / 100)
    if (rule.min_markup != null && markupAmount < rule.min_markup) markupAmount = rule.min_markup
    if (rule.max_markup != null && markupAmount > rule.max_markup) markupAmount = rule.max_markup

    const finalPrice = Math.round(basePrice + markupAmount)
    return {
      base_price:    basePrice,
      final_price:   finalPrice,
      markup_amount: Math.round(markupAmount),
      markup_pct:    Number(rule.markup_pct),
      rule_id:       rule.id,
      profile_name:  profile.nombre,
    }
  }

  return {
    base_price:    basePrice,
    final_price:   basePrice,
    markup_amount: 0,
    markup_pct:    0,
    rule_id:       null,
    profile_name:  null,
  }
}
