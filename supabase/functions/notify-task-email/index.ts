// Supabase Edge Function · notify-task-email
//
// Recibe { to, subject, html } desde Postgres (db_send_task_email vía pg_net)
// y manda el email vía Resend.
//
// Deno runtime — no tocar imports.

// @ts-expect-error Deno runtime types not available in TS context
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'CRM Supply Chain <onboarding@resend.dev>'
const SHARED_SECRET  = Deno.env.get('EDGE_SHARED_SECRET') ?? ''

interface Payload { to: string; subject: string; html: string }

serve(async (req) => {
  // Verificación de origen: Authorization: Bearer <SHARED_SECRET>
  const auth = req.headers.get('authorization') ?? ''
  if (SHARED_SECRET && auth !== `Bearer ${SHARED_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: Payload
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.to || !body.subject || !body.html) {
    return new Response('Missing fields', { status: 400 })
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [body.to],
      subject: body.subject,
      html: body.html,
    }),
  })

  if (!r.ok) {
    const txt = await r.text()
    return new Response(`Resend error: ${txt}`, { status: 502 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
