import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getExtensivInventoryByLocationAndCustomer } from '../lib/extensiv'

/*
  Monthly Storage Calculator — auto-computes how much each client should be
  charged for storage in a given month, combining:
    1. Extensiv: which bins each client's inventory occupied
    2. Supabase warehouse_locations: physical dimensions (m², dimensions)
    3. Supabase tarifarios: each client's rate for "almacenaje"

  Supports three billing modes (defined in tarifarioConstants):
    - TARIMA        → count of unique positions × tarifa
    - M2            → sum of (width × length) across positions × tarifa
    - FIJO_MENSUAL  → flat monthly fee (ignores actual occupancy)

  Falls back gracefully if tariff is missing (marks as "sin tarifa").
*/

export interface StorageCalcRow {
  customerId:       number
  customerName:     string
  clienteCodigo:    string | null
  positions:        number                    // unique locations used
  totalM2:          number                    // sum of bin m² (useful for M2 billing)
  tariffUnit:       'TARIMA' | 'M2' | 'FIJO_MENSUAL' | null
  tariffRate:       number                    // MXN per unit
  tariffConcepto:   string | null
  storageMXN:       number                    // final calculated charge
  hasProforma:      boolean                   // has proforma for this month already
  proformaMXN:      number | null             // existing proforma total (for reconciliation)
  discrepancyPct:   number | null             // |expected - proforma| / expected
  note:             string | null             // "sin tarifa", "no inventory", etc.
}

