import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types/tasks'

export function useNotifications(userEmail: string | undefined) {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!userEmail) { setItems([]); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!error && data) setItems(data as Notification[])
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  useEffect(() => { reload() }, [reload])

  // Realtime subscription
  useEffect(() => {
    if (!userEmail) return
    const channel = supabase
      .channel(`notif:${userEmail}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_email=eq.${userEmail}` },
        payload => {
          const n = payload.new as Notification
          setItems(prev => [n, ...prev].slice(0, 30))
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userEmail])

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userEmail) return
    const stamp = new Date().toISOString()
    setItems(prev => prev.map(n => n.read_at ? n : { ...n, read_at: stamp }))
    await supabase
      .from('notifications')
      .update({ read_at: stamp })
      .eq('user_email', userEmail)
      .is('read_at', null)
  }, [userEmail])

  const unreadCount = items.filter(n => !n.read_at).length

  return { items, unreadCount, loading, reload, markRead, markAllRead }
}
