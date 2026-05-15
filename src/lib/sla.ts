// SLA de entrega — reglas de cumplimiento del TMS de paquetería.
//
//   OnTimeDelivery   = actual_delivery_date <= promised_delivery_date
//   OnTimeInduction  = induction_date <= created_at + 1 día
//   Delayed          = actual_delivery_date > promised_delivery_date
//   Returned         = tracking_status === 'devuelto'
//
// Funciones puras, sin dependencias de React ni de Supabase — testeables.

const DAY_MS = 86_400_000

export interface SLAInput {
  promised_delivery_date?: string | null
  actual_delivery_date?:   string | null
  induction_date?:         string | null
  created_at?:             string | null
  tracking_status?:        string | null
}

export interface SLAResult {
  hasDelivery:     boolean
  onTime:          boolean
  delayed:         boolean
  hasInduction:    boolean
  onTimeInduction: boolean
  returned:        boolean
  inTransit:       boolean
  exception:       boolean
}

/** Evalúa todas las dimensiones de SLA de una guía. */
export function evaluateSLA(g: SLAInput): SLAResult {
  const promised  = g.promised_delivery_date
  const actual    = g.actual_delivery_date
  const induction = g.induction_date

  const hasDelivery = !!(promised && actual)
  const onTime  = hasDelivery && new Date(actual!).getTime() <= new Date(promised!).getTime()
  const delayed = hasDelivery && new Date(actual!).getTime() >  new Date(promised!).getTime()

  const hasInduction = !!(induction && g.created_at)
  const onTimeInduction = hasInduction &&
    new Date(induction!).getTime() <= new Date(g.created_at!).getTime() + DAY_MS

  return {
    hasDelivery, onTime, delayed, hasInduction, onTimeInduction,
    returned:  g.tracking_status === 'devuelto',
    inTransit: g.tracking_status === 'en_transito',
    exception: g.tracking_status === 'excepcion',
  }
}

/** Porcentaje entero seguro (0 si el denominador es 0). */
export function slaPct(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0
}
