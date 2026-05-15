import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { PrintQueueItem, CreatePrintQueueData } from '../types/techship'

// Cola de impresión de etiquetas. Cada usuario ve la suya (por email).
export function usePrintQueue(userEmail: string | null | undefined) {
  const [items, setItems]   = useState<PrintQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!userEmail) { setItems([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('parcel_print_queue')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(500)
      if (err) throw err
      setItems((data ?? []) as PrintQueueItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cola de impresión')
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const enqueue = useCallback(async (rows: CreatePrintQueueData[]): Promise<number> => {
    if (rows.length === 0) return 0
    const { data, error: err } = await supabase
      .from('parcel_print_queue')
      .insert(rows)
      .select('id')
    if (err) throw new Error(err.message)
    await fetchQueue()
    return (data ?? []).length
  }, [fetchQueue])

  const markPrinted = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    const { error: err } = await supabase
      .from('parcel_print_queue')
      .update({ status: 'impreso', printed_at: new Date().toISOString() })
      .in('id', ids)
    if (err) throw new Error(err.message)
    await fetchQueue()
  }, [fetchQueue])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('parcel_print_queue').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const clearPrinted = useCallback(async () => {
    if (!userEmail) return
    const { error: err } = await supabase
      .from('parcel_print_queue')
      .delete()
      .eq('user_email', userEmail)
      .eq('status', 'impreso')
    if (err) throw new Error(err.message)
    await fetchQueue()
  }, [userEmail, fetchQueue])

  const pendingCount = useMemo(
    () => items.filter(i => i.status === 'pendiente').length,
    [items],
  )

  return { items, loading, error, pendingCount, refetch: fetchQueue, enqueue, markPrinted, remove, clearPrinted }
}
