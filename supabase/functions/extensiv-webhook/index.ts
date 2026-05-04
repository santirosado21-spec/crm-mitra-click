// Extensiv 3PL → CRM Bitácora: webhook receiver
// Deployed as a Supabase Edge Function (Deno runtime).
//
// Flow:
//   1. Extensiv POSTs an event when a new order/receiver is created or updated.
//   2. We validate the shared secret (header OR path token) and parse the event.
//   3. We GET the full resource from Extensiv to pull rich fields.
//   4. We upsert into `operations` via the shared mapper (merge-safe vs SAC edits).
//
// IMPORTANT — Extensiv webhook payload format is tenant/plan-specific.
// This handler is flexible and logs unknown shapes. After the first real event
// arrives, tighten the parsing if needed.
//
// Secrets required:
//   EXTENSIV_CLIENT_ID, EXTENSIV_CLIENT_SECRET, EXTENSIV_USER_LOGIN, EXTENSIV_BASE_URL
//   EXTENSIV_WEBHOOK_SECRET  — shared secret Extensiv sends in header `X-Extensiv-Signature`
//                              or appended to the URL path as ?t=<secret>
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)

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

// @ts-ignore — Deno runtime global
declare const Deno: { env: { get(key: string): string | undefined } }

const CLIENT_ID       = Deno.env.get('EXTENSIV_CLIENT_ID')       ?? ''
const CLIENT_SECRET   = Deno.env.get('EXTENSIV_CLIENT_SECRET')   ?? ''
const USER_LOGIN      = Deno.env.get('EXTENSIV_USER_LOGIN')      ?? ''
const BASE_URL        = Deno.env.get('EXTENSIV_BASE_URL')        ?? 'https://secure-wms.com'
const WEBHOOK_SECRET  = Deno.env.get('EXTENSIV_WEBHOOK_SECRET')  ?? ''

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-extensiv-signature, content-type',
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

/* ─── Event parsing (flexible: handles several likely shapes) ──────── */

type EventKind = 'order' | 'receiver' | 'unknown'

interface ParsedEvent {
  kind:       EventKind
  resourceId: string | null
  rawType:    string
}

// deno-lint-ignore no-explicit-any
function parseEvent(body: any): ParsedEvent {
  // Common shapes we might see — adjust after observing the first real event.
  const type =
    body?.type ??
    body?.eventType ??
    body?.event ??
    body?.Type ??
    ''

  const rid =
    body?.resourceId ??
    body?.objectId ??
    body?.orderId ??
    body?.receiverId ??
    body?.data?.id ??
    body?.data?.orderId ??
    body?.data?.receiverId ??
    body?.resource?.id ??
    null

  const lower = String(type).toLowerCase()
  let kind: EventKind = 'unknown'
  if (lower.includes('order'))        kind = 'order'
  else if (lower.includes('receiver') || lower.includes('receipt') || lower.includes('inbound')) kind = 'receiver'

  return { kind, resourceId: rid != null ? String(rid) : null, rawType: String(type) }
}

/* ─── Handler ──────────────────────────────────────────────────────── */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS_HEADERS })
  }

  // Shared-secret auth: accept either header `X-Extensiv-Signature` or `?t=<secret>` in URL.
  const url = new URL(req.url)
  const headerSecret = req.headers.get('x-extensiv-signature') ?? ''
  const pathSecret   = url.searchParams.get('t') ?? ''
  if (!WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'EXTENSIV_WEBHOOK_SECRET not configured' }), {
      status: 500, headers: CORS_HEADERS,
    })
  }
  if (headerSecret !== WEBHOOK_SECRET && pathSecret !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS_HEADERS })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: CORS_HEADERS })
  }

  const event = parseEvent(body)
  console.log('extensiv-webhook event:', JSON.stringify({ parsed: event, raw: body }))

  if (event.kind === 'unknown' || !event.resourceId) {
    // Not enough to act on — return 200 so Extensiv doesn't retry a malformed event forever.
    return new Response(
      JSON.stringify({ status: 'ignored', reason: 'unknown event shape', event }),
      { status: 200, headers: CORS_HEADERS },
    )
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'supabase env missing' }), { status: 500, headers: CORS_HEADERS })
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // Load client mapping table once per invocation.
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
    if (event.kind === 'order') {
      const resource = await extensivGet(`/orders/${event.resourceId}`) as Parameters<typeof mapOrderToOperation>[0]
      const row = mapOrderToOperation(resource, clientByExtId, 'extensiv-webhook')
      if (!row) throw new Error('could not map order')
      const result = await upsertOperation(sb, row)
      return new Response(JSON.stringify({ status: 'ok', kind: 'order', ...result }), {
        status: 200, headers: CORS_HEADERS,
      })
    }

    if (event.kind === 'receiver') {
      const resource = await extensivGet(`/inventory/receivers/${event.resourceId}`) as Parameters<typeof mapReceiverToOperation>[0]
      const row = mapReceiverToOperation(resource, clientByExtId, 'extensiv-webhook')
      if (!row) throw new Error('could not map receiver')
      const result = await upsertOperation(sb, row)
      return new Response(JSON.stringify({ status: 'ok', kind: 'receiver', ...result }), {
        status: 200, headers: CORS_HEADERS,
      })
    }

    return new Response(JSON.stringify({ status: 'ignored', event }), { status: 200, headers: CORS_HEADERS })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('extensiv-webhook error:', msg)
    // 5xx triggers Extensiv retry — desired for transient failures.
    return new Response(JSON.stringify({ error: msg, event }), { status: 502, headers: CORS_HEADERS })
  }
})
