// Lectura de los KPIs que calcula la base (supabase/migrations/*kpis*). Aquí no se
// define ninguna fórmula de negocio: solo comparaciones y textos para mostrarlos.

export interface CommercialKpis {
  sales: number
  orders: number
  avg_ticket: number
  sales_shopify: number
  sales_direct: number
  invoiced: number
  collected: number
  margin: number
  margin_pct: number | null
  margin_coverage: number
  quotes_issued: number
  quotes_won: number
  quote_conversion: number | null
  pipeline_value: number
  pipeline_count: number
  receivable: number
  receivable_overdue: number
}

export interface OperationsKpis {
  orders_in_process: number
  orders_to_deliver: number
  orders_late: number
  purchases_pending: number
  shipments_pending: number
  remissions_to_verify: number
  incidents_open: number
  counts_pending: number
  stock_negative: number
  stock_low: number
  stock_movements: number
  issues_open: number
  issues_high: number
  alerts_new: number
  days_order_to_delivery: number | null
  days_purchase_to_receipt: number | null
  days_invoice_to_payment: number | null
}

/** Cambio porcentual contra el periodo anterior; undefined si no hay base para comparar. */
export function changePct(current: number, previous: number): number | undefined {
  if (!previous) return undefined
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** Advertencia sobre qué tan confiable es el margen, según cuánta venta tiene costo capturado. */
export function marginNote(marginPct: number | null, coverage: number): string | undefined {
  if (marginPct === null || coverage === 0) return 'Sin costos capturados: no se puede calcular.'
  if (coverage < 0.95) return `Calculado sobre el ${Math.round(coverage * 100)}% de la venta (el resto no tiene costo).`
  return undefined
}

export interface AttentionItem {
  label: string
  count: number
  to: string
  urgent: boolean
}

/** Lo que requiere intervención hoy: solo conceptos con casos, lo urgente primero. */
export function attentionItems(operations: OperationsKpis): AttentionItem[] {
  const all: AttentionItem[] = [
    { label: 'Pedidos atrasados contra su fecha prometida', count: operations.orders_late, to: '/pedidos', urgent: true },
    { label: 'Existencias en negativo', count: operations.stock_negative, to: '/inventario?estado=negativo', urgent: true },
    { label: 'Pendientes de severidad alta', count: operations.issues_high, to: '/pendientes?severidad=alta&estado=abierto', urgent: true },
    { label: 'Alertas nuevas', count: operations.alerts_new, to: '/pendientes?vista=alertas', urgent: true },
    { label: 'Remisiones por verificar', count: operations.remissions_to_verify, to: '/remisiones?estado=entregada', urgent: false },
    { label: 'Diferencias de conteo por resolver', count: operations.counts_pending, to: '/conteos?estado=pendiente', urgent: false },
    { label: 'Incidencias de bodega abiertas', count: operations.incidents_open, to: '/inventario', urgent: false },
    { label: 'Productos en punto de reorden', count: operations.stock_low, to: '/inventario?estado=bajo', urgent: false },
  ]
  return all.filter((item) => item.count > 0)
}
