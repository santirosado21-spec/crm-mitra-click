import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  ShippingRule, CreateShippingRuleInput, UpdateShippingRuleInput,
} from '../types/shippingRules'

export function useShippingRules() {
  const [rules, setRules]     = useState<ShippingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('shipping_rules')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
      if (err) throw err
      setRules((data ?? []) as ShippingRule[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar reglas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const create = useCallback(async (input: CreateShippingRuleInput): Promise<ShippingRule> => {
    const { data, error: err } = await supabase
      .from('shipping_rules').insert(input).select().single()
    if (err) throw new Error(err.message)
    const row = data as ShippingRule
    setRules(prev => [...prev, row].sort((a, b) => a.priority - b.priority))
    return row
  }, [])

  const update = useCallback(async (id: string, input: UpdateShippingRuleInput): Promise<ShippingRule> => {
    const { data, error: err } = await supabase
      .from('shipping_rules').update(input).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    const row = data as ShippingRule
    setRules(prev => prev.map(r => r.id === id ? row : r).sort((a, b) => a.priority - b.priority))
    return row
  }, [])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('shipping_rules').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setRules(prev => prev.filter(r => r.id !== id))
  }, [])

  return { rules, loading, error, refetch: fetchAll, create, update, remove }
}
