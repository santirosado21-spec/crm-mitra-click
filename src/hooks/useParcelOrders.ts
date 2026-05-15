import { useEffect, useState, useCallback, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { getActiveProviders } from '../lib/carriers/registry'
import type { GuiaPaqueteria, CreateGuiaData } from '../types/guias'
import type { RateInput } from '../lib/carriers/types'

// Una "orden" del TMS es una fila de guias_paqueteria. Las importadas viven
// con tracking_status='cotizado' hasta que se procesan (compra de etiqueta).
export interface ParcelOrder extends GuiaPaqueteria {
  clients?: { name: string } | null
}

export interface ProcessResult {
  ok:     number
  failed: number
  errors: string[]
}

export function useParcelOrders() {
  const [orders, setOrders]   = useState<ParcelOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('guias_paqueteria')
        .select('*, clients(name)')
        .order('created_at', { ascending: false })
        .limit(3000)
      if (err) throw err
      setOrders((data ?? []) as ParcelOrder[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar órdenes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  /** Inserta órdenes importadas. Devuelve la cantidad insertada. */
  const bulkInsert = useCallback(async (rows: CreateGuiaData[]): Promise<number> => {
    if (rows.length === 0) return 0
    const { data, error: err } = await supabase
      .from('guias_paqueteria')
      .insert(rows)
      .select('id')
    if (err) throw new Error(err.message)
    await fetchOrders()
    return (data ?? []).length
  }, [fetchOrders])

  const updateStatus = useCallback(async (ids: string[], status: GuiaPaqueteria['tracking_status']) => {
    if (ids.length === 0) return
    const { error: err } = await supabase
      .from('guias_paqueteria')
      .update({ tracking_status: status })
      .in('id', ids)
    if (err) throw new Error(err.message)
    await fetchOrders()
  }, [fetchOrders])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('guias_paqueteria').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setOrders(prev => prev.filter(o => o.id !== id))
  }, [])

  /**
   * Procesa órdenes: cotiza, compra etiqueta con el carrier de la orden (o el
   * más barato) y actualiza la guía con tracking + label_url. No falla en bloque:
   * acumula errores por orden.
   */
  const processAndPrint = useCallback(async (ids: string[]): Promise<ProcessResult> => {
    const result: ProcessResult = { ok: 0, failed: 0, errors: [] }
    if (ids.length === 0) return result
    const { clients } = await getActiveProviders()
    const targets = orders.filter(o => ids.includes(o.id))

    for (const order of targets) {
      try {
        const input: RateInput = {
          from: {
            name: 'Supply Chain MX', street1: 'Lerma', city: 'Lerma',
            state: 'México', postal_code: order.from_postal_code ?? '52000', country: 'MX',
          },
          to: {
            name: order.tracking_number ?? 'Destino', street1: '—', city: '—',
            state: '—', postal_code: order.to_postal_code ?? '00000',
            country: order.to_country ?? 'MX',
          },
          parcel: {
            weight_kg: Number(order.weight_kg) || 1,
            length_cm: Number(order.length_cm) || 30,
            width_cm:  Number(order.width_cm)  || 20,
            height_cm: Number(order.height_cm) || 10,
          },
        }
        let rates = (await Promise.all(clients.map(c => c.getRates(input).catch(() => [])))).flat()
        if (rates.length === 0) throw new Error('Sin tarifas disponibles')
        // Preferir el carrier ya asignado a la orden; si no, el más barato.
        const preferred = rates.filter(r => r.carrier === order.paqueteria)
        const pool = preferred.length > 0 ? preferred : rates
        const chosen = pool.sort((a, b) => a.price_mxn - b.price_mxn)[0]
        const provider = clients.find(c => c.name === chosen.provider)
        if (!provider) throw new Error('Provider no disponible')
        const label = await provider.buyLabel(chosen.rate_id, input)
        await supabase.from('guias_paqueteria').update({
          tracking_number: label.tracking_code || order.tracking_number,
          tracking_status: 'comprado',
          costo:           label.cost_mxn || chosen.price_mxn,
          label_url:       label.label_url,
          label_format:    label.label_format,
          provider:        label.provider,
          provider_shipment_id: label.provider_shipment_id ?? null,
          auto_pick_service: chosen.service,
        }).eq('id', order.id)
        result.ok++
      } catch (e) {
        result.failed++
        result.errors.push(`${order.tracking_number}: ${e instanceof Error ? e.message : 'error'}`)
      }
    }
    await fetchOrders()
    return result
  }, [orders, fetchOrders])

  const exportXlsx = useCallback((rows: ParcelOrder[]) => {
    const sheet = rows.map(o => ({
      'Trans ID':     o.id.slice(0, 8),
      'Order #':      o.manual_reference ?? '',
      'Cliente':      o.clients?.name ?? '',
      'Carrier':      o.paqueteria,
      'Service':      o.auto_pick_service ?? '',
      'Tracking #':   o.tracking_number,
      'Charge':       Number(o.precio) || 0,
      'Cost':         Number(o.costo) || 0,
      'Created On':   o.created_at?.slice(0, 10) ?? '',
      'Status':       o.tracking_status ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(sheet)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ordenes')
    XLSX.writeFile(wb, `ordenes_paqueteria_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [])

  const kpis = useMemo(() => ({
    total:      orders.length,
    cotizadas:  orders.filter(o => o.tracking_status === 'cotizado').length,
    compradas:  orders.filter(o => o.tracking_status === 'comprado').length,
    enTransito: orders.filter(o => o.tracking_status === 'en_transito').length,
    entregadas: orders.filter(o => o.tracking_status === 'entregado').length,
  }), [orders])

  return {
    orders, loading, error, kpis, refetch: fetchOrders,
    bulkInsert, updateStatus, remove, processAndPrint, exportXlsx,
  }
}
