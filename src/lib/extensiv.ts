/**
 * Extensiv 3PL Warehouse Manager — client-side wrapper.
 *
 * All traffic goes through the Supabase Edge Function `extensiv-proxy`
 * (see supabase/functions/extensiv-proxy/index.ts). The browser never sees
 * the Extensiv credentials — they live as Supabase secrets on the server.
 *
 * Usage:
 *   const customers = await getExtensivCustomers()
 *   const stock = await getExtensivInventoryByCustomer(123)
 */

import { supabase } from './supabase'

const DEFAULT_CUSTOMER_ID = Number(import.meta.env.VITE_EXTENSIV_CUSTOMER_ID ?? 0)
const DEFAULT_FACILITY_ID = Number(import.meta.env.VITE_EXTENSIV_FACILITY_ID ?? 1)

/* ─── Public: proxy is always configured via Supabase ─────────────── */
export function isExtensivConfigured(): boolean {
  return true
}

export function getDefaultFacilityId(): number { return DEFAULT_FACILITY_ID }
export function getDefaultCustomerId(): number { return DEFAULT_CUSTOMER_ID }

/* ─── Types ────────────────────────────────────────────────────────── */
export interface ExtensivStockItem {
  sku:         string
  itemId:      number
  description: string
  onHand:      number
  available:   number
  allocated:   number
  onHold:      number
}

export interface ExtensivCustomer {
  id:   number
  name: string
}

export interface ExtensivOrder {
  id:        string
  reference: string
  type:      'INBOUND' | 'OUTBOUND'
  status:    string
  createdAt: string
}

/* ─── Proxy transport ──────────────────────────────────────────────── */
interface ProxyPayload {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path:   string
  query?: Record<string, string | number | boolean>
  body?:  unknown
}

async function callProxy<T>(payload: ProxyPayload): Promise<T> {
  const { data, error } = await supabase.functions.invoke('extensiv-proxy', {
    body: payload,
  })
  if (error) {
    throw new Error(`Extensiv proxy error: ${error.message}`)
  }
  return data as T
}

