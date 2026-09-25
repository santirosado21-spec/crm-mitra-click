// Edge Function `ingest`: URL única para cargar datos de Mitra a Supabase.
//
//   POST https://<proyecto>.supabase.co/functions/v1/ingest
//
// Autenticación (verify_jwt = false; se valida aquí):
//   · Header `x-ingest-key: <INGEST_API_KEY>` para terceros (ERP, n8n, proveedor).
//     INGEST_API_KEY es un secreto de Edge Functions; si no existe, este modo se apaga.
//   · Header `apikey: <secret key sb_secret_…>` para scripts internos.
//
// Formatos:
//   · JSON: { "fuente": "erp", "entidad": "pedidos", "filas": [ … ], "origen": "n8n" }
//   · CSV:  Content-Type text/csv y ?fuente=erp&entidad=productos (encabezados en la 1.ª fila).
//
// Cada lote se envía a public.ingest_batch (idempotente, fila por fila, con bitácora).
// Las entidades y campos están en docs/DATABASE.md y docs/ERP_DATA_CONTRACT.md.

import { createClient } from 'npm:@supabase/supabase-js@2.117.1'
import { parseCsv } from './csv.ts'

const SOURCES = ['erp', 'shopify', 'ga4', 'manual', 'demo'] as const
const ENTITIES = ['vendedores', 'cuotas', 'metas', 'productos', 'existencias', 'clientes', 'pedidos', 'lineas_pedido', 'ordenes', 'lineas_orden', 'cotizaciones', 'trafico']
const MAX_ROWS = 20_000
const CHUNK = 1_000

type Source = (typeof SOURCES)[number]

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

/** Comparación de tiempo constante para no filtrar llaves por tiempos de respuesta. */
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return diff === 0
}

function secretKeys(): string[] {
  const keys: string[] = []
  try {
    keys.push(...(Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')) as string[]))
  } catch {
    // Sin llaves nuevas configuradas.
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) keys.push(legacy)
  return keys.filter(Boolean)
}

function isAuthorized(req: Request): boolean {
  const ingestKey = Deno.env.get('INGEST_API_KEY')
  const provided = req.headers.get('x-ingest-key')
  if (ingestKey && ingestKey.length >= 24 && provided && safeEqual(provided, ingestKey)) return true
  const apikey = req.headers.get('apikey')
  return Boolean(apikey && secretKeys().some((key) => safeEqual(apikey, key)))
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = secretKeys()[0]
  if (!url || !key) throw new Error('La función no tiene SUPABASE_URL o llave secreta configurada.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

interface Payload {
  source: Source
  entity: string
  rows: unknown[]
  origin: string
}

async function readPayload(req: Request): Promise<Payload | string> {
  const params = new URL(req.url).searchParams
  const contentType = req.headers.get('content-type') ?? ''
  let source = params.get('fuente') ?? params.get('source') ?? ''
  let entity = params.get('entidad') ?? params.get('entity') ?? ''
  let origin = params.get('origen') ?? 'api'
  let rows: unknown

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    rows = parseCsv(await req.text())
  } else {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return 'El cuerpo no es JSON válido. Usa JSON o envía CSV con Content-Type: text/csv.'
    }
    if (Array.isArray(body)) rows = body
    else if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>
      source = String(record.fuente ?? record.source ?? source)
      entity = String(record.entidad ?? record.entity ?? entity)
      origin = String(record.origen ?? record.origin ?? origin)
      rows = record.filas ?? record.rows
    }
  }

  source = source.trim().toLowerCase()
  entity = entity.trim().toLowerCase()
  if (!SOURCES.includes(source as Source)) return `Fuente inválida "${source}". Usa: ${SOURCES.join(', ')}.`
  if (!ENTITIES.includes(entity)) return `Entidad inválida "${entity}". Usa: ${ENTITIES.join(', ')}.`
  if (!Array.isArray(rows)) return 'Faltan las filas: envía "filas" como arreglo JSON o un CSV.'
  if (rows.length > MAX_ROWS) return `Máximo ${MAX_ROWS} filas por envío; recibidas ${rows.length}. Divide el archivo.`
  return { source: source as Source, entity, rows, origin: origin.slice(0, 80) }
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return json(200, { ok: true, servicio: 'ingest', fuentes: SOURCES, entidades: ENTITIES, max_filas: MAX_ROWS })
  }
  if (req.method !== 'POST') return json(405, { error: 'Usa POST.' })
  if (!isAuthorized(req)) return json(401, { error: 'No autorizado: envía x-ingest-key o apikey con una llave secreta.' })

  const payload = await readPayload(req)
  if (typeof payload === 'string') return json(400, { error: payload })

  const supabase = adminClient()
  const summary = { fuente: payload.source, entidad: payload.entity, recibidas: payload.rows.length, procesadas: 0, con_error: 0, corridas: [] as number[], errores: [] as unknown[] }

  for (let start = 0; start < payload.rows.length; start += CHUNK) {
    const chunk = payload.rows.slice(start, start + CHUNK)
    const { data, error } = await supabase.rpc('ingest_batch', {
      p_source: payload.source,
      p_entity: payload.entity,
      p_rows: chunk,
      p_triggered_by: payload.origin,
    })
    if (error) {
      return json(500, { ...summary, error: `Falló el lote que empieza en la fila ${start + 1}: ${error.message}` })
    }
    const result = data as { sync_run_id: number; procesadas: number; con_error: number; errores: { fila: number }[] }
    summary.procesadas += result.procesadas
    summary.con_error += result.con_error
    summary.corridas.push(result.sync_run_id)
    if (summary.errores.length < 100) {
      summary.errores.push(...result.errores.slice(0, 100 - summary.errores.length).map((item) => ({ ...item, fila: item.fila + start })))
    }
  }

  const estado = summary.con_error === 0 ? 'exitoso' : summary.procesadas === 0 ? 'fallido' : 'parcial'
  return json(estado === 'fallido' ? 422 : 200, { estado, ...summary })
})
