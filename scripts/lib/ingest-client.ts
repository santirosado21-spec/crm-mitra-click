// Cliente de carga para scripts locales (Node). Envía filas a la Edge Function `ingest`
// en bloques, con reintentos ante fallas de red o del servidor.
//
// Variables (en .env.local, que no se versiona):
//   MITRA_INGEST_KEY   Llave secreta (sb_secret_…) o el valor de INGEST_API_KEY.  Obligatoria.
//   MITRA_INGEST_URL   URL de la función. Por defecto: <VITE_SUPABASE_URL>/functions/v1/ingest
//   VITE_SUPABASE_URL  URL del proyecto (se reutiliza la de la app).

export interface IngestSummary {
  estado: 'exitoso' | 'parcial' | 'fallido'
  entidad: string
  recibidas: number
  procesadas: number
  con_error: number
  errores: { fila: number; id?: string; error: string }[]
}

export interface IngestConfig {
  url: string
  key: string
}

const BLOCK = 5_000
const RETRIES = 3

export function loadConfig(env: NodeJS.ProcessEnv = process.env): IngestConfig {
  const key = env.MITRA_INGEST_KEY?.trim()
  if (!key) throw new Error('Falta MITRA_INGEST_KEY en .env.local (llave secreta sb_secret_… o INGEST_API_KEY).')
  const base = env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const url = env.MITRA_INGEST_URL?.trim() || (base ? `${base}/functions/v1/ingest` : '')
  if (!url) throw new Error('Falta MITRA_INGEST_URL o VITE_SUPABASE_URL en .env.local.')
  return { url, key }
}

/** Las llaves secretas de Supabase van en `apikey`; la llave propia de ingest, en `x-ingest-key`. */
export function authHeaders(key: string): Record<string, string> {
  const isSupabaseKey = key.startsWith('sb_secret_') || key.split('.').length === 3
  return isSupabaseKey ? { apikey: key } : { 'x-ingest-key': key }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function postBlock(config: IngestConfig, body: unknown): Promise<IngestSummary> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(config.key) },
        body: JSON.stringify(body),
      })
      const payload = (await response.json().catch(() => ({}))) as IngestSummary & { error?: string }
      // 4xx (salvo 429) son errores de datos o de llave: reintentar no ayuda.
      if (response.status >= 400 && response.status < 500 && response.status !== 422 && response.status !== 429) {
        throw Object.assign(new Error(payload.error ?? `HTTP ${response.status}`), { fatal: true })
      }
      if (response.status >= 500 || response.status === 429) throw new Error(payload.error ?? `HTTP ${response.status}`)
      return payload
    } catch (error) {
      if ((error as { fatal?: boolean }).fatal) throw error
      lastError = error
      if (attempt < RETRIES) await wait(1_000 * 2 ** (attempt - 1))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/** Envía todas las filas de una entidad en bloques y acumula el resultado. */
export async function ingest(config: IngestConfig, fuente: string, entidad: string, filas: unknown[], origen = 'script'): Promise<IngestSummary> {
  const total: IngestSummary = { estado: 'exitoso', entidad, recibidas: filas.length, procesadas: 0, con_error: 0, errores: [] }
  for (let start = 0; start < filas.length; start += BLOCK) {
    const result = await postBlock(config, { fuente, entidad, filas: filas.slice(start, start + BLOCK), origen })
    total.procesadas += result.procesadas ?? 0
    total.con_error += result.con_error ?? 0
    total.errores.push(...(result.errores ?? []).map((item) => ({ ...item, fila: item.fila + start })))
  }
  total.estado = total.con_error === 0 ? 'exitoso' : total.procesadas === 0 ? 'fallido' : 'parcial'
  return total
}

export function printSummary(summary: IngestSummary) {
  const mark = summary.estado === 'exitoso' ? 'OK ' : summary.estado === 'parcial' ? '!! ' : 'XX '
  console.log(`${mark} ${summary.entidad.padEnd(14)} ${summary.procesadas}/${summary.recibidas} filas${summary.con_error ? `, ${summary.con_error} con error` : ''}`)
  for (const item of summary.errores.slice(0, 10)) console.log(`     fila ${item.fila}${item.id ? ` (${item.id})` : ''}: ${item.error}`)
  if (summary.errores.length > 10) console.log(`     … y ${summary.errores.length - 10} errores más`)
}
