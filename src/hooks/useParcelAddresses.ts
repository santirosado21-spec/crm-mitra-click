import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ParcelAddress, CreateParcelAddressData, AddressTipo } from '../types/techship'

// Libreta de direcciones de paquetería (remitentes y destinatarios).
export function useParcelAddresses(tipo?: AddressTipo) {
  const [addresses, setAddresses] = useState<ParcelAddress[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      let q = supabase
        .from('parcel_addresses')
        .select('*')
        .order('es_default', { ascending: false })
        .order('alias', { ascending: true })
      // 'ambos' sirve como sender y recipient.
      if (tipo) q = q.in('tipo', [tipo, 'ambos'])
      const { data, error: err } = await q
      if (err) throw err
      setAddresses((data ?? []) as ParcelAddress[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar direcciones')
    } finally {
      setLoading(false)
    }
  }, [tipo])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (data: CreateParcelAddressData): Promise<ParcelAddress> => {
    const { data: row, error: err } = await supabase
      .from('parcel_addresses').insert(data).select().single()
    if (err) throw new Error(err.message)
    await fetchAll()
    return row as ParcelAddress
  }, [fetchAll])

  const update = useCallback(async (id: string, data: Partial<CreateParcelAddressData>) => {
    const { error: err } = await supabase.from('parcel_addresses').update(data).eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAll()
  }, [fetchAll])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('parcel_addresses').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setAddresses(prev => prev.filter(a => a.id !== id))
  }, [])

  const defaultSender = addresses.find(a => a.es_default && (a.tipo === 'sender' || a.tipo === 'ambos'))
    ?? addresses.find(a => a.tipo === 'sender' || a.tipo === 'ambos')
    ?? null

  return { addresses, loading, error, defaultSender, refetch: fetchAll, create, update, remove }
}
