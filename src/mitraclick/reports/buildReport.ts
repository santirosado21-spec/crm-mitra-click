// Reportes deterministas para dirección. Se construyen sólo con selectores puros:
// el mismo `CommercialData` produce siempre el mismo reporte. Los agentes de
// Grok Bot abren la vista del reporte, copian el texto de WhatsApp y lo envían;
// la plataforma no envía mensajes.

import type { CommercialData, PeriodKey } from '../domain'
import { BUSINESS_UNIT_LABEL } from '../domain'
import { resolvePeriod } from '../commercial/period'
import { withSearch } from '../commercial/links'
import {
  DAYS_WITHOUT_SALE_ALERT,
  getBusinessUnitSummary,
  getClientActivity,
  getGoalProgress,
  getProductHighlights,
  getProductPerformance,
  getRepLeaderboard,
  getRepsNeedingAttention,
  getSlowMovers,
  getStockoutsWithDemand,
  type RepPerformance,
} from '../commercial/selectors'
import { formatDayLabel } from '../commercial/dates'
import { formatCurrency, formatRatio } from '../utils'

export const REPORT_TYPES = ['ventas-diario', 'vendedores-semanal', 'productos-semanal', 'alertas-dia'] as const
export type ReportType = (typeof REPORT_TYPES)[number]

export const isReportType = (value: string | undefined): value is ReportType =>
  REPORT_TYPES.includes(value as ReportType)

export type AgentProfile = 'ejecutivo' | 'vendedores' | 'productos'

export interface ReportDefinition {
  title: string
  description: string
  defaultPeriod: PeriodKey
  /** Cuándo se sugiere que el agente lo envíe. */
  cadence: string
  /** Perfil de agente de Grok Bot responsable. */
  agent: AgentProfile
  /** Pantalla del dashboard con el detalle completo. */
  dashboardPath: string
}

export const REPORT_DEFINITIONS: Record<ReportType, ReportDefinition> = {
  'ventas-diario': {
    title: 'Ventas del día',
    description: 'Venta de hoy de Mitra mayorista y Mitra Click, avance del mes contra meta, mejores vendedores y material del día.',
    defaultPeriod: 'hoy',
    cadence: 'Todos los días, 19:00',
    agent: 'ejecutivo',
    dashboardPath: '/',
  },
  'vendedores-semanal': {
    title: 'Vendedores de la semana',
    description: 'Ranking contra cuota, quién cumple, quién va en riesgo y quién no ha vendido.',
    defaultPeriod: 'semana',
    cadence: 'Lunes, 8:00',
    agent: 'vendedores',
    dashboardPath: '/vendedores',
  },
  'productos-semanal': {
    title: 'Material de la semana',
    description: 'Qué se vendió más, qué cae, qué se agotó con demanda y qué no se mueve.',
    defaultPeriod: 'semana',
    cadence: 'Lunes, 8:30',
    agent: 'productos',
    dashboardPath: '/productos',
  },
  'alertas-dia': {
    title: 'Alertas del día',
    description: 'Vendedores sin vender, agotados con demanda, clientes sin compra y metas fuera de ritmo.',
    defaultPeriod: 'mes',
    cadence: 'Todos los días, 8:00',
    agent: 'ejecutivo',
    dashboardPath: '/',
  },
}

export type Tone = 'good' | 'bad' | 'warn' | 'neutral'

export interface ReportLine {
  label: string
  value: string
  detail?: string
  tone?: Tone
}

export interface ReportSection {
  heading: string
  lines: ReportLine[]
  /** Texto cuando la sección no tiene líneas. */
  empty?: string
}

export interface Report {
  type: ReportType
  title: string
  periodKey: PeriodKey
  periodLabel: string
  asOf: string
  asOfLabel: string
  source: CommercialData['source']
  headline: string
  kpis: ReportLine[]
  sections: ReportSection[]
  /** Ruta relativa al dashboard con los mismos filtros. */
  dashboardPath: string
}

