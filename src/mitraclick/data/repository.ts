import type { MitraData } from '../domain'
import { localTodayKey } from '../commercial/dates'
import { generateCommercialData } from './demo/generateCommercialData'
import { mockMitraData } from './mockData'

export interface MitraRepository {
  load(): Promise<MitraData>
}

/**
 * Único adaptador activo durante la fase sin integraciones. Los datos comerciales
 * se generan de forma determinista hasta `asOf` (por defecto, hoy) para que los
 * reportes diarios siempre tengan un "hoy". Un conector real deberá implementar
 * el mismo contrato y normalizar sus respuestas antes de llegar a la UI.
 */
export class MockMitraRepository implements MitraRepository {
  private readonly asOf?: string

  constructor(options: { asOf?: string } = {}) {
    this.asOf = options.asOf
  }

  async load(): Promise<MitraData> {
    const crm = structuredClone(mockMitraData)
    return { ...crm, commercial: generateCommercialData({ asOf: this.asOf ?? localTodayKey() }) }
  }
}

export const mitraRepository: MitraRepository = new MockMitraRepository()
