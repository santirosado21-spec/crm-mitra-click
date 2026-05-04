import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/*
  ONE fetch per week. Both datasets derived from a single /inventory scan.
  Cached in localStorage for 7 days so page reloads / new tabs don't re-fetch.

  Bandwidth cost per full fetch (34 pages × 500 items):
    ~20 MB egress from Supabase Edge Functions
    Weekly auto-refresh = ~80 MB / month
    Supabase Pro (12 GB) = ~150 refreshes worth of headroom

  Reliability: each page is retried up to 3 times with exponential backoff.
  Partial success is accepted — a single 502 won't abort the whole sync.
*/

const CACHE_KEY_PROJECTED = 'cedis.warehouseProjected.v3'
const CACHE_KEY_TS        = 'cedis.warehouseTs.v3'

/*
  Safety blacklist: even if accidentally registered in WMS, these names
  are always excluded from the warehouse visualization.
  Case-insensitive substring match on the customer's display name.
*/
const BLACKLIST_PATTERNS = [
  /\btest\b/i,
  /\bprueba\b/i,
  /\(test\)/i,
  /\bangoco\b/i,
]

function isBlacklisted(name: string): boolean {
  return BLACKLIST_PATTERNS.some(re => re.test(name))
}
const WEEK_MS             = 7 * 24 * 60 * 60 * 1000
const MAX_UNITS_PER_BIN   = 100
const PAGE_SIZE           = 500
const MAX_PAGES           = 50
const MAX_RETRIES         = 3
const RETRY_BASE_MS       = 500
const THROTTLE_MS         = 150

export type WarehouseStatus = 'loading' | 'live' | 'cache' | 'error'

export interface LocationOccupant {
  customerId: number
  customerName: string
  units: number
}
export interface ClientSummary {
  customerId: number
  customerName: string
  totalUnits: number
  positions: string[]
  color: string
}

interface ProjectedData {
  occupancy: Record<string, number>
  byLocation: Record<string, LocationOccupant[]>
  clients: ClientSummary[]
  itemsFetched: number
  pagesSucceeded: number
  pagesFailed: number
}

export interface WarehouseData extends ProjectedData {
  status: WarehouseStatus
  lastFetch: Date | null
  error: string | null
  fetchNow: () => Promise<void>
}

const PALETTE = [
  '#1f3864', '#c8373c', '#2f7a4f', '#d68c2a', '#6b4a8f',
  '#0ea5e9', '#db2777', '#65a30d', '#ea580c', '#7c3aed',
  '#0891b2', '#a16207', '#4f46e5', '#be123c', '#059669',
]

interface RawItem {
  loc: string
  cid: number
  cname: string
  units: number
}