const signed = (value: number | null) => (value === null ? 'sin base' : `${value >= 0 ? '+' : '−'}${Math.abs(value)}%`)
const toneOf = (value: number | null): Tone => (value === null ? 'neutral' : value >= 0 ? 'good' : 'bad')
const STATUS_TEXT = { cumple: 'Cumple', riesgo: 'En riesgo', 'sin-ventas': 'Sin ventas' } as const
const statusTone = (row: RepPerformance): Tone => (row.status === 'cumple' ? 'good' : row.status === 'riesgo' ? 'warn' : 'bad')
const firstName = (name: string) => name.split(' ').slice(0, 2).join(' ')
const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`

export function buildReport(type: ReportType, data: CommercialData, periodKey?: PeriodKey): Report {
  const definition = REPORT_DEFINITIONS[type]
  const key = periodKey ?? definition.defaultPeriod
  const period = resolvePeriod(key, data.asOf)
  const base = {
    type,
    title: definition.title,
    periodKey: key,
    periodLabel: period.label,
    asOf: data.asOf,
    asOfLabel: formatDayLabel(data.asOf, { weekday: 'long', day: 'numeric', month: 'long' }),
    source: data.source,
    dashboardPath: withSearch(definition.dashboardPath, { periodo: key === definition.defaultPeriod && key === 'mes' ? undefined : key }),
  }

  switch (type) {
    case 'ventas-diario': {
      const summary = getBusinessUnitSummary(data, period)
      const goals = getGoalProgress(data)
      const reps = getRepLeaderboard(data, period).filter((row) => row.sales > 0).slice(0, 3)
      const products = getProductHighlights(getProductPerformance(data, period), 3).top
      return {
        ...base,
        headline: `Venta ${key === 'hoy' ? 'de hoy' : 'del periodo'}: ${formatCurrency(summary.total.sales)} (${signed(summary.total.deltaPct)} ${period.comparisonLabel}).`,
        kpis: [
          { label: BUSINESS_UNIT_LABEL.mitra, value: formatCurrency(summary.mitra.sales, true), detail: `${plural(summary.mitra.orders, 'pedido')}, ${signed(summary.mitra.deltaPct)}`, tone: toneOf(summary.mitra.deltaPct) },
          { label: BUSINESS_UNIT_LABEL.mitraclick, value: formatCurrency(summary.mitraclick.sales, true), detail: `${plural(summary.mitraclick.orders, 'orden', 'órdenes')}, ${signed(summary.mitraclick.deltaPct)}`, tone: toneOf(summary.mitraclick.deltaPct) },
        ],
        sections: [
          {
            heading: 'Avance del mes contra meta',
            lines: (['mitra', 'mitraclick'] as const).map((unit) => ({
              label: BUSINESS_UNIT_LABEL[unit],
              value: `${formatCurrency(goals[unit].monthToDate, true)} de ${formatCurrency(goals[unit].goal, true)}`,
              detail: goals[unit].pace >= 1 ? 'En ritmo' : `Al ${formatRatio(goals[unit].pace)} del ritmo`,
              tone: goals[unit].pace >= 1 ? 'good' : goals[unit].pace >= 0.9 ? 'warn' : 'bad',
            })),
          },
          { heading: 'Vendedores que más vendieron', lines: reps.map((row) => ({ label: firstName(row.name), value: formatCurrency(row.sales, true), detail: plural(row.orders, 'pedido') })), empty: 'Ningún vendedor registró ventas.' },
          { heading: 'Material más vendido', lines: products.map((row) => ({ label: row.product.name, value: formatCurrency(row.revenue, true) })), empty: 'Sin ventas de material.' },
        ],
      }
    }
    case 'vendedores-semanal': {
      const rows = getRepLeaderboard(data, period)
      const attention = getRepsNeedingAttention(rows)
      const sales = rows.reduce((sum, row) => sum + row.sales, 0)
      const quota = rows.reduce((sum, row) => sum + row.quota, 0)
      const count = (status: RepPerformance['status']) => rows.filter((row) => row.status === status).length
      return {
        ...base,
        headline: `Equipo al ${formatRatio(quota ? sales / quota : 0)} de su cuota: ${count('cumple')} cumplen, ${count('riesgo')} en riesgo, ${count('sin-ventas')} sin ventas.`,
        kpis: [
          { label: 'Venta del equipo', value: formatCurrency(sales, true), detail: `Cuota ${formatCurrency(quota, true)}` },
          { label: 'Cumplen cuota', value: `${count('cumple')} de ${rows.length}`, tone: count('cumple') === rows.length ? 'good' : 'neutral' },
        ],
        sections: [
          { heading: 'Ranking contra cuota', lines: rows.map((row, index) => ({ label: `${index + 1}. ${firstName(row.name)}`, value: formatCurrency(row.sales, true), detail: `${formatRatio(row.attainment)}, ${STATUS_TEXT[row.status]}`, tone: statusTone(row) })) },
          {
            heading: 'Tienen que vender más',
            lines: attention.map((row) => ({
              label: firstName(row.name),
              value: row.status === 'sin-ventas' ? `${row.daysSinceLastSale ?? '—'} días sin vender` : `Faltan ${formatCurrency(row.gapToQuota, true)}`,
              detail: row.status === 'sin-ventas' ? 'Sin ventas en el periodo' : `${formatRatio(row.attainment)} de cuota${(row.daysSinceLastSale ?? 0) >= DAYS_WITHOUT_SALE_ALERT ? `, ${row.daysSinceLastSale} días sin vender` : ''}`,
              tone: statusTone(row),
            })),
            empty: 'Todo el equipo va en cuota.',
          },
        ],
      }
    }
    case 'productos-semanal': {
      const rows = getProductPerformance(data, period)
      const highlights = getProductHighlights(rows, 5)
      const stockouts = getStockoutsWithDemand(data, 30)
      const slow = getSlowMovers(data, 30)
      const leader = highlights.top[0]
      return {
        ...base,
        headline: leader ? `Material líder: ${leader.product.name} con ${formatCurrency(leader.revenue, true)}. ${plural(stockouts.length, 'producto agotado', 'productos agotados')} con demanda.` : 'Sin ventas de material en el periodo.',
        kpis: [
          { label: 'Venta de material', value: formatCurrency(rows.reduce((sum, row) => sum + row.revenue, 0), true) },
          { label: 'Agotados con demanda', value: String(stockouts.length), tone: stockouts.length ? 'bad' : 'good' },
        ],
        sections: [
          { heading: 'Lo que más se vende', lines: highlights.top.map((row) => ({ label: row.product.name, value: formatCurrency(row.revenue, true), detail: signed(row.deltaPct), tone: toneOf(row.deltaPct) })), empty: 'Sin ventas.' },
          { heading: 'Lo que cae', lines: highlights.falling.map((row) => ({ label: row.product.name, value: signed(row.deltaPct), detail: formatCurrency(row.revenue, true), tone: 'bad' })), empty: 'Ningún producto cae contra el periodo anterior.' },
          { heading: 'Agotados que se siguen pidiendo', lines: stockouts.slice(0, 5).map((row) => ({ label: row.product.name, value: `${row.unitsInWindow} ${row.product.unit}s en 30 días`, tone: 'bad' })), empty: 'Sin agotados con demanda.' },
          { heading: 'Sin movimiento en 30+ días', lines: slow.slice(0, 3).map((row) => ({ label: row.product.name, value: `${formatCurrency(row.stockValue, true)} detenidos`, detail: row.daysSinceLastSale === null ? 'Sin ventas en 90 días' : `${row.daysSinceLastSale} días`, tone: 'warn' })), empty: 'Todo el inventario se está moviendo.' },
        ],
      }
    }
    case 'alertas-dia': {
      const rows = getRepLeaderboard(data, period)
      const idle = rows.filter((row) => (row.daysSinceLastSale ?? Infinity) >= DAYS_WITHOUT_SALE_ALERT)
      const stockouts = getStockoutsWithDemand(data, 30)
      const staleClients = getClientActivity(data, period).filter((client) => (client.daysSincePurchase ?? Infinity) > 30)
      const goals = getGoalProgress(data)
      const offPace = (['mitra', 'mitraclick'] as const).filter((unit) => goals[unit].pace < 0.9)
      const total = idle.length + stockouts.length + staleClients.length + offPace.length
      const repName = new Map(data.reps.map((rep) => [rep.id, firstName(rep.name)]))
      return {
        ...base,
        headline: total ? `${total} alertas para revisar hoy.` : 'Sin alertas hoy.',
        kpis: [
          { label: 'Vendedores sin vender', value: String(idle.length), tone: idle.length ? 'bad' : 'good' },
          { label: 'Agotados con demanda', value: String(stockouts.length), tone: stockouts.length ? 'bad' : 'good' },
        ],
        sections: [
          { heading: `Vendedores con ${DAYS_WITHOUT_SALE_ALERT}+ días sin vender`, lines: idle.map((row) => ({ label: firstName(row.name), value: row.daysSinceLastSale === null ? 'Sin ventas registradas' : `${row.daysSinceLastSale} días`, tone: 'bad' })), empty: 'Todos vendieron en la última semana.' },
          { heading: 'Metas fuera de ritmo', lines: offPace.map((unit) => ({ label: BUSINESS_UNIT_LABEL[unit], value: `Al ${formatRatio(goals[unit].pace)} del ritmo`, detail: `Proyección ${formatCurrency(goals[unit].projected, true)} de ${formatCurrency(goals[unit].goal, true)}`, tone: 'warn' })), empty: 'Ambos negocios van en ritmo de meta (90 % o más).' },
          { heading: 'Agotados con demanda', lines: stockouts.slice(0, 5).map((row) => ({ label: row.product.name, value: `${row.unitsInWindow} ${row.product.unit}s en 30 días`, tone: 'bad' })), empty: 'Sin agotados con demanda.' },
          { heading: 'Clientes sin comprar en 30+ días', lines: staleClients.slice(0, 5).map((client) => ({ label: client.name, value: client.daysSincePurchase === null ? 'Sin compras' : `${client.daysSincePurchase} días`, detail: `Vendedor: ${repName.get(client.repId) ?? '—'}`, tone: 'warn' })), empty: 'Todos los clientes compraron en el último mes.' },
        ],
      }
    }
  }
}

// ── Texto para WhatsApp ─────────────────────────────────────────────────────

export const WHATSAPP_MAX_CHARS = 1000

const lineText = (line: ReportLine) => `• ${line.label}: ${line.value}${line.detail ? ` (${line.detail})` : ''}`

/**
 * Convierte un reporte en un mensaje de WhatsApp (negritas con *asteriscos*).
 * Si excede `maxChars`, recorta líneas desde el final de cada sección y lo indica,
 * pero siempre conserva encabezado, titular y link al dashboard.
 */
export function formatWhatsApp(report: Report, baseUrl: string, maxChars = WHATSAPP_MAX_CHARS): string {
  const when = report.periodKey === 'hoy' ? report.periodLabel : `${report.periodLabel}. Datos al ${report.asOfLabel}`
  const header = [`*${report.title}, Mitra*`, `_${when}_${report.source === 'demo' ? ' _(datos simulados)_' : ''}`, '', report.headline]
  const kpis = report.kpis.map(lineText)
  const link = `Detalle: ${baseUrl.replace(/\/$/, '')}${report.dashboardPath}`
  const sectionLines = report.sections.map((section) => ({ heading: `*${section.heading}*`, lines: section.lines.map(lineText), empty: section.empty }))

  const render = (limit: number) => {
    const blocks = [header.join('\n'), kpis.join('\n')]
    let truncated = false
    for (const section of sectionLines) {
      const visible = section.lines.slice(0, limit)
      if (visible.length < section.lines.length) truncated = true
      const body = visible.length ? visible.join('\n') : section.empty ? `• ${section.empty}` : ''
      blocks.push([section.heading, body].filter(Boolean).join('\n'))
    }
    if (truncated) blocks.push('_Lista recortada; el detalle completo está en el dashboard._')
    blocks.push(link)
    return blocks.join('\n\n')
  }

  const longest = Math.max(1, ...sectionLines.map((section) => section.lines.length))
  for (let limit = longest; limit >= 1; limit -= 1) {
    const text = render(limit)
    if (text.length <= maxChars) return text
  }
  return render(1).slice(0, maxChars - link.length - 2).trimEnd() + '\n\n' + link
}
