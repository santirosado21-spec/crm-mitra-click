// Evidencia de entrega en el bucket privado "remisiones". El acceso lo deciden las
// políticas de Storage por rol; aquí solo se suben archivos y se piden links temporales.

import { getSupabaseClient } from './supabase'

const BUCKET = 'remisiones'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/** Mensaje de error si el archivo no se puede subir; null si es válido. */
export function evidenceProblem(file: { name: string; size: number; type: string }): string | null {
  if (!ALLOWED.includes(file.type)) return `${file.name}: solo se aceptan fotos (JPG, PNG, WebP) o PDF.`
  if (file.size > MAX_BYTES) return `${file.name}: pesa más de 10 MB.`
  return null
}

/** Nombre seguro para la ruta: sin acentos, espacios ni caracteres especiales. */
export const safeFileName = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9.]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'archivo'

export async function uploadEvidence(shipmentId: string, files: File[]): Promise<string[]> {
  const storage = getSupabaseClient().storage.from(BUCKET)
  const paths: string[] = []
  for (const [index, file] of files.entries()) {
    const path = `${shipmentId}/${Date.now()}-${index}-${safeFileName(file.name)}`
    const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw new Error(`No se pudo subir ${file.name}: ${error.message}`)
    paths.push(path)
  }
  return paths
}

/** Link temporal (10 minutos) para ver un archivo de evidencia. */
export async function evidenceUrl(path: string): Promise<string> {
  const { data, error } = await getSupabaseClient().storage.from(BUCKET).createSignedUrl(path, 600)
  if (error || !data) throw new Error('No se pudo abrir la evidencia.')
  return data.signedUrl
}
