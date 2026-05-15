import { describe, it, expect } from 'vitest'
import { applyMarkupToRate, type MarkupContext } from './markup'
import type { MarkupProfile, MarkupProfileRule } from '../../types/techship'

// ─────────────────────────────────────────────────────────────────────────────
// Tests del motor de markup. Cuando estos fallen, el precio que ve el cliente
// deja de coincidir con la matriz configurada por el admin.
// ─────────────────────────────────────────────────────────────────────────────

function profile(over: Partial<MarkupProfile> = {}): MarkupProfile {
  return {
    id: 'p1', nombre: 'Default', descripcion: '', activo: true, prioridad: 100,
    created_at: '', updated_at: '', ...over,
  }
}

function rule(over: Partial<MarkupProfileRule> = {}): MarkupProfileRule {
  return {
    id: 'r1', profile_id: 'p1', cliente_id: null, carrier: null, service: null,
    markup_pct: 0, min_markup: null, max_markup: null, prioridad: 100,
    created_at: '', ...over,
  }
}

const target = { clienteId: 'c1', carrier: 'fedex', service: 'EXPRESS' }

describe('applyMarkupToRate', () => {
  it('devuelve el precio sin cambios cuando no hay reglas', () => {
    const ctx: MarkupContext = { profiles: [], rules: [] }
    const r = applyMarkupToRate(100, target, ctx)
    expect(r.final_price).toBe(100)
    expect(r.markup_amount).toBe(0)
    expect(r.rule_id).toBeNull()
  })

  it('aplica un markup porcentual simple', () => {
    const ctx: MarkupContext = { profiles: [profile()], rules: [rule({ markup_pct: 20 })] }
    const r = applyMarkupToRate(100, target, ctx)
    expect(r.final_price).toBe(120)
    expect(r.markup_amount).toBe(20)
    expect(r.markup_pct).toBe(20)
  })

  it('respeta el cap mínimo (min_markup)', () => {
    const ctx: MarkupContext = { profiles: [profile()], rules: [rule({ markup_pct: 5, min_markup: 50 })] }
    // 5% de 100 = 5, pero el mínimo es 50.
    const r = applyMarkupToRate(100, target, ctx)
    expect(r.markup_amount).toBe(50)
    expect(r.final_price).toBe(150)
  })

  it('respeta el cap máximo (max_markup)', () => {
    const ctx: MarkupContext = { profiles: [profile()], rules: [rule({ markup_pct: 80, max_markup: 30 })] }
    // 80% de 100 = 80, pero el máximo es 30.
    const r = applyMarkupToRate(100, target, ctx)
    expect(r.markup_amount).toBe(30)
    expect(r.final_price).toBe(130)
  })

  it('ignora perfiles inactivos', () => {
    const ctx: MarkupContext = {
      profiles: [profile({ activo: false })],
      rules: [rule({ markup_pct: 50 })],
    }
    const r = applyMarkupToRate(100, target, ctx)
    expect(r.final_price).toBe(100)
  })

  it('no aplica una regla cuyo cliente no coincide', () => {
    const ctx: MarkupContext = {
      profiles: [profile()],
      rules: [rule({ cliente_id: 'OTRO', markup_pct: 50 })],
    }
    const r = applyMarkupToRate(100, target, ctx)
    expect(r.final_price).toBe(100)
  })

  it('aplica una regla comodín (todos los campos NULL)', () => {
    const ctx: MarkupContext = { profiles: [profile()], rules: [rule({ markup_pct: 10 })] }
    const r = applyMarkupToRate(200, { clienteId: 'x', carrier: 'dhl', service: 'GROUND' }, ctx)
    expect(r.final_price).toBe(220)
  })

  it('prefiere el perfil de mayor prioridad (menor número)', () => {
    const ctx: MarkupContext = {
      profiles: [
        profile({ id: 'baja', nombre: 'Baja', prioridad: 200 }),
        profile({ id: 'alta', nombre: 'Alta', prioridad: 1 }),
      ],
      rules: [
        rule({ id: 'rb', profile_id: 'baja', markup_pct: 99 }),
        rule({ id: 'ra', profile_id: 'alta', markup_pct: 10 }),
      ],
    }
    const r = applyMarkupToRate(100, target, ctx)
    expect(r.profile_name).toBe('Alta')
    expect(r.final_price).toBe(110)
  })

  it('ante igual prioridad, gana la regla más específica', () => {
    const ctx: MarkupContext = {
      profiles: [profile()],
      rules: [
        rule({ id: 'generica', markup_pct: 5 }),
        rule({ id: 'especifica', cliente_id: 'c1', carrier: 'fedex', service: 'EXPRESS', markup_pct: 40 }),
      ],
    }
    const r = applyMarkupToRate(100, target, ctx)
    expect(r.rule_id).toBe('especifica')
    expect(r.final_price).toBe(140)
  })
})
