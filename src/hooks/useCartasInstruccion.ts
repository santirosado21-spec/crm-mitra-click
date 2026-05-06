import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type {
  CartaInstruccion, CreateCartaData, UpdateCartaData, CartaFilters,
} from '../types/cartas'

export function useCartasInstruccion(filters?: CartaFilters) {
  const [cartas, setCartas]   = useState<CartaInstruccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchCartas = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      let q = supabase
        .from('cartas_instruccion')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters?.status)     q = q.eq('status', filters.status)
      if (filters?.clienteId)  q = q.eq('cliente_id', filters.clienteId)
      if (filters?.fechaDesde) q = q.gte('fecha', filters.fechaDesde)
      if (filters?.fechaHasta) q = q.lte('fecha', filters.fechaHasta)
      if (filters?.search) {
        const s = filters.search.replace(/[%_]/g, '\\$&')
        q = q.or(`folio.ilike.%${s}%,cliente_nombre.ilike.%${s}%,referencia.ilike.%${s}%,destino.ilike.%${s}%`)
      }

      const { data, error: err } = await q
      if (err) throw err
      setCartas((data ?? []) as CartaInstruccion[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar cartas')
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.clienteId, filters?.search, filters?.fechaDesde, filters?.fechaHasta])

  useEffect(() => { fetchCartas() }, [fetchCartas])

  const create = useCallback(async (data: CreateCartaData): Promise<CartaInstruccion> => {
    const { data: created, error: err } = await supabase
      .from('cartas_instruccion')
      .insert(data)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const c = created as CartaInstruccion
    setCartas(prev => [c, ...prev])
    return c
  }, [])

  const update = useCallback(async (id: string, data: UpdateCartaData): Promise<CartaInstruccion> => {
    const { data: updated, error: err } = await supabase
      .from('cartas_instruccion')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const c = updated as CartaInstruccion
    setCartas(prev => prev.map(x => x.id === id ? c : x))
    return c
  }, [])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('cartas_instruccion').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setCartas(prev => prev.filter(x => x.id !== id))
  }, [])

  const getById = useCallback(async (id: string): Promise<CartaInstruccion | null> => {
    const { data, error: err } = await supabase
      .from('cartas_instruccion').select('*').eq('id', id).maybeSingle()
    if (err) throw new Error(err.message)
    return data as CartaInstruccion | null
  }, [])

  const kpis = useMemo(() => ({
    total:     cartas.length,
    enviadas:  cartas.filter(c => c.status === 'enviada').length,
    procesadas: cartas.filter(c => c.status === 'procesada').length,
    canceladas: cartas.filter(c => c.status === 'cancelada').length,
  }), [cartas])

  return { cartas, loading, error, kpis, refetch: fetchCartas, create, update, remove, getById }
}

/** Hook ligero solo para contar pendientes (sirve para badge en sidebar). */
export function useCartasPendientesCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let cancelled = false
    supabase.from('cartas_instruccion')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'enviada')
      .then(({ count: c }) => { if (!cancelled) setCount(c ?? 0) })
    return () => { cancelled = true }
  }, [])
  return count
}
