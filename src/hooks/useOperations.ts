import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Operation, OperationStatus, OperationType } from '../types'

export type CreateOperationData = Omit<Operation, 'id' | 'referencia' | 'created_at'>
export type UpdateOperationData = Partial<Omit<Operation, 'id' | 'referencia' | 'created_at' | 'creado_por'>>

export interface OperationFilters {
  status?:     OperationStatus | ''
  tipo?:       OperationType | ''
  cliente?:    string
  search?:     string
  fechaDesde?: string
  fechaHasta?: string
}

// ── Reference generation ──────────────────────────────────────────────────────
async function nextReference(clienteCodigo: string): Promise<string> {
  const { count } = await supabase
    .from('operations')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_codigo', clienteCodigo)
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `SC${clienteCodigo}${seq}`
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useOperations(filters?: OperationFilters) {
  const [allOps,  setAllOps]  = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchOperations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('operations')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters?.status)     query = query.eq('estado', filters.status)
      if (filters?.tipo)       query = query.eq('tipo_operacion', filters.tipo)
      if (filters?.cliente)    query = query.eq('cliente_nombre', filters.cliente)
      if (filters?.fechaDesde) query = query.gte('fecha', filters.fechaDesde)
      if (filters?.fechaHasta) query = query.lte('fecha', filters.fechaHasta)
      if (filters?.search) {
        const q = filters.search
        query = query.or(
          `referencia.ilike.%${q}%,asunto_cliente.ilike.%${q}%,ref_cliente.ilike.%${q}%,cliente_nombre.ilike.%${q}%`
        )
      }

      const { data, error: err } = await query
      if (err) throw err
      setAllOps((data ?? []) as Operation[])
    } catch (e) {
      setAllOps([])
      setError(e instanceof Error ? e.message : 'Error al cargar operaciones')
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.tipo, filters?.cliente, filters?.fechaDesde, filters?.fechaHasta, filters?.search])

  useEffect(() => { fetchOperations() }, [fetchOperations])

  // Realtime: pick up new rows inserted by extensiv-webhook / extensiv-sync without a manual refresh.
  useEffect(() => {
    const channel = supabase
      .channel('operations-insert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'operations' },
        (payload) => {
          const op = payload.new as Operation
          setAllOps(prev => (prev.some(o => o.id === op.id) ? prev : [op, ...prev]))
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Client-side filtered view (para filtros que no se enviaron al servidor)
  const operations = allOps

  const getOperations = fetchOperations

  const createOperation = useCallback(async (data: CreateOperationData): Promise<Operation> => {
    const referencia = await nextReference(data.cliente_codigo)
    // Strip fields that may not exist in DB yet (pending migration)
    const { url_evidencias, url_pod, ...dbData } = data as CreateOperationData & { url_evidencias?: string; url_pod?: string }
    // Empty strings → null for date columns (Postgres date type rejects "")
    const DATE_FIELDS = ['fecha', 'fecha_envio_rc', 'fecha_envio_factura'] as const
    const sanitized: Record<string, unknown> = { ...dbData }
    for (const f of DATE_FIELDS) {
      if (sanitized[f] === '' || sanitized[f] === undefined) sanitized[f] = null
    }
    const newOp = {
      ...sanitized,
      referencia,
      created_at: new Date().toISOString(),
    }
    const { data: created, error: err } = await supabase
      .from('operations')
      .insert(newOp)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const op = created as Operation
    setAllOps(prev => [op, ...prev])
    return op
  }, [])

  const updateOperation = useCallback(async (id: string, data: UpdateOperationData): Promise<Operation> => {
    // Strip fields that may not exist in DB yet (pending migration)
    const { url_evidencias, url_pod, ...dbData } = data as UpdateOperationData & { url_evidencias?: string; url_pod?: string }
    const DATE_FIELDS = ['fecha_envio_rc', 'fecha_envio_factura', 'fecha'] as const
    const sanitized: Record<string, unknown> = { ...dbData }
    for (const f of DATE_FIELDS) {
      if (sanitized[f] === '') sanitized[f] = null
    }
    // Mark commercial fields as SAC-edited so the Extensiv sync/webhook never overwrites them.
    sanitized.sac_editado_at = new Date().toISOString()
    const { data: updated, error: err } = await supabase
      .from('operations')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const op = updated as Operation
    setAllOps(prev => prev.map(o => o.id === id ? op : o))
    return op
  }, [])

  const deleteOperation = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('operations')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    setAllOps(prev => prev.filter(o => o.id !== id))
  }, [])

  const getOperation = useCallback(async (id: string): Promise<Operation | undefined> => {
    const { data, error: err } = await supabase
      .from('operations')
      .select('*')
      .eq('id', id)
      .single()
    if (err) return undefined
    return data as Operation
  }, [])

  const stats = {
    total:      allOps.length,
    en_proceso: allOps.filter(o => o.estado === 'en_proceso').length,
    pendiente:  allOps.filter(o => o.estado === 'pendiente').length,
    cerrada:    allOps.filter(o => o.estado === 'cerrada').length,
    totalMXN:   allOps.reduce((s, o) => s + (o.costo_cliente || 0), 0),
  }

  return {
    operations,
    allOps,
    loading,
    error,
    stats,
    getOperations,
    getOperation,
    createOperation,
    updateOperation,
    deleteOperation,
  }
}