async function fetchPageWithRetry(page: number): Promise<{ items: unknown[]; total: number } | null> {
  let lastErr: unknown = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('extensiv-proxy', {
        body: { method: 'GET', path: '/inventory', query: { pgsiz: PAGE_SIZE, pgnum: page } },
      })
      if (error) throw new Error(error.message ?? String(error))
      const items = (data as { _embedded?: { item?: unknown[] } })?._embedded?.item ?? []
      const total = (data as { totalResults?: number })?.totalResults ?? 0
      return { items, total }
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      console.warn(`[extensiv] page ${page} attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt - 1)))
      }
    }
  }
  console.error(`[extensiv] page ${page} gave up after ${MAX_RETRIES} attempts:`, lastErr)
  return null
}

interface RegisteredClient {
  extensivId: number
  name: string
}

/*
  Loads the WMS "clients" catalog from Supabase.
  Only these registered, active clients will be included in the warehouse
  visualization — Extensiv's 39 customers include many inactive/test ones
  that shouldn't appear on the map.
*/
async function loadRegisteredClients(): Promise<Map<number, string>> {
  const { data, error } = await supabase
    .from('clients')
    .select('name, extensiv_customer_id, is_active')
    .eq('is_active', true)

  if (error) {
    console.warn('[extensiv] could not load registered clients:', error.message)
    return new Map()
  }

  const map = new Map<number, string>()
  for (const c of (data ?? []) as Array<{ name: string; extensiv_customer_id: number | null; is_active: boolean }>) {
    if (c.extensiv_customer_id != null && c.is_active) {
      map.set(c.extensiv_customer_id, c.name)
    }
  }
  console.log(`[extensiv] filter: ${map.size} registered active clients`)
  return map
}

async function fetchAllInventory(
  registered: Map<number, string>,
  onProgress: (page: number, totalPages: number, status: 'ok' | 'skipped') => void,
): Promise<{ items: RawItem[]; pagesSucceeded: number; pagesFailed: number; skippedUnregistered: number }> {
  const all: RawItem[] = []
  let page = 1
  let totalExpected = 0
  let pagesSucceeded = 0
  let pagesFailed = 0
  let skippedUnregistered = 0

  while (page <= MAX_PAGES) {
    const result = await fetchPageWithRetry(page)
    if (result === null) {
      pagesFailed++
      onProgress(page, Math.ceil(totalExpected / PAGE_SIZE) || page, 'skipped')
      page++
      await new Promise(r => setTimeout(r, THROTTLE_MS))
      continue
    }

    pagesSucceeded++
    if (totalExpected === 0) totalExpected = result.total
    const totalPages = Math.max(page, Math.ceil(totalExpected / PAGE_SIZE))
    onProgress(page, totalPages, 'ok')

    for (const raw of result.items) {
      const item = raw as {
        locationIdentifier?: { nameKey?: { name?: string } }
        customerIdentifier?: { id?: number; name?: string }
        onHandQty?: number
      }
      const loc = item.locationIdentifier?.nameKey?.name
      const cid = item.customerIdentifier?.id
      const extName = item.customerIdentifier?.name ?? ''
      if (!loc || cid == null) continue

      // Safety blacklist: never show obvious test clients on the map
      const registeredName = registered.get(cid)
      const displayName = registeredName ?? extName
      if (isBlacklisted(displayName)) {
        skippedUnregistered++
        continue
      }

      // Skip items from unregistered/inactive clients (they exist in Extensiv
      // but not in our WMS Clientes catalog).
      if (registered.size > 0 && !registeredName) {
        skippedUnregistered++
        continue
      }

      all.push({
        loc,
        cid,
        cname: displayName || 'Sin cliente',
        units: item.onHandQty ?? 0,
      })
    }

    if (result.items.length < PAGE_SIZE) break
    page++
    await new Promise(r => setTimeout(r, THROTTLE_MS))
  }

  return { items: all, pagesSucceeded, pagesFailed, skippedUnregistered }
}

function projectData(items: RawItem[], pagesSucceeded: number, pagesFailed: number): ProjectedData {
  const perLoc: Record<string, Record<number, { name: string; units: number }>> = {}
  const totalUnitsPerLoc: Record<string, number> = {}

  for (const it of items) {
    if (!perLoc[it.loc]) perLoc[it.loc] = {}
    if (!perLoc[it.loc][it.cid]) perLoc[it.loc][it.cid] = { name: it.cname, units: 0 }
    perLoc[it.loc][it.cid].units += it.units
    totalUnitsPerLoc[it.loc] = (totalUnitsPerLoc[it.loc] || 0) + it.units
  }

  const occupancy: Record<string, number> = {}
  for (const [loc, units] of Object.entries(totalUnitsPerLoc)) {
    occupancy[loc] = Math.min(1, units / MAX_UNITS_PER_BIN)
  }

  const byLocation: Record<string, LocationOccupant[]> = {}
  for (const [loc, custMap] of Object.entries(perLoc)) {
    byLocation[loc] = Object.entries(custMap)
      .map(([cid, info]) => ({ customerId: Number(cid), customerName: info.name, units: info.units }))
      .sort((a, b) => b.units - a.units)
  }

  const clientMap: Record<number, { name: string; total: number; positions: Set<string> }> = {}
  for (const [loc, occupants] of Object.entries(byLocation)) {
    for (const o of occupants) {
      if (!clientMap[o.customerId]) clientMap[o.customerId] = { name: o.customerName, total: 0, positions: new Set() }
      clientMap[o.customerId].total += o.units
      clientMap[o.customerId].positions.add(loc)
    }
  }
  const clients: ClientSummary[] = Object.entries(clientMap)
    .map(([cid, info], idx) => ({
      customerId: Number(cid),
      customerName: info.name,
      totalUnits: info.total,
      positions: Array.from(info.positions),
      color: PALETTE[idx % PALETTE.length],
    }))
    .sort((a, b) => b.positions.length - a.positions.length)

  return { occupancy, byLocation, clients, itemsFetched: items.length, pagesSucceeded, pagesFailed }
}

function loadCache(): { projected: ProjectedData; ts: Date } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PROJECTED)
    const ts  = localStorage.getItem(CACHE_KEY_TS)
    if (!raw || !ts) return null
    return { projected: JSON.parse(raw), ts: new Date(ts) }
  } catch {
    return null
  }
}

function saveCache(projected: ProjectedData, ts: Date) {
  try {
    localStorage.setItem(CACHE_KEY_PROJECTED, JSON.stringify(projected))
    localStorage.setItem(CACHE_KEY_TS, ts.toISOString())
  } catch (err) {
    console.warn('[extensiv] localStorage write failed:', err)
  }
}

const EMPTY_PROJECTED: ProjectedData = {
  occupancy: {}, byLocation: {}, clients: [], itemsFetched: 0, pagesSucceeded: 0, pagesFailed: 0,
}

export function useExtensivWarehouseData(): WarehouseData {
  const cached = loadCache()
  const [projected, setProjected] = useState<ProjectedData>(cached?.projected ?? EMPTY_PROJECTED)
  const [status, setStatus] = useState<WarehouseStatus>(cached ? 'cache' : 'loading')
  const [lastFetch, setLastFetch] = useState<Date | null>(cached?.ts ?? null)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const fetchNow = useCallback(async () => {
    if (inFlight.current) {
      console.log('[extensiv] fetch already in progress, skipping')
      return
    }
    inFlight.current = true
    setStatus('loading')
    setError(null)
    console.log('[extensiv] ━━━ starting weekly inventory sync ━━━')
    const startTime = Date.now()

    try {
      // Step 1: Load registered clients from WMS so we can filter Extensiv data
      const registered = await loadRegisteredClients()
      if (registered.size === 0) {
        console.warn('[extensiv] no registered clients in WMS clients table — proceeding without filter')
      }

      // Step 2: Fetch inventory and filter to registered clients only
      const { items, pagesSucceeded, pagesFailed, skippedUnregistered } = await fetchAllInventory(
        registered,
        (page, totalPages, stat) => {
          const icon = stat === 'ok' ? '✓' : '⚠'
          console.log(`[extensiv] ${icon} page ${page}/${totalPages}`)
        },
      )
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[extensiv] ━━━ sync done in ${elapsed}s · ${items.length} items kept · ${skippedUnregistered} skipped (unregistered) · ${pagesSucceeded} pages OK · ${pagesFailed} failed ━━━`)

      if (items.length === 0 && pagesFailed > 0) {
        throw new Error(`No se pudo obtener inventario (${pagesFailed} páginas fallaron)`)
      }

      const now = new Date()
      const newProjected = projectData(items, pagesSucceeded, pagesFailed)
      setProjected(newProjected)
      setLastFetch(now)
      setStatus('live')
      saveCache(newProjected, now)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[extensiv] sync failed:', msg)
      setError(msg)
      // Keep cached data if available, otherwise show error
      setStatus(projected.itemsFetched > 0 ? 'cache' : 'error')
    } finally {
      inFlight.current = false
    }
  }, [projected.itemsFetched])

  useEffect(() => {
    const stale = !lastFetch || (Date.now() - lastFetch.getTime()) > WEEK_MS
    if (stale) fetchNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    ...projected,
    status,
    lastFetch,
    error,
    fetchNow,
  }
}
