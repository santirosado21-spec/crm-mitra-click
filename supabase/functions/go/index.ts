// Edge Function `go`: redirección de los links medibles (tarjetas NFC, códigos QR, redes).
//
//   GET https://<proyecto>.supabase.co/functions/v1/go?c=<código>
//
// Pública (verify_jwt = false): la abre cualquier persona que escanea una tarjeta.
// Solo hace dos cosas: registra el escaneo (momento y tipo de dispositivo, sin IP ni
// identificadores) y redirige al destino configurado. Un código desconocido o
// desactivado lleva a LINK_FALLBACK_URL (la tienda) si ese secreto está configurado.

import { serviceClient } from '../_shared/server.ts'

const FALLBACK = Deno.env.get('LINK_FALLBACK_URL')

const redirect = (url: string | undefined) =>
  url && url.startsWith('https://')
    ? new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } })
    : new Response('Este enlace no está disponible.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Método no permitido', { status: 405 })
  const code = new URL(req.url).searchParams.get('c') ?? ''
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(code)) return redirect(FALLBACK)

  // Las vistas previas de enlaces (HEAD) no cuentan como escaneo.
  if (req.method === 'HEAD') return redirect(FALLBACK)

  const device = /Mobi|Android|iPhone|iPad/i.test(req.headers.get('user-agent') ?? '') ? 'movil' : 'escritorio'
  try {
    const { data, error } = await serviceClient().rpc('track_link', { p_code: code, p_device: device })
    // El destino se validó como https:// al guardarlo (restricción de la tabla).
    if (!error && typeof data === 'string' && data.startsWith('https://')) return redirect(data)
  } catch {
    // Si la base no responde, se usa el destino de respaldo.
  }
  return redirect(FALLBACK)
})
