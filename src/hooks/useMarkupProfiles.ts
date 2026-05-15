import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  MarkupProfile, MarkupProfileRule, CreateMarkupProfileData, CreateMarkupRuleData,
} from '../types/techship'

// CRUD de perfiles de markup + sus reglas. Carga ambas tablas a la vez para
// que el motor de markup tenga el contexto completo.
export function useMarkupProfiles() {
  const [profiles, setProfiles] = useState<MarkupProfile[]>([])
  const [rules, setRules]       = useState<MarkupProfileRule[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [pRes, rRes] = await Promise.all([
        supabase.from('markup_profiles').select('*').order('prioridad', { ascending: true }),
        supabase.from('markup_profile_rules').select('*').order('prioridad', { ascending: true }),
      ])
      if (pRes.error) throw pRes.error
      if (rRes.error) throw rRes.error
      setProfiles((pRes.data ?? []) as MarkupProfile[])
      setRules((rRes.data ?? []) as MarkupProfileRule[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar perfiles de markup')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const createProfile = useCallback(async (data: CreateMarkupProfileData): Promise<MarkupProfile> => {
    const { data: row, error: err } = await supabase
      .from('markup_profiles').insert(data).select().single()
    if (err) throw new Error(err.message)
    const p = row as MarkupProfile
    setProfiles(prev => [...prev, p])
    return p
  }, [])

  const updateProfile = useCallback(async (id: string, data: Partial<CreateMarkupProfileData>) => {
    const { data: row, error: err } = await supabase
      .from('markup_profiles').update(data).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setProfiles(prev => prev.map(p => p.id === id ? row as MarkupProfile : p))
  }, [])

  const removeProfile = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('markup_profiles').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setProfiles(prev => prev.filter(p => p.id !== id))
    setRules(prev => prev.filter(r => r.profile_id !== id))
  }, [])

  const saveRules = useCallback(async (profileId: string, newRules: CreateMarkupRuleData[]) => {
    // Estrategia simple: reemplaza todas las reglas del perfil.
    const del = await supabase.from('markup_profile_rules').delete().eq('profile_id', profileId)
    if (del.error) throw new Error(del.error.message)
    if (newRules.length > 0) {
      const ins = await supabase.from('markup_profile_rules')
        .insert(newRules.map(r => ({ ...r, profile_id: profileId })))
      if (ins.error) throw new Error(ins.error.message)
    }
    await fetchAll()
  }, [fetchAll])

  return {
    profiles, rules, loading, error, refetch: fetchAll,
    createProfile, updateProfile, removeProfile, saveRules,
  }
}
