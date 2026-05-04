import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Vehiculo } from '../types/tms'

export type CreateVehiculoData = Omit<Vehiculo, 'id' | 'created_at' | 'updated_at'>
export type UpdateVehiculoData = Partial<CreateVehiculoData>

export function useVehiculos(filtro?: { esPropio?: boolean; tipo?: string }) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVehiculos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('vehiculos')
        .select('*')
        .eq('activo', true)
        .order('tipo')
        .order('placa')

      if (filtro?.esPropio !== undefined) query = query.eq('es_propio', filtro.esPropio)
      if (filtro?.tipo) query = query.eq('tipo', filtro.tipo)

      const { data, error: err } = await query
      if (err) throw err
      setVehiculos((data ?? []) as Vehiculo[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar vehículos')
    } finally {
      setLoading(false)
    }
  }, [filtro?.esPropio, filtro?.tipo])

  useEffect(() => { fetchVehiculos() }, [fetchVehiculos])

  const findByClave = useCallback((clave: string) => {
    return vehiculos.find(v => v.clave === clave)
  }, [vehiculos])

  const createVehiculo = useCallback(async (data: CreateVehiculoData) => {
    const { data: created, error: err } = await supabase
      .from('vehiculos')
      .insert(data)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const v = created as Vehiculo
    setVehiculos(prev => [...prev, v])
    return v
  }, [])

  const updateVehiculo = useCallback(async (id: string, data: UpdateVehiculoData) => {
    const { data: updated, error: err } = await supabase
      .from('vehiculos')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const v = updated as Vehiculo
    setVehiculos(prev => prev.map(x => x.id === id ? v : x))
    return v
  }, [])

  const deleteVehiculo = useCallback(async (id: string) => {
    await updateVehiculo(id, { activo: false } as UpdateVehiculoData)
  }, [updateVehiculo])

  return { vehiculos, loading, error, fetchVehiculos, findByClave, createVehiculo, updateVehiculo, deleteVehiculo }
}
