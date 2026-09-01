import type { MitraData } from '../domain'
import { mockMitraData } from './mockData'

export interface MitraRepository {
  load(): Promise<MitraData>
}

/**
 * Único adaptador activo durante la fase API-free. Un conector real deberá
 * implementar el mismo contrato y normalizar sus respuestas antes de llegar a la UI.
 */
export class MockMitraRepository implements MitraRepository {
  async load(): Promise<MitraData> {
    return structuredClone(mockMitraData)
  }
}

export const mitraRepository: MitraRepository = new MockMitraRepository()
