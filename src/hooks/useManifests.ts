import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Manifest, ManifestStatus } from '../types/techship'

export interface ManifestWithGuias extends Manifest {
  guia_ids: string[]
}

// CRUD de manifiestos + su relación con guías (manifest_guias).
export function useManifests() {
  const [manifests, setManifests] = useState<ManifestWithGuias[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('manifests')
        .select('*, manifest_guias(guia_id)')
        .order('created_at', { ascending: false })
        .limit(500)
      if (err) throw err
      const rows = (data ?? []).map((m: Manifest & { manifest_guias?: { guia_id: string }[] }) => ({
        ...m,
        guia_ids: (m.manifest_guias ?? []).map(g => g.guia_id),
      }))
      setManifests(rows as ManifestWithGuias[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar manifiestos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /** Crea un manifiesto abierto con las guías seleccionadas. */
  const createManifest = useCallback(async (input: {
    carrier: string; provider: string; guiaIds: string[]; creadoPor: string | null; notas?: string
  }): Promise<Manifest> => {
    const folio = `MAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const { data: m, error: err } = await supabase
      .from('manifests')
      .insert({
        folio, carrier: input.carrier, provider: input.provider,
        status: 'abierto', total_guias: input.guiaIds.length,
        notas: input.notas ?? '', creado_por: input.creadoPor,
      })
      .select().single()
    if (err) throw new Error(err.message)
    const manifest = m as Manifest
    if (input.guiaIds.length > 0) {
      const links = input.guiaIds.map(gid => ({ manifest_id: manifest.id, guia_id: gid }))
      const linkRes = await supabase.from('manifest_guias').insert(links)
      if (linkRes.error) {
        // Rollback compensatorio: sin sus guías el manifiesto queda huérfano
        // (total_guias > 0 pero cero líneas).
        await supabase.from('manifests').delete().eq('id', manifest.id)
        throw new Error(linkRes.error.message)
      }
    }
    await fetchAll()
    return manifest
  }, [fetchAll])

  const markFinalized = useCallback(async (id: string, pdfUrl: string | null, providerManifestId: string | null) => {
    const { error: err } = await supabase
      .from('manifests')
      .update({
        status: 'finalizado' as ManifestStatus,
        pdf_url: pdfUrl,
        provider_manifest_id: providerManifestId,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAll()
  }, [fetchAll])

  const cancelManifest = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('manifests').update({ status: 'cancelado' as ManifestStatus }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAll()
  }, [fetchAll])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('manifests').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setManifests(prev => prev.filter(m => m.id !== id))
  }, [])

  return { manifests, loading, error, refetch: fetchAll, createManifest, markFinalized, cancelManifest, remove }
}
