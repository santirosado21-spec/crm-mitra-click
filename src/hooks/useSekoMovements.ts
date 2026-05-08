import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type {
  SekoMovement, CreateSekoMovementData, SekoMovementFilters,
} from '../types/seko'

export function useSekoMovements(filters?: SekoMovementFilters) {
  const [movements, setMovements] = useState<SekoMovement[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchMovements = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      let q = supabase
        .from('seko_movements')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2000)

      if (filters?.clienteId)  q = q.eq('cliente_id', filters.clienteId)
      if (filters?.tipo)       q = q.eq('tipo', filters.tipo)
      if (filters?.fechaDesde) q = q.gte('fecha', filters.fechaDesde)
      if (filters?.fechaHasta) q = q.lte('fecha', filters.fechaHasta)
      if (filters?.billed !== undefined) q = q.eq('billed', filters.billed)
      if (filters?.search) {
        const s = filters.search.replace(/[%_]/g, '\\$&')
        q = q.or(`referencia.ilike.%${s}%,sku.ilike.%${s}%`)
      }

      const { data, error: err } = await q
      if (err) throw err
      setMovements((data ?? []) as SekoMovement[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar movimientos')
    } finally {
      setLoading(false)
    }
  }, [filters?.clienteId, filters?.tipo, filters?.fechaDesde, filters?.fechaHasta, filters?.billed, filters?.search])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  /** Bulk insert. Devuelve la cantidad insertada o lanza error. */
  const bulkInsert = useCallback(async (rows: CreateSekoMovementData[]): Promise<number> => {
    if (rows.length === 0) return 0
    const { data, error: err } = await supabase
      .from('seko_movements')
      .insert(rows)
      .select('id')
    if (err) throw new Error(err.message)
    const inserted = (data ?? []).length
    await fetchMovements()
    return inserted
  }, [fetchMovements])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('seko_movements').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setMovements(prev => prev.filter(m => m.id !== id))
  }, [])

  const markBilled = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    const { error: err } = await supabase
      .from('seko_movements')
      .update({ billed: true, billed_at: new Date().toISOString() })
      .in('id', ids)
    if (err) throw new Error(err.message)
    await fetchMovements()
  }, [fetchMovements])

  const kpis = useMemo(() => {
    const buckets = { entradas: 0, salidas: 0, billed: 0, pendientes: 0 }
    let totalCantidad = 0
    for (const m of movements) {
      if (m.tipo === 'entrada') buckets.entradas++
      else if (m.tipo === 'salida') buckets.salidas++
      if (m.billed) buckets.billed++
      else buckets.pendientes++
      totalCantidad += Number(m.cantidad) || 0
    }
    return { total: movements.length, ...buckets, totalCantidad }
  }, [movements])

  return { movements, loading, error, kpis, refetch: fetchMovements, bulkInsert, remove, markBilled }
}
