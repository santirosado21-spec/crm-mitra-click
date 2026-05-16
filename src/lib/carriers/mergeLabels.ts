// Descarga las etiquetas reales de los carriers (vía la edge function
// label-proxy, que esquiva CORS) y las combina en un solo PDF con pdf-lib.
//
// Reemplaza el PDF de resumen de texto que generaba PrintQueueBadge: aquí se
// fusionan las etiquetas reales — una página por etiqueta — listas para
// imprimir, como hace Techship.

import { PDFDocument } from 'pdf-lib'
import { supabase } from '../supabase'

export interface LabelToMerge {
  id:               string
  label_url:        string | null
  tracking_number?: string | null
  carrier?:         string | null
}

export interface MergeLabelsResult {
  blob:      Blob | null   // PDF combinado application/pdf; null si 0 éxitos
  succeeded: LabelToMerge[]
  failed:    { item: LabelToMerge; reason: string }[]
}

interface LabelProxyResponse {
  ok:           boolean
  format?:      'pdf' | 'image' | 'unsupported'
  contentType?: string
  base64?:      string
  error?:       string
}

// Descargas en paralelo, en lotes — no saturar los CDN de los carriers.
const CONCURRENCY = 5

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function fetchLabel(url: string): Promise<LabelProxyResponse> {
  const { data, error } = await supabase.functions.invoke('label-proxy', {
    body: { action: 'fetch-label', url },
  })
  if (error) return { ok: false, error: error.message ?? 'Error del proxy de etiquetas' }
  return (data ?? { ok: false, error: 'Sin respuesta del proxy' }) as LabelProxyResponse
}

/**
 * Combina las etiquetas de `labels` en un solo PDF. No aborta en bloque: las
 * etiquetas que fallan la descarga se reportan en `failed` y el resto se
 * combina igual.
 */
export async function mergeLabels(labels: LabelToMerge[]): Promise<MergeLabelsResult> {
  const succeeded: LabelToMerge[] = []
  const failed: { item: LabelToMerge; reason: string }[] = []

  // Agrupa por label_url — varias órdenes pueden compartir etiqueta; se
  // descarga una sola vez y el resultado se atribuye a todos los items.
  const groups = new Map<string, LabelToMerge[]>()
  for (const l of labels) {
    if (!l.label_url) { failed.push({ item: l, reason: 'Sin URL de etiqueta' }); continue }
    const g = groups.get(l.label_url) ?? []
    g.push(l)
    groups.set(l.label_url, g)
  }

  const master = await PDFDocument.create()
  const urls = [...groups.keys()]

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const chunk = urls.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(u => fetchLabel(u)))

    for (let j = 0; j < chunk.length; j++) {
      const items = groups.get(chunk[j])!
      const markFailed = (reason: string) => items.forEach(it => failed.push({ item: it, reason }))
      const r = results[j]

      if (r.status === 'rejected') { markFailed('Error de red al descargar'); continue }
      const resp = r.value
      if (!resp.ok || !resp.base64) { markFailed(resp.error ?? 'No se pudo descargar'); continue }

      try {
        const bytes = base64ToBytes(resp.base64)
        if (resp.format === 'pdf') {
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
          const pages = await master.copyPages(src, src.getPageIndices())
          pages.forEach(p => master.addPage(p))
        } else if (resp.format === 'image') {
          const img = resp.contentType?.toLowerCase().includes('png')
            ? await master.embedPng(bytes)
            : await master.embedJpg(bytes)
          const page = master.addPage([img.width, img.height])
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
        } else {
          markFailed('Formato no imprimible (ZPL/desconocido)')
          continue
        }
        items.forEach(it => succeeded.push(it))
      } catch {
        markFailed('Etiqueta corrupta o ilegible')
      }
    }
  }

  if (succeeded.length === 0) return { blob: null, succeeded, failed }

  const pdfBytes = await master.save()
  return {
    // Copia a un Uint8Array con ArrayBuffer propio — Blob no acepta el
    // Uint8Array<ArrayBufferLike> genérico que devuelve pdf-lib.save().
    blob: new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }),
    succeeded,
    failed,
  }
}
