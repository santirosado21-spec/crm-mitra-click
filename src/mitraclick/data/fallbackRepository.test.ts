import { describe, expect, it } from 'vitest'
import type { MitraData } from '../domain'
import type { MitraRepository } from './repository'
import { MockMitraRepository } from './repository'
import { FallbackMitraRepository } from './fallbackRepository'

const demo = new MockMitraRepository({ asOf: '2026-09-22' })

const withCommercial = async (patch: Partial<MitraData['commercial']>): Promise<MitraData> => {
  const data = await demo.load()
  return { ...data, commercial: { ...data.commercial, source: 'erp', ...patch } }
}

const repo = (load: () => Promise<MitraData>): MitraRepository => ({ load })

describe('FallbackMitraRepository', () => {
  it('usa la fuente principal cuando responde con pedidos', async () => {
    const real = await withCommercial({})
    const data = await new FallbackMitraRepository(repo(async () => real), demo).load()
    expect(data.commercial.source).toBe('erp')
    expect(data.commercial.notice).toBeUndefined()
  })

  it('cae a datos simulados y explica el motivo si la fuente principal falla', async () => {
    const data = await new FallbackMitraRepository(repo(async () => { throw new Error('Inicia sesión para ver datos reales.') }), demo).load()
    expect(data.commercial.source).toBe('demo')
    expect(data.commercial.notice).toBe('Mostrando datos simulados. Inicia sesión para ver datos reales.')
  })

  it('cae a datos simulados si la fuente principal todavía no tiene pedidos, pero conserva su bitácora', async () => {
    const syncRuns = [{ id: 1, source: 'erp', entity: 'vendedores', status: 'exitoso' as const, startedAt: '2026-09-22T10:00:00Z', finishedAt: '2026-09-22T10:00:01Z', rowsReceived: 8, rowsUpserted: 8, error: null }]
    const empty = await withCommercial({ wholesaleOrders: [], retailOrders: [], syncRuns })
    const data = await new FallbackMitraRepository(repo(async () => empty), demo).load()
    expect(data.commercial.source).toBe('demo')
    expect(data.commercial.notice).toBe('Mostrando datos simulados. La base de datos todavía no tiene pedidos cargados.')
    expect(data.commercial.syncRuns).toEqual(syncRuns)
  })

  it('si también falla el respaldo, propaga el error', async () => {
    const broken = repo(async () => { throw new Error('sin red') })
    await expect(new FallbackMitraRepository(broken, broken).load()).rejects.toThrow('sin red')
  })
})
