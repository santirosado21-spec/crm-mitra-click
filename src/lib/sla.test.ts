import { describe, it, expect } from 'vitest'
import { evaluateSLA, slaPct } from './sla'

// ─────────────────────────────────────────────────────────────────────────────
// Tests de las reglas de SLA de entrega. Cuando fallen, los KPIs del dashboard
// Delivery Performance dejan de reflejar el cumplimiento real.
// ─────────────────────────────────────────────────────────────────────────────

describe('evaluateSLA — entrega', () => {
  it('marca onTime cuando la entrega real es <= la prometida', () => {
    const r = evaluateSLA({ promised_delivery_date: '2026-05-10', actual_delivery_date: '2026-05-09' })
    expect(r.hasDelivery).toBe(true)
    expect(r.onTime).toBe(true)
    expect(r.delayed).toBe(false)
  })

  it('marca onTime cuando entrega real == prometida (mismo día)', () => {
    const r = evaluateSLA({ promised_delivery_date: '2026-05-10', actual_delivery_date: '2026-05-10' })
    expect(r.onTime).toBe(true)
    expect(r.delayed).toBe(false)
  })

  it('marca delayed cuando la entrega real supera la prometida', () => {
    const r = evaluateSLA({ promised_delivery_date: '2026-05-10', actual_delivery_date: '2026-05-12' })
    expect(r.onTime).toBe(false)
    expect(r.delayed).toBe(true)
  })

  it('no evalúa entrega si falta la fecha real', () => {
    const r = evaluateSLA({ promised_delivery_date: '2026-05-10', actual_delivery_date: null })
    expect(r.hasDelivery).toBe(false)
    expect(r.onTime).toBe(false)
    expect(r.delayed).toBe(false)
  })
})

describe('evaluateSLA — inducción', () => {
  it('marca onTimeInduction si la inducción es dentro de 1 día del alta', () => {
    const r = evaluateSLA({ created_at: '2026-05-01T08:00:00Z', induction_date: '2026-05-02' })
    expect(r.hasInduction).toBe(true)
    expect(r.onTimeInduction).toBe(true)
  })

  it('marca inducción tardía si pasa más de 1 día', () => {
    const r = evaluateSLA({ created_at: '2026-05-01T08:00:00Z', induction_date: '2026-05-05' })
    expect(r.hasInduction).toBe(true)
    expect(r.onTimeInduction).toBe(false)
  })
})

describe('evaluateSLA — estados de tracking', () => {
  it('detecta devuelto', () => {
    expect(evaluateSLA({ tracking_status: 'devuelto' }).returned).toBe(true)
  })
  it('detecta en tránsito', () => {
    expect(evaluateSLA({ tracking_status: 'en_transito' }).inTransit).toBe(true)
  })
  it('detecta excepción', () => {
    expect(evaluateSLA({ tracking_status: 'excepcion' }).exception).toBe(true)
  })
})

describe('slaPct', () => {
  it('calcula el porcentaje entero', () => {
    expect(slaPct(8, 10)).toBe(80)
    expect(slaPct(1, 3)).toBe(33)
  })
  it('devuelve 0 cuando el denominador es 0', () => {
    expect(slaPct(5, 0)).toBe(0)
  })
})
