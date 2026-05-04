// Extensiv 3PL → CRM Bitácora: periodic backfill
// Deployed as a Supabase Edge Function (Deno runtime).
//
// ROLE: safety-net. The primary path is `extensiv-webhook`; this job
// runs every 6h via pg_cron to catch any events that were missed by
// webhook delivery (retries exhausted, downtime, etc).
//
// Polls /orders and /inventory/receivers with a delta RQL filter
// (ReadOnly.creationDate=ge=<lastSync>) and upserts into `operations`
// via the shared mapper. Merge-safe against SAC edits.
//
// Secrets required:
//   EXTENSIV_CLIENT_ID, EXTENSIV_CLIENT_SECRET, EXTENSIV_USER_LOGIN, EXTENSIV_BASE_URL
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)

// @ts-ignore — Deno remote imports resolved at deploy time
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore — Deno remote imports resolved at deploy time
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  mapOrderToOperation,
  mapReceiverToOperation,
  upsertOperation,
  type ClientByExtId,
  type ExtensivOrder,
  type ExtensivReceiver,
} from '../_shared/extensiv-mapper.ts'

// @ts-ignore — Deno global available at runtime
declare const Deno: { env: { get(key: string): string | undefined } }

const CLIENT_ID     = Deno.env.get('EXTENSIV_CLIENT_ID')     ?? ''
const CLIENT_SECRET = Deno.env.get('EXTENSIV_CLIENT_SECRET') ?? ''
const USER_LOGIN    = Deno.env.get('EXTENSIV_USER_LOGIN')    ?? ''
const BASE_URL      = Deno.env.get('EXTENSIV_BASE_URL')      ?? 'https://secure-wms.com'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type':                 'application/json',
}

/* ─── Extensiv auth (token cached 55 min) ─────────────────────────── */
let _token: string | null = null
let _tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token
  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
  const res = await fetch(`${BASE_URL}/AuthServer/api/Token`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json; charset=utf-8',
      'Accept':        'application/json',
      'Authorization': `Basic ${basic}`,
    },
    body: JSON.stringify({ grant_type: 'client_credentials', user_login: USER_LOGIN }),
  })
  if (!res.ok) throw new Error(`auth ${res.status}: ${await res.text()}`)
  const data = await res.json()
  _token = data.access_token
  _tokenExpiry = Date.now() + Math.max(0, (data.expires_in ?? 3600) - 300) * 1000
  return _token!
}

async function extensivGet(path: string, query: Record<string, string | number>): Promise<any> {
  const token = await getAccessToken()
  const url = new URL(`${BASE_URL}${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept':        'application/hal+json',
      'Content-Type':  'application/hal+json; charset=utf-8',
    },
  })
  if (!res.ok) throw new Error(`GET ${path} ${res.status}: ${await res.text()}`)
  return res.json()
}

function maxCreationDate(rows: Array<{ readOnly?: { creationDate?: string } }>, fallback: string): string {
  let max = fallback
  for (const r of rows) {
    const d = r.readOnly?.creationDate
    if (d && d > max) max = d
  }
  return max
}

/* ─── Handler ──────────────────────────────────────────────────────── */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'SUPABASE_URL / SERVICE_ROLE_KEY missing' }), {
      status: 500, headers: CORS_HEADERS,
    })
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: state, error: stateErr } = await sb
    .from('extensiv_sync_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (stateErr || !state) {
    return new Response(JSON.stringify({ error: 'extensiv_sync_state row missing; run the migration' }), {
      status: 500, headers: CORS_HEADERS,
    })
  }

  const lastOrders    = state.last_orders_sync    ?? new Date(Date.now() - 86400000).toISOString()
  const lastReceivers = state.last_receivers_sync ?? new Date(Date.now() - 86400000).toISOString()

  // Client mapping
  const { data: clients } = await sb
    .from('clients')
    .select('codigo, name, extensiv_customer_id')
    .not('extensiv_customer_id', 'is', null)

  const clientByExtId: ClientByExtId = new Map()
  for (const c of clients ?? []) {
    if (c.extensiv_customer_id != null) {
      clientByExtId.set(Number(c.extensiv_customer_id), { codigo: c.codigo, name: c.name })
    }
  }

  let imported = 0
  const errors: string[] = []
  let nextOrdersCursor    = lastOrders
  let nextReceiversCursor = lastReceivers

  /* ── Orders (salidas) ─────────────────────────────────────────────── */
  try {
    const ordersResp = await extensivGet('/orders', {
      pgsiz: 500,
      rql:   `ReadOnly.creationDate=ge=${lastOrders}`,
    })
    const orderRel =
      ordersResp?._embedded?.['http://api.3plCentral.com/rels/orders/order'] ??
      ordersResp?._embedded?.order ??
      []
    const orders: ExtensivOrder[] = Array.isArray(orderRel) ? orderRel : []
    nextOrdersCursor = maxCreationDate(orders, lastOrders)

    for (const o of orders) {
      const row = mapOrderToOperation(o, clientByExtId, 'extensiv-sync')
      if (!row) continue
      const result = await upsertOperation(sb, row)
      if (result.error) errors.push(`order ${row.extensiv_order_id}: ${result.error}`)
      imported += result.imported
    }
  } catch (e) {
    errors.push(`orders: ${e instanceof Error ? e.message : String(e)}`)
  }

  /* ── Receivers (entradas) ─────────────────────────────────────────── */
  try {
    const recvResp = await extensivGet('/inventory/receivers', {
      pgsiz: 500,
      rql:   `ReadOnly.creationDate=ge=${lastReceivers}`,
    })
    const recvRel =
      recvResp?._embedded?.['http://api.3plCentral.com/rels/inventory/receiver'] ??
      recvResp?._embedded?.item ??
      recvResp?._embedded?.receiver ??
      []
    const receivers: ExtensivReceiver[] = Array.isArray(recvRel) ? recvRel : []
    nextReceiversCursor = maxCreationDate(receivers, lastReceivers)

    for (const r of receivers) {
      const row = mapReceiverToOperation(r, clientByExtId, 'extensiv-sync')
      if (!row) continue
      const result = await upsertOperation(sb, row)
      if (result.error) errors.push(`receiver ${row.extensiv_receipt_id}: ${result.error}`)
      imported += result.imported
    }
  } catch (e) {
    errors.push(`receivers: ${e instanceof Error ? e.message : String(e)}`)
  }

  /* ── Persist cursor + run metadata ────────────────────────────────── */
  const runStatus = errors.length === 0 ? 'ok' : (imported > 0 ? 'partial' : 'error')
  await sb.from('extensiv_sync_state').update({
    last_orders_sync:    nextOrdersCursor,
    last_receivers_sync: nextReceiversCursor,
    last_run_at:         new Date().toISOString(),
    last_run_status:     runStatus,
    last_run_error:      errors.length ? errors.join(' | ').slice(0, 1000) : null,
    last_run_imported:   imported,
  }).eq('id', 1)

  return new Response(JSON.stringify({
    status: runStatus,
    imported,
    errors,
    next_orders_cursor:    nextOrdersCursor,
    next_receivers_cursor: nextReceiversCursor,
  }), { status: 200, headers: CORS_HEADERS })
})
