import type { MitraData } from '../domain'
import type { MitraRepository } from './repository'

/**
 * Intenta la fuente principal (Supabase) y, si falla o todavía no tiene pedidos,
 * muestra los datos simulados con un aviso que explica el motivo. Así la app nunca
 * queda en blanco: sin sesión, sin permisos, sin datos o sin red.
 */
export class FallbackMitraRepository implements MitraRepository {
  private readonly primary: MitraRepository
  private readonly fallback: MitraRepository

  constructor(primary: MitraRepository, fallback: MitraRepository) {
    this.primary = primary
    this.fallback = fallback
  }

  async load(): Promise<MitraData> {
    let reason: string
    let syncRuns: MitraData['commercial']['syncRuns']
    try {
      const data = await this.primary.load()
      if (data.commercial.wholesaleOrders.length || data.commercial.retailOrders.length) return data
      reason = 'La base de datos todavía no tiene pedidos cargados.'
      syncRuns = data.commercial.syncRuns
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error)
    }

    const demo = await this.fallback.load()
    return {
      ...demo,
      commercial: {
        ...demo.commercial,
        notice: `Mostrando datos simulados. ${reason}`,
        ...(syncRuns ? { syncRuns } : {}),
      },
    }
  }
}
