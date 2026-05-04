// Extensiv → CRM: refresh a single operation on demand.
// Called from the Bitácora form when SAC clicks "Re-sincronizar desde Extensiv".
//
// Body: { extensiv_order_id?: string, extensiv_receipt_id?: string }
//
// Behavior: fetches the resource from Extensiv and upserts via the shared
// mapper. Merge-safe: if operations.sac_editado_at is not null, only metadata
// is refreshed.

// @ts-ignore — Deno remote imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore — Deno remote imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  mapOrderToOperation,
  mapReceiverToOperation,
  upsertOperation,
  type ClientByExtId,
} from '../_shared/extensiv-mapper.ts'

// @ts-ignore — Deno global
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

async function extensivGet(path: string): Promise<unknown> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS_HEADERS })
  }

  let payload: { extensiv_order_id?: string; extensiv_receipt_id?: string } = {}
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: CORS_HEADERS })
  }

  const { extensiv_order_id, extensiv_receipt_id } = payload
  if (!extensiv_order_id && !extensiv_receipt_id) {
    return new Response(
      JSON.stringify({ error: 'must provide extensiv_order_id or extensiv_receipt_id' }),
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

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

  try {
    if (extensiv_order_id) {
      const resource = await extensivGet(`/orders/${extensiv_order_id}`) as Parameters<typeof mapOrderToOperation>[0]
      const row = mapOrderToOperation(resource, clientByExtId, 'extensiv-refresh')
      if (!row) throw new Error('could not map order')
      const result = await upsertOperation(sb, row)
      return new Response(JSON.stringify({ status: 'ok', kind: 'order', ...result }), {
        status: 200, headers: CORS_HEADERS,
      })
    }

    const resource = await extensivGet(`/inventory/receivers/${extensiv_receipt_id}`) as Parameters<typeof mapReceiverToOperation>[0]
    const row = mapReceiverToOperation(resource, clientByExtId, 'extensiv-refresh')
    if (!row) throw new Error('could not map receiver')
    const result = await upsertOperation(sb, row)
    return new Response(JSON.stringify({ status: 'ok', kind: 'receiver', ...result }), {
      status: 200, headers: CORS_HEADERS,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), { status: 502, headers: CORS_HEADERS })
  }
})
