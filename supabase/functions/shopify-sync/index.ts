// Edge Function `shopify-sync`: carga inicial y reconciliación contra la Admin API.
//
//   POST https://<proyecto>.supabase.co/functions/v1/shopify-sync
//   { "entidad": "productos" | "clientes" | "pedidos" | "estado", "desde": "2026-01-01" }
//
// La dispara desde la app una persona de dirección o administración (JWT de usuario),
// o un proceso de servidor con la llave secreta en el header `apikey`.
//
// Secretos (Edge Functions → Secrets), ninguno llega al navegador:
//   SHOPIFY_STORE_DOMAIN   p. ej. mitra-click.myshopify.com
//   SHOPIFY_ADMIN_TOKEN    token de la app personalizada (shpat_…)
//   SHOPIFY_WEBHOOK_SECRET secreto para verificar webhooks
//   SHOPIFY_API_VERSION    opcional; por defecto la indicada abajo
//
// "estado" no llama a Shopify: solo informa qué secretos están configurados (sí/no).

import { mapShopifyCustomer, mapShopifyOrder, mapShopifyProduct } from '../_shared/shopify.ts'
import { callerProfile, hasRole, json, secretKeys, serviceClient } from '../_shared/server.ts'

const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') ?? '2026-07'
const PAGE_LIMIT = 250
const MAX_PAGES = 40

const ENTITIES = {
  productos: { path: 'products.json', key: 'products', entity: 'product' },
  clientes: { path: 'customers.json', key: 'customers', entity: 'customer' },
  pedidos: { path: 'orders.json', key: 'orders', entity: 'order' },
} as const

function configured() {
  return {
    dominio: Boolean(Deno.env.get('SHOPIFY_STORE_DOMAIN')),
    token: Boolean(Deno.env.get('SHOPIFY_ADMIN_TOKEN')),
    webhook: Boolean(Deno.env.get('SHOPIFY_WEBHOOK_SECRET')),
  }
}

/** Siguiente página según el header `Link` (paginación por cursor de Shopify). */
function nextUrl(link: string | null): string | null {
  const match = /<([^>]+)>;\s*rel="next"/.exec(link ?? '')
  return match ? match[1] : null
}

async function authorized(req: Request): Promise<boolean> {
  const apikey = req.headers.get('apikey')
  if (apikey && secretKeys().includes(apikey)) return true
  return hasRole(await callerProfile(req), ['direccion', 'admin'])
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })
  if (!(await authorized(req))) return json(403, { error: 'Solo dirección o administración pueden sincronizar con Shopify' })

  const body = (await req.json().catch(() => ({}))) as { entidad?: string; desde?: string }
  const status = configured()
  if (body.entidad === 'estado') return json(200, { configurado: status, version: API_VERSION })

  const def = ENTITIES[body.entidad as keyof typeof ENTITIES]
  if (!def) return json(400, { error: 'Entidad no válida. Usa productos, clientes, pedidos o estado.' })
  if (!status.dominio || !status.token) return json(409, { error: 'Shopify no está conectado: faltan el dominio de la tienda o el token.', configurado: status })

  const domain = Deno.env.get('SHOPIFY_STORE_DOMAIN')!
  const token = Deno.env.get('SHOPIFY_ADMIN_TOKEN')!
  const db = serviceClient()

  const params = new URLSearchParams({ limit: String(PAGE_LIMIT) })
  if (def.entity === 'order') params.set('status', 'any')
  if (body.desde && /^\d{4}-\d{2}-\d{2}$/.test(body.desde)) params.set('updated_at_min', `${body.desde}T00:00:00-06:00`)
  let url: string | null = `https://${domain}/admin/api/${API_VERSION}/${def.path}?${params}`

  let received = 0
  let applied = 0
  const problems: string[] = []
  const apply = async (fn: string, row: unknown) => {
    const { error } = await db.rpc(fn, { p: row })
    if (error) problems.push(error.message)
    else applied += 1
  }

  try {
    for (let page = 0; url && page < MAX_PAGES; page += 1) {
      const response = await fetch(url, { headers: { 'X-Shopify-Access-Token': token, Accept: 'application/json' } })
      if (response.status === 429) {
        // Límite de llamadas: se espera lo que Shopify indique y se repite la misma página.
        await new Promise((resolve) => setTimeout(resolve, Number(response.headers.get('Retry-After') ?? '2') * 1000))
        page -= 1
        continue
      }
      if (!response.ok) throw new Error(`Shopify respondió ${response.status}`)
      const items = ((await response.json()) as Record<string, Record<string, unknown>[]>)[def.key] ?? []
      received += items.length

      for (const item of items) {
        await db.rpc('shopify_store_raw', { p_entity: def.entity, p_external_id: String(item.id ?? ''), p_payload: item })
        if (def.entity === 'order') {
          const row = mapShopifyOrder(item)
          if (row) await apply('shopify_apply_order', row)
        } else if (def.entity === 'customer') {
          const row = mapShopifyCustomer(item)
          if (row) await apply('shopify_apply_customer', row)
        } else {
          const { rows, skipped } = mapShopifyProduct(item)
          problems.push(...skipped)
          for (const row of rows) await apply('shopify_apply_product', row)
        }
      }
      url = nextUrl(response.headers.get('Link'))
    }

    const result = problems.length ? 'parcial' : 'exitoso'
    await db.rpc('shopify_log_run', { p_entity: def.entity, p_status: result, p_received: received, p_upserted: applied, p_error: problems.length ? problems.slice(0, 20).join(' · ').slice(0, 1000) : null, p_triggered_by: 'sincronización' })
    return json(200, { recibidos: received, aplicados: applied, problemas: problems.slice(0, 50), incompleto: Boolean(url) })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await db.rpc('shopify_log_run', { p_entity: def.entity, p_status: 'fallido', p_received: received, p_upserted: applied, p_error: message.slice(0, 1000), p_triggered_by: 'sincronización' })
    return json(502, { error: message, recibidos: received, aplicados: applied })
  }
})
