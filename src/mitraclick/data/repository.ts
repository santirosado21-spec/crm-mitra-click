import type { MitraData } from '../domain'
import { localTodayKey } from '../commercial/dates'
import { generateCommercialData } from './demo/generateCommercialData'
import { mockMitraData } from './mockData'
import { SupabaseMitraRepository } from './supabase/repository'

export interface MitraRepository {
  load(): Promise<MitraData>
}

/**
 * Adaptador demo (activo por defecto). Los datos comerciales
 * se generan de forma determinista hasta `asOf` (por defecto, hoy) para que los
 * dashboards siempre tengan un "hoy". Un conector real deberá implementar
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

/**
 * Fuente de datos de la app. `VITE_DATA_SOURCE=supabase` lee de Supabase (requiere
 * sesión de un usuario autorizado); cualquier otro valor usa datos simulados.
 */
export const mitraRepository: MitraRepository =
  import.meta.env.VITE_DATA_SOURCE === 'supabase' ? new SupabaseMitraRepository() : new MockMitraRepository()
