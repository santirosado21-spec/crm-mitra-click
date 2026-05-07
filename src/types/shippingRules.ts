// Tipos para reglas de routing del TMS de paqueterías.

export interface ShippingRule {
  id:                  string
  priority:            number
  name:                string
  description:         string
  distance_km_min:     number | null
  distance_km_max:     number | null
  max_cost_mxn:        number | null
  preferred_provider:  string | null
  preferred_carrier:   string | null
  preferred_service:   string | null
  exclude_carriers:    string[]
  active:              boolean
  created_at:          string
  updated_at:          string
}

export type CreateShippingRuleInput =
  Omit<ShippingRule, 'id' | 'created_at' | 'updated_at'>
export type UpdateShippingRuleInput = Partial<CreateShippingRuleInput>
