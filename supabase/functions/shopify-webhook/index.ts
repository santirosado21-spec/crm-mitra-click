// Edge Function `shopify-webhook`: recibe los webhooks de Shopify.
//
//   POST https://<proyecto>.supabase.co/functions/v1/shopify-webhook
//
// Despliegue con verify_jwt = false: Shopify no envía un JWT de Supabase. La
// autenticación es la firma `X-Shopify-Hmac-Sha256`, calculada sobre el cuerpo crudo
// con el secreto SHOPIFY_WEBHOOK_SECRET. Sin secreto configurado se rechaza todo.
//
// Temas a registrar en Shopify: orders/create, orders/updated, orders/cancelled,
// products/create, products/update, customers/create, customers/update,
// inventory_levels/update.
//
// Cada webhook: se verifica → se guarda crudo (si ya se había recibido idéntico, se
// responde 200 sin reprocesar) → se traduce → se aplica en la base → se deja bitácora.

import { entityForTopic, mapShopifyCustomer, mapShopifyInventoryLevel, mapShopifyOrder, mapShopifyProduct, verifyShopifyHmac } from '../_shared/shopify.ts'
import { json, serviceClient } from '../_shared/server.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })

  const rawBody = await req.text()
  const valid = await verifyShopifyHmac(rawBody, req.headers.get('x-shopify-hmac-sha256'), Deno.env.get('SHOPIFY_WEBHOOK_SECRET'))
  if (!valid) return json(401, { error: 'Firma inválida' })

  const topic = req.headers.get('x-shopify-topic')
  const entity = entityForTopic(topic)
  // Tema que no procesamos: se responde 200 para que Shopify no reintente.
  if (!entity) return json(200, { ignored: topic })

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return json(400, { error: 'Cuerpo inválido' })
  }

  const db = serviceClient()
  const externalId = String(payload.id ?? payload.inventory_item_id ?? req.headers.get('x-shopify-webhook-id') ?? '')
  const log = (status: string, upserted: number, error: string | null) =>
    db.rpc('shopify_log_run', { p_entity: entity, p_status: status, p_received: 1, p_upserted: upserted, p_error: error, p_triggered_by: `webhook:${topic}` })

  try {
    const stored = await db.rpc('shopify_store_raw', { p_entity: entity, p_external_id: externalId, p_payload: payload })
    if (stored.error) throw new Error(stored.error.message)
    if (stored.data === false) return json(200, { duplicate: true })

    let applied = 0
    const problems: string[] = []
    const apply = async (fn: string, row: unknown) => {
      const { error } = await db.rpc(fn, { p: row })
      if (error) problems.push(error.message)
      else applied += 1
    }

    if (entity === 'order') {
      const row = mapShopifyOrder(payload)
      if (row) await apply('shopify_apply_order', row)
      else problems.push('Pedido sin identificador')
    } else if (entity === 'customer') {
      const row = mapShopifyCustomer(payload)
      if (row) await apply('shopify_apply_customer', row)
      else problems.push('Cliente sin nombre ni correo')
    } else if (entity === 'product') {
      const { rows, skipped } = mapShopifyProduct(payload)
      problems.push(...skipped)
      for (const row of rows) await apply('shopify_apply_product', row)
    } else {
      const row = mapShopifyInventoryLevel(payload)
      if (row) await apply('shopify_record_inventory', row)
    }

    await log(problems.length ? (applied ? 'parcial' : 'fallido') : 'exitoso', applied, problems.length ? problems.join(' · ').slice(0, 1000) : null)
    // Un problema de datos no se arregla reintentando: se responde 200 y queda en la bitácora.
    return json(200, { applied, problems: problems.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await log('fallido', 0, message.slice(0, 1000))
    // Falla de infraestructura: 500 para que Shopify reintente.
    return json(500, { error: 'No se pudo procesar' })
  }
})
