import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Tipos de tarifa
export interface Tarifa {
  id: string
  cliente_id: string | null
  cliente_codigo: string
  categoria: string
  concepto: string
  unidad: string
  precio: number
  moneda: 'MXN' | 'USD'
  notas: string
  activo: boolean
  created_at: string
  updated_at: string
}

export type CreateTarifaData = Omit<Tarifa, 'id' | 'activo' | 'created_at' | 'updated_at'>
export type UpdateTarifaData = Partial<Omit<Tarifa, 'id' | 'created_at'>>

export function useTarifarios() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obtener tarifas de un cliente
  const getTarifasByCliente = useCallback(async (clienteCodigo: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tarifarios')
        .select('*')
        .eq('cliente_codigo', clienteCodigo)
        .eq('activo', true)
        .order('categoria')
        .order('concepto')

      if (err) throw err
      setTarifas((data ?? []) as Tarifa[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar tarifas')
      setTarifas([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Buscar tarifa específica para auto-cálculo en servicios
  const getTarifaByConcepto = useCallback(async (
    clienteCodigo: string,
    concepto: string
  ): Promise<Tarifa | null> => {
    const { data, error: err } = await supabase
      .from('tarifarios')
      .select('*')
      .eq('cliente_codigo', clienteCodigo)
      .eq('concepto', concepto)
      .eq('activo', true)
      .limit(1)
      .single()

    if (err || !data) return null
    return data as Tarifa
  }, [])

  // Crear nueva tarifa
  const createTarifa = useCallback(async (input: CreateTarifaData): Promise<Tarifa> => {
    const { data, error: err } = await supabase
      .from('tarifarios')
      .insert({ ...input, activo: true })
      .select()
      .single()

    if (err) throw new Error(err.message)
    const tarifa = data as Tarifa
    setTarifas(prev => [...prev, tarifa])
    return tarifa
  }, [])

  // Actualizar tarifa
  const updateTarifa = useCallback(async (id: string, input: UpdateTarifaData): Promise<Tarifa> => {
    const { data, error: err } = await supabase
      .from('tarifarios')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (err) throw new Error(err.message)
    const tarifa = data as Tarifa
    setTarifas(prev => prev.map(t => t.id === id ? tarifa : t))
    return tarifa
  }, [])

  // Eliminar tarifa (soft delete)
  const deleteTarifa = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('tarifarios')
      .update({ activo: false })
      .eq('id', id)

    if (err) throw new Error(err.message)
    setTarifas(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    tarifas,
    loading,
    error,
    getTarifasByCliente,
    getTarifaByConcepto,
    createTarifa,
    updateTarifa,
    deleteTarifa,
  }
}
