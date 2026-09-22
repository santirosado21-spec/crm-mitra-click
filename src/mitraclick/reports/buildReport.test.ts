import { describe, expect, it } from 'vitest'
import { generateCommercialData } from '../data/demo/generateCommercialData'
import { buildReport, formatWhatsApp, REPORT_TYPES, WHATSAPP_MAX_CHARS, type Report } from './buildReport'

const data = generateCommercialData({ asOf: '2026-09-22', now: new Date('2026-09-22T18:00:00Z') })
const BASE = 'https://mitraclick.example'

describe('buildReport', () => {
  it('es determinista para los mismos datos', () => {
    for (const type of REPORT_TYPES) expect(buildReport(type, data)).toEqual(buildReport(type, data))
  })

  it('usa el periodo por defecto de cada plantilla y enlaza al dashboard con el mismo periodo', () => {
    const daily = buildReport('ventas-diario', data)
    expect(daily.periodKey).toBe('hoy')
    expect(daily.dashboardPath).toBe('/?periodo=hoy')

    const reps = buildReport('vendedores-semanal', data)
    expect(reps.periodKey).toBe('semana')
    expect(reps.dashboardPath).toBe('/vendedores?periodo=semana')
  })

  it('el reporte de vendedores incluye a todo el equipo en el ranking y marca a quien no vende', () => {
    const report = buildReport('vendedores-semanal', data)
    const ranking = report.sections.find((section) => section.heading === 'Ranking contra cuota')
    expect(ranking?.lines).toHaveLength(data.reps.length)
    const attention = report.sections.find((section) => section.heading === 'Tienen que vender más')
    expect(attention?.lines.some((line) => line.value.includes('días sin vender'))).toBe(true)
    expect(report.headline).toMatch(/cumplen, \d+ en riesgo, \d+ sin ventas/)
  })

  it('el reporte de material señala agotados con demanda', () => {
    const report = buildReport('productos-semanal', data)
    const stockouts = report.sections.find((section) => section.heading === 'Agotados que se siguen pidiendo')
    expect(stockouts?.lines.length).toBeGreaterThan(0)
  })
})

describe('formatWhatsApp', () => {
  it.each(REPORT_TYPES)('%s cabe en un mensaje y termina con el link al dashboard', (type) => {
    const text = formatWhatsApp(buildReport(type, data), BASE)
    expect(text.length).toBeLessThanOrEqual(WHATSAPP_MAX_CHARS)
    expect(text.startsWith('*')).toBe(true)
    expect(text.trimEnd().endsWith(buildReport(type, data).dashboardPath)).toBe(true)
    expect(text).toContain('(datos simulados)')
  })

  it('recorta listas largas y avisa que el detalle está en el dashboard', () => {
    const report: Report = {
      ...buildReport('vendedores-semanal', data),
      sections: [{ heading: 'Lista larga', lines: Array.from({ length: 80 }, (_, index) => ({ label: `Elemento ${index}`, value: '$1,000' })) }],
    }
    const text = formatWhatsApp(report, BASE, 600)
    expect(text.length).toBeLessThanOrEqual(600)
    expect(text).toContain('Lista recortada')
    expect(text).toContain(`${BASE}/vendedores?periodo=semana`)
  })

  it('muestra el texto de sección vacía en lugar de omitirla', () => {
    const report: Report = { ...buildReport('alertas-dia', data), sections: [{ heading: 'Agotados con demanda', lines: [], empty: 'Sin agotados con demanda.' }] }
    expect(formatWhatsApp(report, BASE)).toContain('*Agotados con demanda*\n• Sin agotados con demanda.')
  })
})
