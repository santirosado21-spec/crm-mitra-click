import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Client } from '../types'

type ClientWithOps = Client & { operations?: { id: string; reference: string; date: string; status: string }[] }

export type CreateClientData = {
  name:          string
  contact_name?: string | null
  contact_email?:string | null
  contact_phone?:string | null
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      setClients((data ?? []) as Client[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const getClient = async (id: string): Promise<ClientWithOps> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*, operations(id, referencia, fecha, estado)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return data as ClientWithOps
  }

  const createClient = useCallback(async (input: CreateClientData): Promise<Client> => {
    const payload = {
      name:          input.name.trim(),
      contact_name:  input.contact_name ?? null,
      contact_email: input.contact_email ?? null,
      contact_phone: input.contact_phone ?? null,
      is_active:     true,
    }
    const { data, error } = await supabase
      .from('clients')
      .insert(payload)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const created = data as Client
    setClients(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created
  }, [])

  const updateClient = useCallback(async (id: string, patch: Partial<Client>): Promise<Client> => {
    const { data, error } = await supabase
      .from('clients')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = data as Client
    setClients(prev => prev.map(c => (c.id === id ? updated : c)))
    return updated
  }, [])

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('clients')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw new Error(error.message)
    setClients(prev => prev.filter(c => c.id !== id))
  }, [])

  return { clients, loading, error, getClients, getClient, createClient, updateClient, deleteClient }
}
