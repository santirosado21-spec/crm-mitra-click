// Presentación de reportes y hallazgos: nombres legibles para las llaves que genera
// la base y formato de sus valores. Funciones puras; aquí no se calcula ningún indicador.

import { formatDate, formatMoney, formatNumber, formatRatio } from './format'

export const REPORT_KIND_LABEL: Record<string, string> = {
  ejecutivo: 'Ejecutivo',
  comercial: 'Comercial',
  productos: 'Productos y familias',
  operacion: 'Operación y logística',
  inventario: 'Inventario',
}
export const FREQUENCY_LABEL: Record<string, string> = { semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' }
export const AGENT_LABEL: Record<string, string> = { supervision: 'Supervisión', comercial: 'Comercial', marketing: 'Marketing', ejecutivo: 'Ejecutivo' }
export const FINDING_STATUS_LABEL: Record<string, string> = { nuevo: 'Nuevo', aceptado: 'Aceptado', descartado: 'Descartado', convertido: 'Convertido en pendiente' }

const LABELS: Record<string, string> = {
  // Secciones
  commercial: 'Comercial', previous: 'Periodo anterior', operations: 'Operación', top_families: 'Familias con mayor venta', top_products: 'Productos con mayor movimiento',
  by_rep: 'Por vendedor', open_quotes: 'Cotizaciones abiertas más grandes', by_family: 'Ventas por familia', previous_by_family: 'Ventas por familia, periodo anterior',
  idle_with_stock: 'Sin venta y con existencia', late_orders: 'Pedidos atrasados', issues_by_rule: 'Pendientes abiertos por regla', movements_by_type: 'Movimientos por tipo',
  low_stock: 'En punto de reorden', count_differences: 'Diferencias de conteo', sample: 'Ejemplos',
  // Indicadores
  sales: 'Ventas', orders: 'Pedidos', avg_ticket: 'Ticket promedio', sales_shopify: 'Ventas Shopify', sales_direct: 'Ventas directas', invoiced: 'Facturación', collected: 'Cobranza',
  margin: 'Margen', margin_pct: 'Margen %', margin_coverage: 'Venta con costo capturado', quotes_issued: 'Cotizaciones emitidas', quotes_won: 'Cotizaciones ganadas', quote_conversion: 'Conversión',
  pipeline_value: 'Pipeline abierto', pipeline_count: 'Cotizaciones abiertas', receivable: 'Por cobrar', receivable_overdue: 'Vencido',
  orders_in_process: 'Pedidos en proceso', orders_to_deliver: 'Pedidos por entregar', orders_late: 'Pedidos atrasados', purchases_pending: 'Compras por recibir', shipments_pending: 'Envíos pendientes',
  remissions_to_verify: 'Remisiones por verificar', incidents_open: 'Incidencias abiertas', counts_pending: 'Conteos por resolver', stock_negative: 'Existencias en negativo', stock_low: 'En punto de reorden',
  stock_movements: 'Movimientos de inventario', issues_open: 'Pendientes abiertos', issues_high: 'Pendientes de severidad alta', alerts_new: 'Alertas nuevas',
  days_order_to_delivery: 'Días de pedido a entrega', days_purchase_to_receipt: 'Días de compra a recepción', days_invoice_to_payment: 'Días de factura a pago',
  quotes_without_follow_up: 'Cotizaciones sin seguimiento', incomplete_records: 'Registros incompletos', idle_count: 'Productos sin venta',
  // Columnas
  family: 'Familia', product: 'Producto', sku: 'SKU', units: 'Unidades', products: 'Productos', rep: 'Vendedor', families: 'Familias', pending_follow_ups: 'Sin seguimiento',
  folio: 'Folio', customer: 'Cliente', total: 'Total', status: 'Estado', last_follow_up_at: 'Último seguimiento', stock: 'Existencia', promised_on: 'Prometido',
  rule_code: 'Regla', open: 'Abiertos', movement_type: 'Tipo', movements: 'Movimientos', quantity: 'Existencia', reorder_point: 'Punto de reorden',
  system_quantity: 'Sistema', counted_quantity: 'Contado', difference: 'Diferencia', title: 'Título', change_pct: 'Cambio %', leads: 'Leads', opportunities: 'Oportunidades', source: 'Fuente',
}

/** Nombre legible de una llave; las desconocidas se muestran sin guiones bajos. */
export const labelFor = (key: string) => LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())

const MONEY = new Set(['sales', 'avg_ticket', 'sales_shopify', 'sales_direct', 'invoiced', 'collected', 'margin', 'pipeline_value', 'receivable', 'receivable_overdue', 'total', 'sales_last_30', 'sales_previous_30'])
const RATIO = new Set(['margin_pct', 'margin_coverage', 'quote_conversion'])
const HIDDEN = new Set(['period', 'family_id', 'product_id', 'rep_id', 'issue_id', 'quote_id', 'customer_id', 'link_id'])

export const isHiddenKey = (key: string) => HIDDEN.has(key) || key.endsWith('_id')

/** Valor de un reporte listo para leerse, según el tipo de dato que guarda su llave. */
export function formatReportValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (MONEY.has(key)) return formatMoney(Number(value))
  if (RATIO.has(key)) return formatRatio(Number(value), 1)
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export type ReportSection =
  | { type: 'values'; key: string; items: { key: string; value: unknown }[] }
  | { type: 'table'; key: string; columns: string[]; rows: Record<string, unknown>[] }

/**
 * Convierte el contenido de un reporte (o la evidencia de un hallazgo) en secciones:
 * los valores sueltos y los grupos de indicadores van como listas; los arreglos, como tablas.
 */
export function reportSections(content: Record<string, unknown>): ReportSection[] {
  const sections: ReportSection[] = []
  const loose: { key: string; value: unknown }[] = []
  for (const [key, value] of Object.entries(content)) {
    if (isHiddenKey(key)) continue
    if (Array.isArray(value)) {
      const rows = value.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
      if (rows.length) sections.push({ type: 'table', key, columns: Object.keys(rows[0]).filter((column) => !isHiddenKey(column)), rows })
    } else if (typeof value === 'object' && value !== null) {
      const items = Object.entries(value).filter(([item]) => !isHiddenKey(item)).map(([item, itemValue]) => ({ key: item, value: itemValue }))
      if (items.length) sections.push({ type: 'values', key, items })
    } else {
      loose.push({ key, value })
    }
  }
  return loose.length ? [{ type: 'values', key: 'resumen', items: loose }, ...sections] : sections
}
