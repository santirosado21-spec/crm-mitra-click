import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Operador } from '../types/tms'
import { BASE_TMS_PERSONAL, mergeBaseOperadores } from '../lib/tmsCatalog'

export type CreateOperadorData = Omit<Operador, 'id' | 'created_at' | 'updated_at'>
export type UpdateOperadorData = Partial<CreateOperadorData>

export function useOperadores(filtro?: { esPropio?: boolean }) {
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOperadores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('operadores')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (filtro?.esPropio !== undefined) query = query.eq('es_propio', filtro.esPropio)

      const { data, error: err } = await query
      if (err) throw err
      let rows = (data ?? []) as Operador[]

      const missing = BASE_TMS_PERSONAL.filter(item =>
        !rows.some(o => o.nombre.toLowerCase() === item.nombre.toLowerCase())
      )

      if (missing.length > 0 && filtro?.esPropio !== false) {
        const { data: inserted } = await supabase
          .from('operadores')
          .insert(missing.map(item => ({
            nombre: item.nombre,
            es_propio: true,
            sueldo_diario: 420,
            notas: item.notas,
            activo: true,
          })))
          .select('*')

        if (inserted?.length) {
          rows = [...rows, ...(inserted as Operador[])]
        }
      }

      setOperadores(filtro?.esPropio === false ? rows : mergeBaseOperadores(rows))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar operadores')
      setOperadores(filtro?.esPropio === false ? [] : mergeBaseOperadores([]))
    } finally {
      setLoading(false)
    }
  }, [filtro?.esPropio])

  useEffect(() => { fetchOperadores() }, [fetchOperadores])

  const createOperador = useCallback(async (data: CreateOperadorData) => {
    const { data: created, error: err } = await supabase
      .from('operadores')
      .insert(data)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const o = created as Operador
    setOperadores(prev => [...prev, o])
    return o
  }, [])

  const updateOperador = useCallback(async (id: string, data: UpdateOperadorData) => {
    const { data: updated, error: err } = await supabase
      .from('operadores')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const o = updated as Operador
    setOperadores(prev => prev.map(x => x.id === id ? o : x))
    return o
  }, [])

  const deleteOperador = useCallback(async (id: string) => {
    await updateOperador(id, { activo: false } as UpdateOperadorData)
  }, [updateOperador])

  return { operadores, loading, error, fetchOperadores, createOperador, updateOperador, deleteOperador }
}
