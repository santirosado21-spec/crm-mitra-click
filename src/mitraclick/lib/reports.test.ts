import { describe, expect, it } from 'vitest'
import { formatReportValue, labelFor, reportSections } from './reports'

describe('labelFor', () => {
  it('traduce las llaves conocidas y hace legibles las demás', () => {
    expect(labelFor('receivable_overdue')).toBe('Vencido')
    expect(labelFor('algo_nuevo')).toBe('Algo nuevo')
  })
})

describe('formatReportValue', () => {
  it('da formato según el tipo de indicador', () => {
    expect(formatReportValue('sales', 12500.5)).toBe('$12,500.50')
    expect(formatReportValue('quote_conversion', 0.4)).toBe('40%')
    expect(formatReportValue('orders', 1200)).toBe('1,200')
    expect(formatReportValue('status', 'enviada')).toBe('enviada')
  })

  it('muestra una raya cuando no hay dato', () => {
    expect(formatReportValue('margin_pct', null)).toBe('—')
    expect(formatReportValue('customer', '')).toBe('—')
  })
})

describe('reportSections', () => {
  const sections = reportSections({
    period: { start: '2026-09-28', end: '2026-10-04' },
    quotes_without_follow_up: 3,
    commercial: { sales: 1000, orders: 4 },
    top_products: [{ product_id: 'x', sku: 'MC-1', product: 'Taladro', sales: 800 }],
    late_orders: [],
  })

  it('pone primero los valores sueltos y omite el periodo y los identificadores', () => {
    expect(sections[0]).toEqual({ type: 'values', key: 'resumen', items: [{ key: 'quotes_without_follow_up', value: 3 }] })
    expect(sections.map((section) => section.key)).toEqual(['resumen', 'commercial', 'top_products'])
  })

  it('convierte los grupos en listas y los arreglos en tablas sin columnas de id', () => {
    expect(sections[1]).toEqual({ type: 'values', key: 'commercial', items: [{ key: 'sales', value: 1000 }, { key: 'orders', value: 4 }] })
    expect(sections[2]).toMatchObject({ type: 'table', columns: ['sku', 'product', 'sales'] })
  })

  it('omite las tablas vacías', () => {
    expect(sections.some((section) => section.key === 'late_orders')).toBe(false)
  })
})
