import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { GuiaPaqueteria } from '../types/guias'
import type { Bucket } from './useShipmentProfileMetrics'

interface GuiaRow extends GuiaPaqueteria {
  clients?: { name: string } | null
}

export interface DeliveryFilters {
  clientIds: string[]
  carriers:  string[]
  days:      number          // ventana hacia atrás
}

const DAY_MS = 86_400_000

function addDays(iso: string, days: number): number {
  return new Date(iso).getTime() + days * DAY_MS
}

// SLA por guía. promised/actual/induction son fechas YYYY-MM-DD.
interface GuiaSLA {
  hasDelivery:     boolean
  onTime:          boolean
  delayed:         boolean
  hasInduction:    boolean
  onTimeInduction: boolean
  returned:        boolean
  inTransit:       boolean
  exception:       boolean
}

function evalSLA(g: GuiaRow): GuiaSLA {
  const promised = g.promised_delivery_date
  const actual   = g.actual_delivery_date
  const induction = g.induction_date
  const hasDelivery = !!(promised && actual)
  const onTime  = hasDelivery && new Date(actual!).getTime() <= new Date(promised!).getTime()
  const delayed = hasDelivery && new Date(actual!).getTime() >  new Date(promised!).getTime()
  const hasInduction = !!(induction && g.created_at)
  // Inducción a tiempo: induction <= created_at + 1 día.
  const onTimeInduction = hasInduction &&
    new Date(induction!).getTime() <= addDays(g.created_at, 1)
  return {
    hasDelivery, onTime, delayed, hasInduction, onTimeInduction,
    returned:  g.tracking_status === 'devuelto',
    inTransit: g.tracking_status === 'en_transito',
    exception: g.tracking_status === 'excepcion',
  }
}

export function useDeliveryPerformanceMetrics(filters: DeliveryFilters) {
  const [rows, setRows]       = useState<GuiaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const from = new Date(Date.now() - filters.days * DAY_MS).toISOString().slice(0, 10)
      let q = supabase
        .from('guias_paqueteria')
        .select('*, clients(name)')
        .gte('fecha', from)
        .limit(5000)
      if (filters.clientIds.length > 0) q = q.in('cliente_id', filters.clientIds)
      if (filters.carriers.length > 0)  q = q.in('paqueteria', filters.carriers)
      const { data, error: err } = await q
      if (err) throw err
      setRows((data ?? []) as GuiaRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar desempeño')
    } finally {
      setLoading(false)
    }
  }, [filters.days, filters.clientIds, filters.carriers])

  useEffect(() => { fetchData() }, [fetchData])

  const metrics = useMemo(() => {
    let onTime = 0, delayed = 0, deliveries = 0
    let onTimeInduction = 0, inductions = 0
    let returned = 0, inTransit = 0, exception = 0

    // Agregado por cliente.
    const byClientMap = new Map<string, { onTime: number; induction: number; delayed: number; returned: number }>()

    for (const g of rows) {
      const sla = evalSLA(g)
      if (sla.hasDelivery) {
        deliveries++
        if (sla.onTime) onTime++
        if (sla.delayed) delayed++
      }
      if (sla.hasInduction) {
        inductions++
        if (sla.onTimeInduction) onTimeInduction++
      }
      if (sla.returned)  returned++
      if (sla.inTransit) inTransit++
      if (sla.exception) exception++

      const cname = g.clients?.name ?? g.cliente_codigo ?? '—'
      const bucket = byClientMap.get(cname) ?? { onTime: 0, induction: 0, delayed: 0, returned: 0 }
      if (sla.onTime) bucket.onTime++
      if (sla.onTimeInduction) bucket.induction++
      if (sla.delayed) bucket.delayed++
      if (sla.returned) bucket.returned++
      byClientMap.set(cname, bucket)
    }

    const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0
    const clientEntries = [...byClientMap.entries()]

    const toBuckets = (key: 'onTime' | 'induction' | 'delayed' | 'returned'): Bucket[] =>
      clientEntries
        .map(([label, v]) => ({ label, value: v[key] }))
        .filter(b => b.value > 0)
        .sort((a, b) => b.value - a.value)

    return {
      onTimeDeliveryPct:  pct(onTime, deliveries),
      onTimeInductionPct: pct(onTimeInduction, inductions),
      performancePct:     pct(onTime, deliveries + delayed),
      delayed, returned, inTransit, exception,
      deliveries,
      onTimeDeliveryByClient:  toBuckets('onTime'),
      onTimeInductionByClient: toBuckets('induction'),
      delayedByClient:         toBuckets('delayed'),
      returnedByClient:        toBuckets('returned'),
    }
  }, [rows])

  const exceptions = useMemo(
    () => rows.filter(g => g.tracking_status === 'excepcion' || g.tracking_status === 'devuelto'),
    [rows],
  )
  const inTransitRows = useMemo(
    () => rows.filter(g => g.tracking_status === 'en_transito'),
    [rows],
  )

  return { rows, loading, error, metrics, exceptions, inTransitRows, refetch: fetchData }
}
