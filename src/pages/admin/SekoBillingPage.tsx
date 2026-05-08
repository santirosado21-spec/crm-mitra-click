import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, Loader2, RefreshCw, Search, Upload, ArrowDown, ArrowUp } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { useAuthContext } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Viaje } from '../../types/tms'
import type { GuiaPaqueteria, Paqueteria } from '../../types/guias'
import { PAQUETERIA_LABEL } from '../../types/guias'
import { useSekoMovements } from '../../hooks/useSekoMovements'
import { SekoImportModal } from './SekoImportModal'
import type { CreateSekoMovementData } from '../../types/seko'

const SEKO_CODES = ['BSF', 'KST', 'BB', 'LUL']

type ClientRow = {
  id: string
  name: string
  codigo: string | null
  extensiv_customer_id: number | null
}

type ChargeRow = {
  source_table: string
  source_id: string
  customer_id: number
  amount: number
  description: string
  reference_number: string
  charge_date: string
  status: 'pending' | 'sent' | 'failed' | 'voided'
  extensiv_charge_id: string | null
}

type BillingLine = {
  id: string
  fecha: string
  cliente: string
  codigo: string
  fuente: 'TMS' | 'Guía'
  referencia: string
  concepto: string
  origen: string
  destino: string
  costo: number
  precio: number
  margen: number
  estado: string
  billing: string
}

const fmtMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)
const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—'
  const [y, m, d] = s.slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : s
}
const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)

