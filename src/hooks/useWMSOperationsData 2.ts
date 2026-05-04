import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getExtensivInventoryByLocationAndCustomer } from '../lib/extensiv'

/*
  WMS Operations Dashboard aggregator — combines Extensiv (inventory + receivers)
  with Supabase (proformas, RCs, servicios adicionales, clients) to produce a
  single operational snapshot that doesn't exist in Extensiv natively.

  Caches result in sessionStorage for 30 minutes to avoid re-fetching on every
  page navigation.
*/

const CACHE_KEY = 'cedis.wmsOpsData.v1'
const CACHE_TS  = 'cedis.wmsOpsDataTs.v1'
const TTL_MS    = 30 * 60 * 1000     // 30 min

export interface ClientSummary {
  customerId: number
  customerName: string
  codigo: string | null
  positions: number
  totalUnits: number
}

export interface WMSOpsData {
  // Billing pipeline (current month)
  proformasPendientes: number
  proformasTotalMXN:   number
  rcEnProgreso:        number
  serviciosSinCobrar:  number

  // Inventory health
  totalClientesActivos: number
  clientesConInventario: number
  clientesSinStock:     number

  // Top 5 by positions this month
  topClientes: ClientSummary[]

  // Meta
  status:     'loading' | 'ready' | 'cache' | 'error'
  error:      string | null
  lastFetch:  Date | null
  fetchNow:   () => Promise<void>
}

interface CachedPayload {
  proformasPendientes:   number
  proformasTotalMXN:     number
  rcEnProgreso:          number
  serviciosSinCobrar:    number
  totalClientesActivos:  number
  clientesConInventario: number
  clientesSinStock:      number
  topClientes:           ClientSummary[]
}

function loadCache(): { payload: CachedPayload; ts: Date } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    const ts  = sessionStorage.getItem(CACHE_TS)
    if (!raw || !ts) return null
    return { payload: JSON.parse(raw), ts: new Date(ts) }
  } catch { return null }
}

function saveCache(payload: CachedPayload, ts: Date) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    sessionStorage.setItem(CACHE_TS, ts.toISOString())
  } catch { /* quota / disabled */ }
}

const EMPTY: CachedPayload = {
  proformasPendientes: 0,
  proformasTotalMXN: 0,
  rcEnProgreso: 0,
  serviciosSinCobrar: 0,
  totalClientesActivos: 0,
  clientesConInventario: 0,
  clientesSinStock: 0,
  topClientes: [],
}

export function useWMSOperationsData(): WMSOpsData {
  const cached = loadCache()
  const [data, setData] = useState<CachedPayload>(cached?.payload ?? EMPTY)
  const [status, setStatus] = useState<WMSOpsData['status']>(cached ? 'cache' : 'loading')
  const [lastFetch, setLastFetch] = useState<Date | null>(cached?.ts ?? null)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const fetchNow = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setStatus('loading')
    setError(null)
    try {
      const now = new Date()
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // 1. Clients (active only, with extensiv_customer_id)
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, codigo, extensiv_customer_id, is_active')
        .eq('is_active', true)
      const activeClients = (clients ?? []) as Array<{ id: string; name: string; codigo: string | null; extensiv_customer_id: number | null }>
      const clientByExtId = new Map<number, typeof activeClients[0]>()
      for (const c of activeClients) {
        if (c.extensiv_customer_id != null) clientByExtId.set(c.extensiv_customer_id, c)
      }

      // 2. Proformas this month (count + total)
      const { data: proformas } = await supabase
        .from('proformas')
        .select('cliente_codigo, total_mxn, estado, periodo')
        .eq('periodo', period)
      const proformaList = (proformas ?? []) as Array<{ cliente_codigo: string | null; total_mxn: number | null; estado: string | null; periodo: string | null }>
      const proformasPendientes = proformaList.filter(p => !p.estado || p.estado === 'pendiente' || p.estado === 'borrador').length
      const proformasTotalMXN   = proformaList.reduce((sum, p) => sum + (p.total_mxn || 0), 0)

      // 3. RCs in progress (status != 'cerrada')
      const { data: rcs } = await supabase
        .from('rcs')
        .select('id, estado')
        .neq('estado', 'cerrada')
      const rcEnProgreso = (rcs ?? []).length

      // 4. Servicios adicionales del mes (sin RC/proforma asociado)
      // Best-effort: all servicios de este periodo con estado='pendiente' o sin estado
      const { data: servicios } = await supabase
        .from('servicios_adicionales')
        .select('id, estado, fecha')
        .gte('fecha', `${period}-01`)
      const serviciosSinCobrar = ((servicios ?? []) as Array<{ estado: string | null }>)
        .filter(s => !s.estado || s.estado === 'pendiente').length

      // 5. Inventory snapshot from Extensiv
      const byLoc = await getExtensivInventoryByLocationAndCustomer()
      const clientStats = new Map<number, { positions: Set<string>; units: number }>()
      for (const [loc, occupants] of Object.entries(byLoc)) {
        for (const o of occupants) {
          if (!clientByExtId.has(o.customerId)) continue   // skip unregistered
          if (!clientStats.has(o.customerId)) {
            clientStats.set(o.customerId, { positions: new Set(), units: 0 })
          }
          clientStats.get(o.customerId)!.positions.add(loc)
          clientStats.get(o.customerId)!.units += o.units
        }
      }

      const clientesConInventario = clientStats.size
      const clientesSinStock = activeClients.length - clientesConInventario

      const topClientes: ClientSummary[] = Array.from(clientStats.entries())
        .map(([cid, s]) => {
          const c = clientByExtId.get(cid)!
          return {
            customerId:   cid,
            customerName: c.name,
            codigo:       c.codigo,
            positions:    s.positions.size,
            totalUnits:   s.units,
          }
        })
        .sort((a, b) => b.positions - a.positions)
        .slice(0, 5)

      const payload: CachedPayload = {
        proformasPendientes,
        proformasTotalMXN,
        rcEnProgreso,
        serviciosSinCobrar,
        totalClientesActivos: activeClients.length,
        clientesConInventario,
        clientesSinStock,
        topClientes,
      }

      setData(payload)
      setStatus('ready')
      setLastFetch(now)
      saveCache(payload, now)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[wms-ops]', msg)
      setError(msg)
      setStatus(data.totalClientesActivos > 0 ? 'cache' : 'error')
    } finally {
      inFlight.current = false
    }
  }, [data.totalClientesActivos])

  useEffect(() => {
    const stale = !lastFetch || (Date.now() - lastFetch.getTime()) > TTL_MS
    if (stale) fetchNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ...data, status, error, lastFetch, fetchNow }
}