/* ─── Customers ────────────────────────────────────────────────────── */
export async function getExtensivCustomers(): Promise<ExtensivCustomer[]> {
  const CUSTOMER_REL = 'http://api.3plCentral.com/rels/customers/customer'
  const data = await callProxy<{
    _embedded?: Record<string, Array<{
      readOnly?:   { customerId: number; deactivated?: boolean }
      companyInfo?: { companyName?: string }
    }>>
  }>({
    method: 'GET',
    path:   '/customers',
    query:  { pgsiz: 500, includeinuse: 'True' },
  })

  const list = data._embedded?.[CUSTOMER_REL] ?? []
  return list
    .filter(c => !c.readOnly?.deactivated)
    .map(c => ({
      id:   c.readOnly?.customerId ?? 0,
      name: c.companyInfo?.companyName ?? '',
    }))
    .filter(c => c.id && c.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/* ─── Inventory: stock by customer ─────────────────────────────────── */
export async function getExtensivInventoryByCustomer(
  customerId: number,
  facilityId: number = DEFAULT_FACILITY_ID,
): Promise<ExtensivStockItem[]> {
  const allItems: ExtensivStockItem[] = []
  let page = 1
  const pageSize = 500

  while (true) {
    const data = await callProxy<{
      totalResults?: number
      _embedded?: { item?: Array<{
        itemIdentifier?: { sku: string; id: number }
        description?:    string
        onHand?:         number
        available?:      number
        isOnHold?:       boolean
      }> }
    }>({
      method: 'GET',
      path:   '/inventory/stockdetails',
      query: {
        pgsiz:      pageSize,
        pgnum:      page,
        customerid: customerId,
        facilityid: facilityId,
      },
    })

    const items = data._embedded?.item ?? []
    for (const item of items) {
      const sku = item.itemIdentifier?.sku?.toUpperCase()
      if (!sku) continue
      const existing = allItems.find(i => i.sku === sku)
      if (existing) {
        existing.onHand    += item.onHand    ?? 0
        existing.available += item.available ?? 0
        if (item.isOnHold) existing.onHold += item.onHand ?? 0
      } else {
        allItems.push({
          sku,
          itemId:      item.itemIdentifier?.id ?? 0,
          description: item.description ?? '',
          onHand:      item.onHand    ?? 0,
          available:   item.available  ?? 0,
          allocated:   0,
          onHold:      item.isOnHold ? (item.onHand ?? 0) : 0,
        })
      }
    }

    if (items.length < pageSize || allItems.length >= (data.totalResults ?? 0)) break
    page++
  }

  return allItems
}

/* ─── Stock summaries (facility-wide) ──────────────────────────────── */
export async function getExtensivStockSummaries(): Promise<ExtensivStockItem[]> {
  const data = await callProxy<{
    _embedded?: { item?: Array<{
      itemIdentifier?: { sku: string; id: number }
      onHand?:    number
      available?: number
      allocated?: number
      onHold?:    number
    }> }
  }>({
    method: 'GET',
    path:   '/inventory/stocksummaries',
    query:  { pgsiz: 500 },
  })

  return (data._embedded?.item ?? []).map(item => ({
    sku:         item.itemIdentifier?.sku?.toUpperCase() ?? '',
    itemId:      item.itemIdentifier?.id ?? 0,
    description: '',
    onHand:      item.onHand    ?? 0,
    available:   item.available ?? 0,
    allocated:   item.allocated ?? 0,
    onHold:      item.onHold    ?? 0,
  }))
}

/* ─── Daily activity stats (Dashboard) ────────────────────────────── */
export interface ExtensivDailyStats {
  date:          string   // ISO YYYY-MM-DD (local)
  ordersToday:   number
  ordersOpen:    number
  ordersClosed:  number
  receiversToday: number
}

export async function getExtensivDailyStats(date?: string): Promise<ExtensivDailyStats> {
  const d = date ?? new Date().toISOString().slice(0, 10)
  const countOnly = { pgsiz: 1, pgnum: 1 } as const

  const [ordersTotal, ordersOpen, receiversTotal] = await Promise.all([
    callProxy<{ totalResults?: number }>({
      method: 'GET',
      path:   '/orders',
      query:  { ...countOnly, rql: `ReadOnly.creationDate=ge=${d}` },
    }),
    callProxy<{ totalResults?: number }>({
      method: 'GET',
      path:   '/orders',
      query:  { ...countOnly, rql: `ReadOnly.creationDate=ge=${d};ReadOnly.isClosed==false` },
    }),
    callProxy<{ totalResults?: number }>({
      method: 'GET',
      path:   '/inventory/receivers',
      query:  { ...countOnly, rql: `ReadOnly.creationDate=ge=${d}` },
    }),
  ])

  const todayTotal = ordersTotal.totalResults ?? 0
  const open       = ordersOpen.totalResults  ?? 0
  return {
    date:           d,
    ordersToday:    todayTotal,
    ordersOpen:     open,
    ordersClosed:   Math.max(todayTotal - open, 0),
    receiversToday: receiversTotal.totalResults ?? 0,
  }
}

/* ─── Orders by customer + date range (for RC / Proformas) ────────── */
export interface ExtensivOrderDetail {
  orderId:       number
  referenceNum:  string
  poNum:         string
  customerName:  string
  facilityName:  string
  creationDate:  string
  status:        string
  isClosed:      boolean
  numUnits1:     number
  totalWeight:   number
  routingInfo?: {
    carrier?:   string
    shipTo?:    string
  }
}

export async function getExtensivOrdersByCustomer(
  customerId: number,
  from: string,
  to: string,
): Promise<ExtensivOrderDetail[]> {
  const allOrders: ExtensivOrderDetail[] = []
  let page = 1
  const pageSize = 100
  const ORDER_REL = 'http://api.3plCentral.com/rels/orders/order'
  const ITEM_REL  = 'http://api.3plCentral.com/rels/orders/item'

  while (true) {
    const rql = `ReadOnly.customerIdentifier.id==${customerId};ReadOnly.creationDate=ge=${from};ReadOnly.creationDate=le=${to}T23:59:59`
    const data = await callProxy<{
      totalResults?: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _embedded?: Record<string, any[]>
    }>({
      method: 'GET',
      path:   '/orders',
      query:  { pgsiz: pageSize, pgnum: page, rql, detail: 'All' },
    })

    const orders = data._embedded?.[ORDER_REL] ?? []
    for (const o of orders) {
      const ro = o.readOnly ?? {}
      // Sum qty from embedded order items (numUnits1 is often null)
      const items = o._embedded?.[ITEM_REL] ?? []
      const itemQty = items.reduce((s: number, it: { qty?: number }) => s + (it.qty ?? 0), 0)
      const itemWeight = items.reduce((s: number, it: { weightImperial?: number }) => s + (it.weightImperial ?? 0), 0)

      allOrders.push({
        orderId:      ro.orderId ?? 0,
        referenceNum: o.referenceNum ?? '',
        poNum:        o.poNum ?? '',
        customerName: '',
        facilityName: '',
        creationDate: ro.creationDate ?? '',
        status:       ro.isClosed ? 'Closed' : 'Open',
        isClosed:     ro.isClosed ?? false,
        numUnits1:    ro.numUnits1 ?? itemQty,
        totalWeight:  ro.totalWeight ?? o.totalWeight ?? itemWeight,
        routingInfo: {
          carrier: o.routingInfo?.carrier ?? '',
          shipTo:  o.routingInfo?.shipTo
            ? `${o.routingInfo.shipTo.companyName ?? ''}, ${o.routingInfo.shipTo.city ?? ''} ${o.routingInfo.shipTo.state ?? ''}`.trim()
            : '',
        },
      })
    }

    if (orders.length < pageSize || allOrders.length >= (data.totalResults ?? 0)) break
    page++
  }

  return allOrders
}

/* ─── Receivers (inbound) by customer + date range ───────────────── */
export interface ExtensivReceiverDetail {
  receiverId:    number
  referenceNum:  string
  poNum:         string
  creationDate:  string
  status:        string
  isClosed:      boolean
  numUnits1:     number
  totalWeight:   number
}

export async function getExtensivReceiversByCustomer(
  customerId: number,
  from: string,
  to: string,
): Promise<ExtensivReceiverDetail[]> {
  const allReceivers: ExtensivReceiverDetail[] = []
  let page = 1
  const pageSize = 100
  const RCV_REL  = 'http://api.3plCentral.com/rels/inventory/receiver'
  const ITEM_REL = 'http://api.3plCentral.com/rels/inventory/receiveritem'

  while (true) {
    const rql = `ReadOnly.customerIdentifier.id==${customerId};ReadOnly.creationDate=ge=${from};ReadOnly.creationDate=le=${to}T23:59:59`
    const data = await callProxy<{
      totalResults?: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _embedded?: Record<string, any[]>
    }>({
      method: 'GET',
      path:   '/inventory/receivers',
      query:  { pgsiz: pageSize, pgnum: page, rql, detail: 'All' },
    })

    const receivers = data._embedded?.[RCV_REL] ?? []
    for (const r of receivers) {
      const ro = r.readOnly ?? {}
      // Sum qty from embedded receiver items
      const items = r._embedded?.[ITEM_REL] ?? []
      const itemQty = items.reduce((s: number, it: { qty?: number }) => s + (it.qty ?? 0), 0)

      allReceivers.push({
        receiverId:   ro.receiverId ?? 0,
        referenceNum: r.referenceNum ?? '',
        poNum:        r.poNum ?? '',
        creationDate: ro.creationDate ?? '',
        status:       ro.isClosed ? 'Closed' : 'Open',
        isClosed:     ro.isClosed ?? false,
        numUnits1:    ro.numUnits1 ?? itemQty,
        totalWeight:  ro.totalWeight ?? 0,
      })
    }

    if (receivers.length < pageSize || allReceivers.length >= (data.totalResults ?? 0)) break
    page++
  }

  return allReceivers
}

/* ─── Warehouse Locations ──────────────────────────────────────────── */
export interface ExtensivLocation {
  locationId:         number
  locationIdentifier: string   // e.g. "MX-A-1-23"
  facilityId:         number
  deactivated:        boolean
}

export async function getExtensivLocations(
  facilityId: number = DEFAULT_FACILITY_ID,
): Promise<ExtensivLocation[]> {
  const allLocations: ExtensivLocation[] = []
  let page = 1
  const pageSize = 500

  while (true) {
    const data = await callProxy<{
      totalResults?: number
      _embedded?: { 'http://api.3plCentral.com/rels/locations/location'?: Array<{
        readOnly?: { locationId: number; facilityId: number; deactivated?: boolean }
        name?:     string
      }> }
    }>({
      method: 'GET',
      path:   '/locations',
      query:  { pgsiz: pageSize, pgnum: page, facilityid: facilityId },
    })

    const items = data._embedded?.['http://api.3plCentral.com/rels/locations/location'] ?? []
    for (const loc of items) {
      const id = loc.readOnly?.locationId
      const name = loc.name
      if (!id || !name) continue
      allLocations.push({
        locationId:         id,
        locationIdentifier: name,
        facilityId:         loc.readOnly?.facilityId ?? facilityId,
        deactivated:        loc.readOnly?.deactivated ?? false,
      })
    }

    if (items.length < pageSize || allLocations.length >= (data.totalResults ?? 0)) break
    page++
  }

  return allLocations
}

/*
  Raw inventory item shape from Extensiv /inventory endpoint.
  Only the fields we consume — other fields exist but are ignored.
*/
interface ExtensivInventoryItem {
  customerIdentifier?: { id?: number; name?: string }
  itemIdentifier?:     { sku?: string; id?: number }
  locationIdentifier?: { nameKey?: { name?: string }; id?: number }
  onHandQty?:          number
  availableQty?:       number
}

function getLocationName(item: ExtensivInventoryItem): string | undefined {
  return item.locationIdentifier?.nameKey?.name
}

/*
  Inventory grouped by location.
  Returns a map: locationIdentifier → total units in that bin.
  Uses /inventory endpoint (receive-item-level) and sums onHandQty per location.
*/
export async function getExtensivInventoryByLocation(
  _facilityId: number = DEFAULT_FACILITY_ID,
): Promise<Record<string, number>> {
  const byLocation: Record<string, number> = {}
  let page = 1
  const pageSize = 500

  while (true) {
    const data = await callProxy<{
      totalResults?: number
      _embedded?: { item?: ExtensivInventoryItem[] }
    }>({
      method: 'GET',
      path:   '/inventory',
      query:  { pgsiz: pageSize, pgnum: page },
    })

    const items = data._embedded?.item ?? []
    for (const item of items) {
      const locName = getLocationName(item)
      if (!locName) continue
      byLocation[locName] = (byLocation[locName] || 0) + (item.onHandQty ?? 0)
    }

    if (items.length < pageSize) break
    page++
  }

  return byLocation
}

/*
  Full inventory breakdown: for each location, list of customers occupying it.
  Returns: Record<locationIdentifier, Array<{ customerId, customerName, units }>>
*/
export interface LocationOccupant {
  customerId: number
  customerName: string
  units: number
}

export async function getExtensivInventoryByLocationAndCustomer(
  _facilityId: number = DEFAULT_FACILITY_ID,
): Promise<Record<string, LocationOccupant[]>> {
  const byLoc: Record<string, Record<number, { name: string; units: number }>> = {}
  let page = 1
  const pageSize = 500

  while (true) {
    const data = await callProxy<{
      totalResults?: number
      _embedded?: { item?: Array<ExtensivInventoryItem & { customerIdentifier?: { id?: number; name?: string } }> }
    }>({
      method: 'GET',
      path:   '/inventory',
      query:  { pgsiz: pageSize, pgnum: page },
    })

    const items = data._embedded?.item ?? []
    for (const item of items) {
      const locName = getLocationName(item)
      if (!locName) continue
      const cid = item.customerIdentifier?.id ?? 0
      const cname = item.customerIdentifier?.name ?? `Cliente ${cid}`
      const units = item.onHandQty ?? 0
      if (!byLoc[locName]) byLoc[locName] = {}
      if (!byLoc[locName][cid]) byLoc[locName][cid] = { name: cname, units: 0 }
      byLoc[locName][cid].units += units
    }

    if (items.length < pageSize) break
    page++
  }

  const result: Record<string, LocationOccupant[]> = {}
  for (const [loc, custMap] of Object.entries(byLoc)) {
    result[loc] = Object.entries(custMap)
      .map(([cid, info]) => ({
        customerId: Number(cid),
        customerName: info.name,
        units: info.units,
      }))
      .sort((a, b) => b.units - a.units)   // dominant customer first
  }
  return result
}