const notaValue = (notas: string | null | undefined, label: string) => {
  if (!notas) return ''
  const match = notas.match(new RegExp(`${label}:\\s*([^·]+)`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function matchClientFromViaje(viaje: Viaje, clients: ClientRow[]) {
  const raw = notaValue(viaje.notas, 'Cliente')
  const n = normalize(raw)
  if (!n) return null
  return clients.find(c => {
    const code = normalize(c.codigo ?? '')
    const name = normalize(c.name)
    return n === name || n === code || n.includes(name) || name.includes(n)
  }) ?? null
}

function exportSekoBillingXLSX(lines: BillingLine[], monthLabel: string, clientLabel: string) {
  const wb = XLSX.utils.book_new()
  const totalPrecio = lines.reduce((s, l) => s + l.precio, 0)
  const totalCosto = lines.reduce((s, l) => s + l.costo, 0)
  const totalMargen = totalPrecio - totalCosto

  const resumen = [
    ['Billing Seko 365 · Proforma SAC'],
    ['Periodo', monthLabel],
    ['Cliente', clientLabel],
    ['Generado', new Date().toLocaleString('es-MX')],
    [],
    ['Concepto', 'Importe'],
    ['Subtotal facturable', totalPrecio],
    ['Costo interno', totalCosto],
    ['Margen', totalMargen],
    ['IVA estimado 16%', totalPrecio * 0.16],
    ['Total proforma', totalPrecio * 1.16],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
  wsResumen['!cols'] = [{ wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen proforma')

  const detalle = [
    ['Fecha', 'Cliente', 'Código', 'Fuente', 'Referencia', 'Concepto', 'Origen', 'Destino', 'Costo', 'Precio', 'Margen', 'Estado', 'Billing'],
    ...lines.map(l => [
      l.fecha, l.cliente, l.codigo, l.fuente, l.referencia, l.concepto, l.origen, l.destino,
      l.costo, l.precio, l.margen, l.estado, l.billing,
    ]),
  ]
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalle)
  wsDetalle['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 42 },
    { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 22 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle facturable')

  const byClient = new Map<string, { viajes: number; guias: number; costo: number; precio: number }>()
  for (const l of lines) {
    const cur = byClient.get(l.cliente) ?? { viajes: 0, guias: 0, costo: 0, precio: 0 }
    if (l.fuente === 'TMS') cur.viajes += 1
    if (l.fuente === 'Guía') cur.guias += 1
    cur.costo += l.costo
    cur.precio += l.precio
    byClient.set(l.cliente, cur)
  }
  const wsClientes = XLSX.utils.aoa_to_sheet([
    ['Cliente', 'Viajes', 'Guías', 'Costo', 'Precio', 'Margen'],
    ...[...byClient.entries()].map(([cliente, v]) => [cliente, v.viajes, v.guias, v.costo, v.precio, v.precio - v.costo]),
  ])
  wsClientes['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsClientes, 'Resumen por cliente')

  const safe = `${clientLabel}_${monthLabel}`.replace(/[^\w-]+/g, '_')
  XLSX.writeFile(wb, `Billing_Seko365_${safe}.xlsx`)
}

export function SekoBillingPage() {
  const toast = useToast()
  const { user } = useAuthContext()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [clientFilter, setClientFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [lines, setLines] = useState<BillingLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  // Movimientos importados de los Excels de Seko 365 — filtrados por mes
  const fromDateMov = isoDay(startOfMonth(month))
  const toDateMov   = isoDay(endOfMonth(month))
  const sekoFilters = useMemo(
    () => ({ fechaDesde: fromDateMov, fechaHasta: toDateMov }),
    [fromDateMov, toDateMov],
  )
  const { movements, kpis: movKpis, bulkInsert, refetch: refetchMov } = useSekoMovements(sekoFilters)

  const fromDate = isoDay(startOfMonth(month))
  const toDate = isoDay(endOfMonth(month))
  const monthLabel = month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, codigo, extensiv_customer_id')
        .in('codigo', SEKO_CODES)
        .eq('is_active', true)
        .order('name')
      if (clientError) throw clientError

      const clientRows = (clientData ?? []) as ClientRow[]
      setClients(clientRows)
      const clientIds = clientRows.map(c => c.id)

      const [viajesRes, guiasRes, chargesRes] = await Promise.all([
        supabase
          .from('viajes')
          .select('*')
          .gte('fecha_programada', fromDate)
          .lte('fecha_programada', toDate)
          .order('fecha_programada', { ascending: false }),
        clientIds.length > 0
          ? supabase
            .from('guias_paqueteria')
            .select('*')
            .in('cliente_id', clientIds)
            .gte('fecha', fromDate)
            .lte('fecha', toDate)
            .order('fecha', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('extensiv_billing_log')
          .select('source_table, source_id, customer_id, amount, description, reference_number, charge_date, status, extensiv_charge_id')
          .gte('charge_date', fromDate)
          .lte('charge_date', toDate),
      ])

      if (viajesRes.error) throw viajesRes.error

      const charges = chargesRes.error ? [] : ((chargesRes.data ?? []) as ChargeRow[])
      const chargesBySource = new Map(charges.map(c => [`${c.source_table}:${c.source_id}`, c]))
      const clientById = new Map(clientRows.map(c => [c.id, c]))

      const viajeLines = ((viajesRes.data ?? []) as Viaje[])
        .map(v => ({ viaje: v, client: matchClientFromViaje(v, clientRows) }))
        .filter((x): x is { viaje: Viaje; client: ClientRow } => Boolean(x.client))
        .map(({ viaje, client }): BillingLine => {
          const charge = chargesBySource.get(`viajes:${viaje.id}`)
          const sent = charge?.status === 'sent'
          const billing = client.extensiv_customer_id
            ? (sent ? `Enviado Extensiv ${charge?.extensiv_charge_id ?? ''}` : 'Pendiente Extensiv')
            : 'Seko 365 · proforma SAC'
          return {
            id: `viaje-${viaje.id}`,
            fecha: viaje.fecha_programada ?? viaje.created_at?.slice(0, 10) ?? '',
            cliente: client.name,
            codigo: client.codigo ?? '',
            fuente: 'TMS',
            referencia: viaje.operacion_referencia ?? viaje.id.slice(0, 8),
            concepto: `Flete ${viaje.origen} -> ${viaje.destino}`,
            origen: viaje.origen,
            destino: viaje.destino,
            costo: Number(viaje.costo_total || 0),
            precio: Number(viaje.ingreso_cliente || 0),
            margen: Number(viaje.margen || 0),
            estado: viaje.estado,
            billing,
          }
        })

      const guiaRows = guiasRes.error ? [] : ((guiasRes.data ?? []) as GuiaPaqueteria[])
      const guiaLines = guiaRows
        .map((g): BillingLine | null => {
          const client = clientById.get(g.cliente_id)
          if (!client) return null
          return {
            id: `guia-${g.id}`,
            fecha: g.fecha,
            cliente: client.name,
            codigo: client.codigo ?? g.cliente_codigo ?? '',
            fuente: 'Guía',
            referencia: g.tracking_number,
            concepto: `Guía ${PAQUETERIA_LABEL[g.paqueteria as Paqueteria] ?? g.paqueteria}${g.manual_reference ? ' · ' + g.manual_reference : ''}`,
            origen: g.origen === 'extensiv' ? 'Extensiv' : 'Seko 365',
            destino: g.tracking_number,
            costo: Number(g.costo || 0),
            precio: Number(g.precio || 0),
            margen: Number(g.margen || 0),
            estado: 'registrada',
            billing: 'Seko 365 · proforma SAC',
          }
        })
        .filter((line): line is BillingLine => Boolean(line))

      setLines([...viajeLines, ...guiaLines].sort((a, b) => b.fecha.localeCompare(a.fecha)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando billing Seko 365')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [fromDate, toDate])

  const visibleLines = useMemo(() => {
    const q = normalize(search)
    return lines.filter(l => {
      if (clientFilter !== 'todos' && l.codigo !== clientFilter) return false
      if (!q) return true
      return normalize(`${l.cliente} ${l.codigo} ${l.fuente} ${l.referencia} ${l.concepto} ${l.origen} ${l.destino} ${l.billing}`).includes(q)
    })
  }, [lines, clientFilter, search])

  const kpis = useMemo(() => ({
    total: visibleLines.reduce((s, l) => s + l.precio, 0),
    costo: visibleLines.reduce((s, l) => s + l.costo, 0),
    margen: visibleLines.reduce((s, l) => s + l.margen, 0),
    viajes: visibleLines.filter(l => l.fuente === 'TMS').length,
    guias: visibleLines.filter(l => l.fuente === 'Guía').length,
  }), [visibleLines])

  const clientLabel = clientFilter === 'todos'
    ? 'BASF_KST_Burberry_Lululemon'
    : clients.find(c => c.codigo === clientFilter)?.name ?? clientFilter

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <FileSpreadsheet size={20} /> Billing Seko 365
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Admin / SAC · BASF, KST, Burberry y Lululemon · TMS + guías sin enviar a Extensiv
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                <button onClick={() => setMonth(addMonths(month, -1))} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Mes anterior">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-gray-700 min-w-[130px] text-center capitalize">{monthLabel}</span>
                <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Mes siguiente">
                  <ChevronRight size={14} />
                </button>
              </div>
              <button onClick={loadData} className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 inline-flex items-center justify-center gap-2 hover:bg-gray-50">
                <RefreshCw size={14} /> Recargar
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="h-10 px-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-emerald-100"
                title="Sube el Excel de movimientos que comparte el cliente Seko"
              >
                <Upload size={15} /> Importar Excel
              </button>
              <button
                onClick={() => {
                  exportSekoBillingXLSX(visibleLines, monthLabel, clientLabel)
                  toast.success('Proforma generada', `${visibleLines.length} conceptos exportados`)
                }}
                disabled={visibleLines.length === 0}
                className="h-10 px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download size={15} /> Proforma Excel
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
            <KPI label="Facturable" value={fmtMXN(kpis.total)} tone="blue" />
            <KPI label="Costo interno" value={fmtMXN(kpis.costo)} tone="red" />
            <KPI label="Margen" value={fmtMXN(kpis.margen)} tone="green" />
            <KPI label="Viajes TMS" value={String(kpis.viajes)} tone="slate" />
            <KPI label="Guías" value={String(kpis.guias)} tone="purple" />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-1 md:grid-cols-[1fr_180px] gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente, tracking, ruta, referencia..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1e3a5f]"
              />
            </div>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-[#1e3a5f]"
            >
              <option value="todos">Todos</option>
              {clients.map(c => <option key={c.id} value={c.codigo ?? ''}>{c.codigo} · {c.name}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Fuente</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-right">Costo</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Margen</th>
                    <th className="px-4 py-3 text-left">Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400"><Spinner size={18} /> <span className="ml-2">Cargando billing...</span></td></tr>
                  ) : visibleLines.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">Sin conceptos para este periodo.</td></tr>
                  ) : visibleLines.map(line => (
                    <tr key={line.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(line.fecha)}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-800">{line.cliente}</p>
                        <p className="text-[10px] text-gray-400">{line.codigo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${line.fuente === 'TMS' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {line.fuente}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[280px]">
                        <p className="text-xs font-semibold text-gray-800">{line.concepto}</p>
                        <p className="text-[10px] text-gray-400">{line.referencia} · {line.estado}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600">{fmtMXN(line.costo)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-[#1e3a5f]">{fmtMXN(line.precio)}</td>
                      <td className={`px-4 py-3 text-right text-xs font-semibold ${line.margen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtMXN(line.margen)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{line.billing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Movimientos importados de Excels Seko 365 ─── */}
          <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                  <FileSpreadsheet size={15} /> Movimientos importados de Seko ({movements.length})
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Movimientos del período tomados de los Excels que comparte el cliente Seko 365.
                  Eventualmente se empujan a Extensiv junto con los datos del TMS.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                  <ArrowDown size={11} /> {movKpis.entradas} entradas
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">
                  <ArrowUp size={11} /> {movKpis.salidas} salidas
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">
                  {movKpis.pendientes} sin facturar
                </span>
              </div>
            </div>
            {movements.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Sin movimientos importados. Click en "Importar Excel" arriba para subir el archivo de Seko.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[40vh]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-500 uppercase text-[10px]">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Referencia</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2">Origen</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                        <td className="px-3 py-1.5 whitespace-nowrap text-gray-600">{fmtDate(m.fecha)}</td>
                        <td className="px-3 py-1.5 text-gray-700 font-semibold">{m.cliente_codigo ?? '—'}</td>
                        <td className="px-3 py-1.5">
                          {m.tipo === 'entrada' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                              <ArrowDown size={10} /> Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                              <ArrowUp size={10} /> Salida
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px]">{m.referencia ?? '—'}</td>
                        <td className="px-3 py-1.5 font-mono text-[11px]">{m.sku ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{Number(m.cantidad).toLocaleString('es-MX')}</td>
                        <td className="px-3 py-1.5 text-[10px] text-gray-400 truncate max-w-[160px]" title={m.source_file ?? ''}>{m.source_file ?? '—'}</td>
                        <td className="px-3 py-1.5">
                          {m.billed
                            ? <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">Facturado</span>
                            : <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">Pendiente</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {loading && (
            <div className="fixed bottom-4 right-4 rounded-xl bg-white border border-gray-100 shadow-lg px-4 py-3 text-sm text-gray-500 inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Actualizando
            </div>
          )}
        </main>
      </div>

      <SekoImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        clientes={clients.map(c => ({ id: c.id, codigo: c.codigo ?? '', nombre: c.name }))}
        importedBy={user?.email ?? user?.name ?? null}
        onConfirm={async (rows: CreateSekoMovementData[], fileName: string) => {
          const inserted = await bulkInsert(rows)
          toast.success(
            `${inserted} movimientos importados`,
            `de ${fileName} — ya forman parte del histórico para el billing`,
          )
          await refetchMov()
        }}
      />
    </div>
  )
}

function KPI({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'red' | 'green' | 'slate' | 'purple' }) {
  const styles = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-100 bg-slate-50 text-slate-700',
    purple: 'border-purple-100 bg-purple-50 text-purple-700',
  }[tone]

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">{label}</p>
      <p className="text-lg font-black mt-1">{value}</p>
    </div>
  )
}
