import type { MitraRepository } from './repository'
import type { MitraData } from '../domain'

/**
 * Punto de entrada para el ERP / sistema interno de Mitra. TODAVÍA NO CONECTADO.
 *
 * Cuando exista acceso, este adaptador deberá correr del lado servidor (nunca con
 * credenciales en el navegador), leer la fuente del ERP y normalizarla a
 * `CommercialData`. El contrato de campos requerido está en
 * `docs/ERP_DATA_CONTRACT.md`.
 */
export class ErpMitraRepository implements MitraRepository {
  async load(): Promise<MitraData> {
    throw new Error('Integración pendiente: el conector del ERP de Mitra aún no está configurado.')
  }
}
