import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { GuiaPaqueteria } from '../types/guias'

export type DateRangePreset = 'mtd' | 'l7' | 'l30' | 'custom'

export interface ShipmentProfileFilters {
  clientIds:   string[]
  carriers:    string[]
  range:       DateRangePreset
  customFrom?: string
  customTo?:   string
}

interface GuiaRow extends GuiaPaqueteria {
  clients?: { name: string } | null
}

export interface Bucket { label: string; value: number; secondary?: number }

function rangeBounds(f: ShipmentProfileFilters): { from: string; to: string } {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  if (f.range === 'custom') {
    return { from: f.customFrom ?? '2000-01-01', to: f.customTo ?? iso(today) }
  }
  if (f.range === 'mtd') {
    return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) }
  }
  const days = f.range === 'l7' ? 7 : 30
  const from = new Date(today); from.setDate(from.getDate() - days)
  return { from: iso(from), to: iso(today) }
}

function tally(rows: GuiaRow[], keyFn: (g: GuiaRow) => string, valFn?: (g: GuiaRow) => number): Bucket[] {
  const map = new Map<string, number>()
  for (const g of rows) {
    const k = keyFn(g) || '—'
    map.set(k, (map.get(k) ?? 0) + (valFn ? valFn(g) : 1))
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
}

const WEIGHT_BREAKS = [
  { label: '0–1 kg', max: 1 },
  { label: '1–5 kg', max: 5 },
  { label: '5–10 kg', max: 10 },
  { label: '10–20 kg', max: 20 },
  { label: '20+ kg', max: Infinity },
]

// Métricas analíticas del dashboard Shipment Profile.
export function useShipmentProfileMetrics(filters: ShipmentProfileFilters) {
  const [rows, setRows]       = useState<GuiaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const { from, to } = rangeBounds(filters)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      let q = supabase
        .from('guias_paqueteria')
        .select('*, clients(name)')
        .gte('fecha', from)
        .lte('fecha', to)
        .limit(5000)
      if (filters.clientIds.length > 0) q = q.in('cliente_id', filters.clientIds)
      if (filters.carriers.length > 0)  q = q.in('paqueteria', filters.carriers)
      const { data, error: err } = await q
      if (err) throw err
      setRows((data ?? []) as GuiaRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar métricas')
    } finally {
      setLoading(false)
    }
  }, [from, to, filters.clientIds, filters.carriers])

  useEffect(() => { fetchData() }, [fetchData])

  const metrics = useMemo(() => {
    const totalPackages = rows.length
    const totalPaid = rows.reduce((s, g) => s + (Number(g.precio) || 0), 0)
    const totalCost = rows.reduce((s, g) => s + (Number(g.costo)  || 0), 0)
    const avgCost = totalPackages > 0 ? totalCost / totalPackages : 0

    const weightBuckets: Bucket[] = WEIGHT_BREAKS.map(b => ({ label: b.label, value: 0 }))
    for (const g of rows) {
      const w = Number(g.weight_kg) || 0
      const idx = WEIGHT_BREAKS.findIndex(b => w <= b.max)
      if (idx >= 0) weightBuckets[idx].value++
    }

    return {
      totalPackages, totalPaid, totalCost, avgCost,
      byCarrier:        tally(rows, g => g.paqueteria),
      byService:        tally(rows, g => g.auto_pick_service ?? 'Sin servicio'),
      byCarrierAccount: tally(rows, g => g.billing_account ?? 'Sin cuenta'),
      byCountry:        tally(rows, g => g.to_country ?? 'MX'),
      byDestination:    tally(rows, g => g.to_postal_code ?? '—').slice(0, 10),
      costByCarrier:    tally(rows, g => g.paqueteria, g => Number(g.costo) || 0),
      paymentTerms:     tally(rows, g => g.origen === 'extensiv' ? 'Extensiv' : 'Manual'),
      marginByCarrier:  tally(rows, g => g.paqueteria, g => Number(g.margen) || 0),
      weightBreaks:     weightBuckets,
    }
  }, [rows])

  return { rows, loading, error, metrics, refetch: fetchData }
}
