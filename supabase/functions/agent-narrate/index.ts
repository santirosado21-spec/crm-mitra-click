// Edge Function `agent-narrate`: redacción con IA sobre evidencia ya calculada.
//
//   POST https://<proyecto>.supabase.co/functions/v1/agent-narrate
//   { "tipo": "reporte", "id": "<uuid del reporte>" }
//   { "tipo": "agente",  "id": "<id de la corrida>" }
//   { "tipo": "estado" }                      → { ia: true | false }
//
// Solo dirección o administración. La IA NO calcula ni decide: recibe el contenido que
// la base ya generó por reglas (KPIs, hallazgos con evidencia) y lo redacta en breve.
// No modifica datos de negocio; solo guarda el texto en el reporte o en la corrida.
//
// Secretos: ANTHROPIC_API_KEY (obligatorio para redactar) y AGENT_MODEL (opcional).
// Sin llave responde 409 y el sistema sigue mostrando la versión por reglas.

import { callerProfile, hasRole, json, serviceClient } from '../_shared/server.ts'

const MODEL = Deno.env.get('AGENT_MODEL') ?? 'claude-opus-5-5'

const SYSTEM = `Eres el analista de dirección de Mitra Click, una comercializadora mexicana con tienda en Shopify y venta directa.
Redactas una lectura ejecutiva breve en español de México a partir de los datos en JSON que recibes.

Reglas estrictas:
- Usa únicamente los números y hechos presentes en el JSON. No inventes cifras, causas ni nombres.
- Si un dato no está o es nulo, no lo menciones ni lo estimes.
- Orden: primero lo que exige una decisión, después los cambios relevantes, al final el contexto.
- No repitas todo el tablero: selecciona lo que importa.
- Máximo 160 palabras, en texto plano, con frases cortas. Sin markdown, sin saludos, sin despedidas.
- Importes en pesos mexicanos con separador de miles. Variaciones en porcentaje con signo.
- Si propones una acción, que sea concreta y asignable a un área (ventas, compras, almacén, logística, finanzas, marketing).`

async function narrate(apiKey: string, context: string, evidence: unknown): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: `${context}\n\nDatos:\n${JSON.stringify(evidence)}` }],
    }),
  })
  if (!response.ok) throw new Error(`El servicio de IA respondió ${response.status}`)
  const body = (await response.json()) as { content?: { type: string; text?: string }[] }
  const text = (body.content ?? []).filter((block) => block.type === 'text').map((block) => block.text ?? '').join('').trim()
  if (!text) throw new Error('El servicio de IA no devolvió texto')
  return text
}

const KIND: Record<string, string> = {
  ejecutivo: 'Reporte ejecutivo',
  comercial: 'Reporte comercial',
  productos: 'Reporte de productos y familias',
  operacion: 'Reporte de operación y logística',
  inventario: 'Reporte de inventario',
}
const AGENT: Record<string, string> = {
  supervision: 'Hallazgos del agente de supervisión (calidad de datos)',
  comercial: 'Hallazgos del agente comercial',
  marketing: 'Hallazgos del agente de marketing',
  ejecutivo: 'Lectura del agente ejecutivo',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })
  if (!hasRole(await callerProfile(req), ['direccion', 'admin'])) return json(403, { error: 'Solo dirección o administración pueden usar la redacción con IA' })

  const body = (await req.json().catch(() => ({}))) as { tipo?: string; id?: string | number }
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (body.tipo === 'estado') return json(200, { ia: Boolean(apiKey), modelo: apiKey ? MODEL : null })
  if (!apiKey) return json(409, { error: 'La redacción con IA no está activada: falta la llave del servicio. Se conserva la versión por reglas.' })
  if (!body.id) return json(400, { error: 'Falta el identificador' })

  const db = serviceClient()
  try {
    if (body.tipo === 'reporte') {
      const { data, error } = await db.from('reports').select('id,kind,frequency,period_start,period_end,content').eq('id', body.id).maybeSingle()
      if (error || !data) return json(404, { error: 'El reporte no existe' })
      const text = await narrate(apiKey, `${KIND[data.kind] ?? 'Reporte'} ${data.frequency}, del ${data.period_start} al ${data.period_end}. Compara contra el periodo anterior cuando el dato exista.`, data.content)
      const saved = await db.rpc('save_ai_narrative', { p_target: 'report', p_id: String(data.id), p_narrative: text })
      if (saved.error) throw new Error(saved.error.message)
      return json(200, { narrativa: text })
    }
    if (body.tipo === 'agente') {
      const { data: run, error } = await db.from('agent_runs').select('id,agent,started_at').eq('id', body.id).maybeSingle()
      if (error || !run) return json(404, { error: 'La corrida no existe' })
      const { data: findings } = await db.from('agent_findings').select('title,detail,evidence,suggested_action,assigned_role').eq('run_id', run.id).limit(40)
      if (!findings?.length) return json(409, { error: 'Esta corrida no generó hallazgos que redactar' })
      const text = await narrate(apiKey, `${AGENT[run.agent] ?? 'Hallazgos'}. Resume qué requiere atención y a quién le toca.`, findings)
      const saved = await db.rpc('save_ai_narrative', { p_target: 'run', p_id: String(run.id), p_narrative: text })
      if (saved.error) throw new Error(saved.error.message)
      return json(200, { narrativa: text })
    }
    return json(400, { error: 'Tipo no válido. Usa reporte, agente o estado.' })
  } catch (error) {
    return json(502, { error: error instanceof Error ? error.message : 'No se pudo redactar' })
  }
})
