import type { MitraData } from '../../domain'
import { addDays, localTodayKey } from '../../commercial/dates'
import type { MitraRepository } from '../repository'
import { mockMitraData } from '../mockData'
import { getSupabaseClient } from './client'
import { mapCommercialData, type CommercialRows } from './mapCommercialData'

/** 90 días del periodo más largo + 90 de su periodo de comparación. */
const HISTORY_DAYS = 180
const PAGE_SIZE = 1000

/** Lee todas las páginas de una consulta (PostgREST limita las filas por respuesta). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

/**
 * Datos comerciales desde Supabase (cargados ahí por las integraciones con el ERP,
 * Shopify y GA4). Requiere la sesión de un usuario activo en `app_users`; si no la hay,
 * lanza un error con el motivo y FallbackMitraRepository muestra los datos simulados.
 * El CRM sigue con datos simulados.
 */
export class SupabaseMitraRepository implements MitraRepository {
  async load(): Promise<MitraData> {
    const supabase = getSupabaseClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) throw new Error('Inicia sesión para ver los datos reales.')
    const { data: member, error: memberError } = await supabase.from('app_users').select('active').eq('user_id', user.id).maybeSingle()
    if (memberError) throw new Error(`No se pudo validar tu acceso: ${memberError.message}`)
    if (!member?.active) throw new Error(`La cuenta ${user.email ?? ''} no está autorizada. Pide que la den de alta en app_users.`)

    const asOf = localTodayKey()
    const since = addDays(asOf, -(HISTORY_DAYS - 1))

    const [reps, quotas, goals, products, inventory, clients, wholesaleOrders, retailOrders, quotes, traffic, syncRuns] = await Promise.all([
      fetchAll((from, to) => supabase.from('sales_reps').select('*').order('name').range(from, to)),
      fetchAll((from, to) => supabase.from('rep_monthly_quotas').select('*').gte('month', `${since.slice(0, 7)}-01`).range(from, to)),
      fetchAll((from, to) => supabase.from('business_goals').select('*').gte('month', `${since.slice(0, 7)}-01`).range(from, to)),
      fetchAll((from, to) => supabase.from('products').select('*').order('name').range(from, to)),
      fetchAll((from, to) => supabase.from('inventory_levels').select('*').range(from, to)),
      fetchAll((from, to) => supabase.from('clients').select('*').order('name').range(from, to)),
      fetchAll((from, to) => supabase.from('wholesale_orders').select('*, wholesale_order_lines(*)').gte('order_date', since).lte('order_date', asOf).order('order_date').range(from, to)),
      fetchAll((from, to) => supabase.from('retail_orders').select('*, retail_order_lines(*)').gte('order_date', since).lte('order_date', asOf).order('order_date').range(from, to)),
      fetchAll((from, to) => supabase.from('wholesale_quotes').select('*').gte('quote_date', since).lte('quote_date', asOf).order('quote_date').range(from, to)),
      fetchAll((from, to) => supabase.from('ecommerce_traffic_daily').select('*').gte('day', since).lte('day', asOf).order('day').range(from, to)),
      supabase.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(100).then(({ data, error }) => {
        if (error) throw new Error(error.message)
        return data ?? []
      }),
    ])

    const rows: CommercialRows = { reps, quotas, goals, products, inventory, clients, wholesaleOrders, retailOrders, quotes, traffic, syncRuns }
    return {
      ...structuredClone(mockMitraData),
      commercial: mapCommercialData(rows, { asOf, generatedAt: new Date().toISOString() }),
    }
  }
}