export interface StorageCalcResult {
  year:        number
  month:       number
  rows:        StorageCalcRow[]
  totals:      { clients: number; expectedMXN: number; missingTariff: number }
  status:      'idle' | 'loading' | 'ready' | 'error'
  error:       string | null
  lastFetch:   Date | null
  fetchNow:    () => Promise<void>
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
export function monthName(m: number): string { return MONTH_NAMES[m - 1] ?? '?' }

interface SupabaseClient {
  id: string
  name: string
  codigo: string | null
  extensiv_customer_id: number | null
  is_active: boolean
}
interface SupabaseWarehouseLoc {
  ubicacion: string
  width: number | null
  length: number | null
}
interface SupabaseTarifa {
  cliente_codigo: string
  categoria: string
  concepto: string
  unidad: string
  precio: number
}
interface SupabaseProforma {
  cliente_codigo: string | null
  periodo: string | null         // 'YYYY-MM'
  total_mxn: number | null
}

export function useMonthlyStorageCalc(year: number, month: number): StorageCalcResult {
  const [rows, setRows] = useState<StorageCalcRow[]>([])
  const [status, setStatus] = useState<StorageCalcResult['status']>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const inFlight = useRef(false)

  const fetchNow = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setStatus('loading')
    setError(null)
    try {
      // 1. Load clients (only active, with extensiv_customer_id)
      const { data: clients, error: cErr } = await supabase
        .from('clients')
        .select('id, name, codigo, extensiv_customer_id, is_active')
        .eq('is_active', true)
      if (cErr) throw new Error('Error loading clients: ' + cErr.message)
      const activeClients = (clients ?? []) as SupabaseClient[]
      const clientByExtId = new Map<number, SupabaseClient>()
      for (const c of activeClients) {
        if (c.extensiv_customer_id != null) clientByExtId.set(c.extensiv_customer_id, c)
      }

      // 2. Load warehouse locations (for m² calculation)
      const { data: locs } = await supabase
        .from('warehouse_locations')
        .select('ubicacion, width, length')
      const locByName = new Map<string, SupabaseWarehouseLoc>()
      for (const l of (locs ?? []) as SupabaseWarehouseLoc[]) {
        locByName.set(l.ubicacion, l)
      }

      // 3. Load tarifarios (category = almacenaje, active only)
      const { data: tarifas } = await supabase
        .from('tarifarios')
        .select('cliente_codigo, categoria, concepto, unidad, precio')
        .eq('categoria', 'almacenaje')
        .eq('activo', true)
      const tarifaByCodigo = new Map<string, SupabaseTarifa>()
      for (const t of (tarifas ?? []) as SupabaseTarifa[]) {
        // Prefer FIJO_MENSUAL > M2 > TARIMA if multiple (last wins in current model)
        const existing = tarifaByCodigo.get(t.cliente_codigo)
        if (!existing) tarifaByCodigo.set(t.cliente_codigo, t)
      }

      // 4. Load existing proformas for reconciliation
      const period = `${year}-${String(month).padStart(2, '0')}`
      const { data: proformas } = await supabase
        .from('proformas')
        .select('cliente_codigo, periodo, total_mxn')
        .eq('periodo', period)
      const proformaByCodigo = new Map<string, number>()
      for (const p of (proformas ?? []) as SupabaseProforma[]) {
        if (p.cliente_codigo) {
          proformaByCodigo.set(p.cliente_codigo, (proformaByCodigo.get(p.cliente_codigo) || 0) + (p.total_mxn || 0))
        }
      }

      // 5. Pull inventory from Extensiv (location × customer breakdown)
      const byLocation = await getExtensivInventoryByLocationAndCustomer()

      // Build per-customer occupancy: { customerId → Set<locationName> }
      const locationsByCustomer = new Map<number, Set<string>>()
      for (const [loc, occupants] of Object.entries(byLocation)) {
        for (const o of occupants) {
          if (!locationsByCustomer.has(o.customerId)) locationsByCustomer.set(o.customerId, new Set())
          locationsByCustomer.get(o.customerId)!.add(loc)
        }
      }

      // 6. Build result rows for every active client (even if no inventory)
      const out: StorageCalcRow[] = []
      for (const client of activeClients) {
        const extId = client.extensiv_customer_id
        const locs = extId != null ? locationsByCustomer.get(extId) ?? new Set() : new Set<string>()
        const codigo = (client.codigo || '').trim()
        const tariff = codigo ? tarifaByCodigo.get(codigo) : undefined

        // Compute m² from warehouse_locations table
        let totalM2 = 0
        for (const locName of locs) {
          const l = locByName.get(locName)
          if (l?.width && l?.length) totalM2 += l.width * l.length
        }

        // Calculate charge based on tariff unit
        let storageMXN = 0
        let note: string | null = null
        if (!tariff) {
          note = 'Sin tarifa de almacenaje'
        } else {
          switch (tariff.unidad) {
            case 'TARIMA':
              storageMXN = locs.size * tariff.precio
              break
            case 'M2':
              storageMXN = totalM2 * tariff.precio
              break
            case 'FIJO_MENSUAL':
              storageMXN = tariff.precio
              break
            default:
              note = `Unidad desconocida: ${tariff.unidad}`
          }
        }
        if (locs.size === 0 && tariff?.unidad !== 'FIJO_MENSUAL') {
          note = note ?? 'Sin inventario este mes'
        }

        // Reconcile vs existing proforma
        const proformaMXN = codigo ? proformaByCodigo.get(codigo) ?? null : null
        let discrepancyPct: number | null = null
        if (proformaMXN !== null && storageMXN > 0) {
          discrepancyPct = Math.abs(storageMXN - proformaMXN) / storageMXN
        }

        out.push({
          customerId:     extId ?? 0,
          customerName:   client.name,
          clienteCodigo:  codigo || null,
          positions:      locs.size,
          totalM2:        Math.round(totalM2 * 100) / 100,
          tariffUnit:     (tariff?.unidad as StorageCalcRow['tariffUnit']) ?? null,
          tariffRate:     tariff?.precio ?? 0,
          tariffConcepto: tariff?.concepto ?? null,
          storageMXN:     Math.round(storageMXN * 100) / 100,
          hasProforma:    proformaMXN !== null,
          proformaMXN,
          discrepancyPct,
          note,
        })
      }

      // Sort by expected MXN descending
      out.sort((a, b) => b.storageMXN - a.storageMXN)

      setRows(out)
      setStatus('ready')
      setLastFetch(new Date())
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[storage-calc]', msg)
      setError(msg)
      setStatus('error')
    } finally {
      inFlight.current = false
    }
  }, [year, month])

  useEffect(() => {
    fetchNow()
  }, [fetchNow])

  const totals = {
    clients:        rows.filter(r => r.positions > 0).length,
    expectedMXN:    rows.reduce((sum, r) => sum + r.storageMXN, 0),
    missingTariff:  rows.filter(r => !r.tariffUnit).length,
  }

  return { year, month, rows, totals, status, error, lastFetch, fetchNow }
}
