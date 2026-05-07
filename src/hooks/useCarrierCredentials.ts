import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type CarrierProviderName =
  | 'easypost' | 'skydropx'
  | 'direct_dhl' | 'direct_ups' | 'direct_fedex' | 'direct_estafeta'

export interface CarrierCredential {
  id:             string
  provider:       CarrierProviderName
  api_key:        string | null
  api_secret:     string | null
  account_id:     string | null
  base_url:       string | null
  test_mode:      boolean
  active:         boolean
  last_check_ok:  boolean | null
  last_check_at:  string | null
  notas:          string
  created_at:     string
  updated_at:     string
}

export type UpsertCarrierCredentialInput = Omit<
  CarrierCredential,
  'id' | 'last_check_ok' | 'last_check_at' | 'created_at' | 'updated_at'
>

export function useCarrierCredentials() {
  const [credentials, setCredentials] = useState<CarrierCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('carrier_credentials')
        .select('*')
        .order('provider', { ascending: true })
      if (err) throw err
      setCredentials((data ?? []) as CarrierCredential[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar credenciales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const upsert = useCallback(async (input: UpsertCarrierCredentialInput): Promise<CarrierCredential> => {
    const { data, error: err } = await supabase
      .from('carrier_credentials')
      .upsert(input, { onConflict: 'provider' })
      .select()
      .single()
    if (err) throw new Error(err.message)
    const row = data as CarrierCredential
    setCredentials(prev => {
      const idx = prev.findIndex(c => c.provider === row.provider)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = row; return next
      }
      return [...prev, row]
    })
    return row
  }, [])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('carrier_credentials').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setCredentials(prev => prev.filter(c => c.id !== id))
  }, [])

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    const { data, error: err } = await supabase
      .from('carrier_credentials')
      .update({ active })
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    const row = data as CarrierCredential
    setCredentials(prev => prev.map(c => c.id === id ? row : c))
  }, [])

  return { credentials, loading, error, refetch: fetchAll, upsert, remove, toggleActive }
}
