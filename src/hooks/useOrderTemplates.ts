import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { OrderTemplate, CreateOrderTemplateData } from '../types/techship'

// CRUD de plantillas de orden de paquetería.
export function useOrderTemplates() {
  const [templates, setTemplates] = useState<OrderTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('parcel_order_templates')
        .select('*')
        .order('use_count', { ascending: false })
        .order('nombre', { ascending: true })
      if (err) throw err
      setTemplates((data ?? []) as OrderTemplate[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar plantillas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (data: CreateOrderTemplateData): Promise<OrderTemplate> => {
    const { data: row, error: err } = await supabase
      .from('parcel_order_templates').insert(data).select().single()
    if (err) throw new Error(err.message)
    await fetchAll()
    return row as OrderTemplate
  }, [fetchAll])

  const update = useCallback(async (id: string, data: Partial<CreateOrderTemplateData>) => {
    const { error: err } = await supabase.from('parcel_order_templates').update(data).eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAll()
  }, [fetchAll])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('parcel_order_templates').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  /** Marca una plantilla como usada: incrementa use_count y sella last_used_at. */
  const markUsed = useCallback(async (id: string) => {
    const tpl = templates.find(t => t.id === id)
    const { error: err } = await supabase
      .from('parcel_order_templates')
      .update({ use_count: (tpl?.use_count ?? 0) + 1, last_used_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAll()
  }, [templates, fetchAll])

  return { templates, loading, error, refetch: fetchAll, create, update, remove, markUsed }
}
