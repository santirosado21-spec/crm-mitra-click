import { useEffect, useMemo, useState } from 'react'
import {
  Package, Plus, Search, X, Download, Trash2, AlertCircle, DollarSign, TrendingUp, Sparkles,
} from 'lucide-react'
import { CotizarShipmentModal } from './CotizarShipmentModal'
import * as XLSX from 'xlsx'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { useAuthContext } from '../../context/AuthContext'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { useGuiasPaqueteria } from '../../hooks/useGuiasPaqueteria'
import { ExtensivOperationPicker } from '../../components/features/ExtensivOperationPicker'
import type { ExtensivPickResult } from '../../lib/extensiv'
import { supabase } from '../../lib/supabase'
import {
  PAQUETERIA_LABEL, PAQUETERIA_COLOR,
  type Paqueteria, type GuiaOrigen, type GuiaFilters, type GuiaPaqueteria, type CreateGuiaData,
  type CarrierProvider, type TrackingStatus, type RouteStop,
} from '../../types/guias'

const STATUS_LABEL: Record<TrackingStatus, string> = {
  cotizado:    'Cotizado',
  comprado:    'Comprado',
  en_transito: 'En tránsito',
  entregado:   'Entregado',
  excepcion:   'Excepción',
  devuelto:    'Devuelto',
}
const STATUS_COLOR: Record<TrackingStatus, string> = {
  cotizado:    '#94a3b8',
  comprado:    '#1e3a5f',
  en_transito: '#0ea5e9',
  entregado:   '#28a745',
  excepcion:   '#dc3545',
  devuelto:    '#f59e0b',
}

const PAQUETERIAS: Paqueteria[] = ['estafeta', 'ups', 'fedex', 'dhl', 'castores']
const fmtMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })

function defaultMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { fechaDesde: iso(first), fechaHasta: iso(now) }
}

export function GuiasPaqueteriaPage() {
  const toast = useToast()
  const { user } = useAuthContext()
  const { clientes } = useClientCatalog()

  const [filters, setFilters] = useState<GuiaFilters>(() => ({ ...defaultMonthRange() }))
  const { guias, loading, error, kpis, create, remove } = useGuiasPaqueteria(filters)

  const [showForm, setShowForm] = useState(false)
  const [showCotizar, setShowCotizar] = useState(false)

  const clienteById = useMemo(() => {
    const m = new Map<string, { codigo: string; nombre: string; extensiv_customer_id?: number | null }>()
    for (const c of clientes) m.set(c.id, c)
    return m
  }, [clientes])

  const handleDelete = async (g: GuiaPaqueteria) => {
    if (!confirm(`Eliminar guía ${g.tracking_number}?`)) return
    try {
      await remove(g.id)
      toast.success('Guía eliminada')
    } catch (e) {
      toast.error('No se pudo eliminar', e instanceof Error ? e.message : 'Error')
    }
  }

  const handleExportExcel = () => {
    if (guias.length === 0) {
      toast.error('No hay guías para exportar')
      return
    }
    const header = ['Fecha', 'Paquetería', 'Tracking', 'Cliente', 'Costo', 'Precio', 'Margen', 'Origen', 'Referencia', 'Notas']
    const rows = guias.map(g => [
      g.fecha,
      PAQUETERIA_LABEL[g.paqueteria],
      g.tracking_number,
      clienteById.get(g.cliente_id)?.nombre ?? g.cliente_codigo ?? '',
      Number(g.costo),
      Number(g.precio),
      Number(g.margen),
      g.origen === 'extensiv' ? 'Extensiv' : 'Manual',
      g.origen === 'extensiv' ? `${g.extensiv_transaction_type}:${g.extensiv_transaction_id}` : (g.manual_reference ?? ''),
      g.notas ?? '',
    ])
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 28 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Guías paquetería')
    XLSX.writeFile(wb, `guias_paqueteria_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Excel descargado')
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <Package size={20} /> Guías de paquetería
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                SAC · Captura de costo y precio por paquetería · Liga a Extensiv o referencia manual (Seko 365 / PT)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 inline-flex items-center gap-1.5 hover:bg-gray-50"
              >
                <Download size={14} /> Excel
              </button>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 inline-flex items-center gap-1.5 hover:bg-gray-50"
                title="Captura una guía generada fuera del sistema (manual)"
              >
                <Plus size={14} /> Captura manual
              </button>
              <button
                type="button"
                onClick={() => setShowCotizar(true)}
                className="h-10 px-4 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2 shadow-sm"
                style={{ background: 'var(--brand-navy)' }}
                title="Cotiza con todas las paqueterías y compra la mejor opción"
              >
                <Sparkles size={16} /> Cotizar y comprar
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KPI title="Guías" value={String(kpis.numGuias)} color="#1e3a5f" icon={<Package size={14} />} />
            <KPI title="Costo total" value={fmtMXN(kpis.totalCosto)} color="#dc3545" icon={<DollarSign size={14} />} />
            <KPI title="Precio total" value={fmtMXN(kpis.totalPrecio)} color="#28a745" icon={<DollarSign size={14} />} />
            <KPI title="Margen" value={fmtMXN(kpis.totalMargen)} color="#7c3aed" icon={<TrendingUp size={14} />} />
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Tracking, ref, código…"
                value={filters.search ?? ''}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
              />
            </div>
            <select
              value={filters.clienteId ?? ''}
              onChange={e => setFilters(f => ({ ...f, clienteId: e.target.value || undefined }))}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] outline-none"
            >
              <option value="">Todos los clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select
              value={filters.paqueteria ?? ''}
              onChange={e => setFilters(f => ({ ...f, paqueteria: (e.target.value || undefined) as Paqueteria | undefined }))}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] outline-none"
            >
              <option value="">Todas las paqueterías</option>
              {PAQUETERIAS.map(p => <option key={p} value={p}>{PAQUETERIA_LABEL[p]}</option>)}
            </select>
            <select
              value={filters.origen ?? ''}
              onChange={e => setFilters(f => ({ ...f, origen: (e.target.value || undefined) as GuiaOrigen | undefined }))}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] outline-none"
            >
              <option value="">Todos los orígenes</option>
              <option value="extensiv">Extensiv</option>
              <option value="manual">Manual (Seko / PT)</option>
            </select>
            <select
              value={filters.provider ?? ''}
              onChange={e => setFilters(f => ({ ...f, provider: (e.target.value || undefined) as CarrierProvider | undefined }))}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] outline-none"
            >
              <option value="">Todos los providers</option>
              <option value="manual">Manual / Mock</option>
              <option value="easypost">EasyPost</option>
              <option value="skydropx">Skydropx</option>
              <option value="direct_dhl">DHL directo</option>
              <option value="direct_ups">UPS directo</option>
              <option value="direct_fedex">FedEx directo</option>
              <option value="direct_estafeta">Estafeta directo</option>
            </select>
            <select
              value={filters.trackingStatus ?? ''}
              onChange={e => setFilters(f => ({ ...f, trackingStatus: (e.target.value || undefined) as TrackingStatus | undefined }))}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="cotizado">Cotizado</option>
              <option value="comprado">Comprado</option>
              <option value="en_transito">En tránsito</option>
              <option value="entregado">Entregado</option>
              <option value="excepcion">Excepción</option>
              <option value="devuelto">Devuelto</option>
            </select>
            <select
              value={filters.isLocal ?? ''}
              onChange={e => setFilters(f => ({ ...f, isLocal: (e.target.value || undefined) as 'local' | 'intl' | undefined }))}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] outline-none"
            >
              <option value="">Local + intl</option>
              <option value="local">Solo locales (MX)</option>
              <option value="intl">Solo internacionales</option>
            </select>
            <div className="flex gap-1.5 items-center sm:col-span-2 lg:col-span-2">
              <input
                type="date"
                value={filters.fechaDesde ?? ''}
                onChange={e => setFilters(f => ({ ...f, fechaDesde: e.target.value || undefined }))}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
              />
              <span className="text-gray-400 text-xs">→</span>
              <input
                type="date"
                value={filters.fechaHasta ?? ''}
                onChange={e => setFilters(f => ({ ...f, fechaHasta: e.target.value || undefined }))}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando guías…
            </div>
          ) : guias.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <p className="text-sm text-gray-400">Sin guías en el período. Crea una con el botón "Nueva guía".</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 lg:hidden">
                {guias.map(g => (
                  <GuiaCard key={g.id} guia={g} clienteNombre={clienteById.get(g.cliente_id)?.nombre} onDelete={() => handleDelete(g)} />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Paquetería</th>
                      <th className="px-4 py-3">Tracking</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Ruta</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Costo</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-right">Margen</th>
                      <th className="px-4 py-3">Vínculo</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {guias.map(g => (
                      <tr key={g.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(g.fecha)}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-white"
                            style={{ background: PAQUETERIA_COLOR[g.paqueteria] }}
                          >
                            {PAQUETERIA_LABEL[g.paqueteria]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-gray-700">{g.tracking_number}</td>
                        <td className="px-4 py-2.5 text-gray-700">
                          <div className="truncate">{clienteById.get(g.cliente_id)?.nombre ?? g.cliente_codigo ?? '—'}</div>
                          {g.auto_pick_carrier && (
                            <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-wide">
                              auto-pick
                            </span>
                          )}
                          {g.override_reason && (
                            <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-wide ml-1" title={g.override_reason}>
                              override
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-gray-500 font-mono whitespace-nowrap">
                          {g.from_postal_code && g.to_postal_code
                            ? <>{g.from_postal_code} → {g.to_postal_code}{g.is_local === false && <span className="ml-1 text-amber-600">⌁</span>}</>
                            : '—'}
                          {g.weight_kg ? <div className="text-[10px] text-gray-400">{g.weight_kg} kg</div> : null}
                        </td>
                        <td className="px-4 py-2.5">
                          {g.tracking_status ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white"
                              style={{ background: STATUS_COLOR[g.tracking_status] }}
                            >
                              {STATUS_LABEL[g.tracking_status]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-rose-600">{fmtMXN(Number(g.costo))}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 font-semibold">{fmtMXN(Number(g.precio))}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold" style={{ color: Number(g.margen) >= 0 ? '#7c3aed' : '#dc3545' }}>
                          {fmtMXN(Number(g.margen))}
                        </td>
                        <td className="px-4 py-2.5">
                          {g.origen === 'extensiv' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold">
                              Ext · {g.extensiv_transaction_type}#{(g.extensiv_transaction_id ?? '').slice(-6)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-semibold">
                              Manual · {g.manual_reference}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(g)}
                            className="text-gray-400 hover:text-red-600"
                            aria-label="Eliminar guía"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal: Cotizar y comprar (mock provider o real cuando haya credenciales) */}
      <CotizarShipmentModal
        open={showCotizar}
        onClose={() => setShowCotizar(false)}
        clientes={clientes}
        creadoPor={user?.name ?? user?.email ?? null}
        onSubmit={async (data) => {
          try {
            await create(data)
            toast.success('Guía registrada', `${data.tracking_number} · ${fmtMXN((data.precio || 0) - (data.costo || 0))} de margen`)
          } catch (e) {
            toast.error('No se pudo registrar', e instanceof Error ? e.message : 'Error')
          }
        }}
      />

      {/* Modal: Captura manual (legacy — etiqueta generada fuera del sistema) */}
      {showForm && (
        <GuiaForm
          onClose={() => setShowForm(false)}
          onSubmit={async (data) => {
            try {
              await create(data)
              toast.success('Guía registrada', `${data.tracking_number} · ${fmtMXN(data.precio - data.costo)} de margen`)
              setShowForm(false)
            } catch (e) {
              toast.error('No se pudo registrar', e instanceof Error ? e.message : 'Error')
            }
          }}
          clientes={clientes}
          creadoPor={user?.name ?? user?.email ?? null}
        />
      )}
    </div>
  )
}

function KPI({ title, value, color, icon }: { title: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 inline-flex items-center gap-1">
        {icon} {title}
      </p>
      <p className="kpi-number text-xl mt-1 truncate" style={{ color }}>{value}</p>
    </div>
  )
}

function GuiaCard({ guia, clienteNombre, onDelete }: { guia: GuiaPaqueteria; clienteNombre?: string; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
              style={{ background: PAQUETERIA_COLOR[guia.paqueteria] }}
            >
              {PAQUETERIA_LABEL[guia.paqueteria]}
            </span>
            {guia.tracking_status && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                style={{ background: STATUS_COLOR[guia.tracking_status] }}
              >
                {STATUS_LABEL[guia.tracking_status]}
              </span>
            )}
            <span className="text-[10px] text-gray-400">{fmtDate(guia.fecha)}</span>
          </div>
          {guia.from_postal_code && guia.to_postal_code && (
            <p className="text-[10px] text-gray-500 font-mono mb-0.5">
              {guia.from_postal_code} → {guia.to_postal_code}
              {guia.weight_kg ? ` · ${guia.weight_kg} kg` : ''}
            </p>
          )}
          <p className="text-xs font-mono font-semibold text-gray-800 truncate">{guia.tracking_number}</p>
          <p className="text-[11px] text-gray-500 truncate">{clienteNombre ?? guia.cliente_codigo ?? '—'}</p>
        </div>
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-600 shrink-0">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
        <div><p className="text-gray-400">Costo</p><p className="font-bold text-rose-600 tabular-nums">{fmtMXN(Number(guia.costo))}</p></div>
        <div><p className="text-gray-400">Precio</p><p className="font-bold text-emerald-600 tabular-nums">{fmtMXN(Number(guia.precio))}</p></div>
        <div><p className="text-gray-400">Margen</p><p className="font-bold tabular-nums" style={{ color: Number(guia.margen) >= 0 ? '#7c3aed' : '#dc3545' }}>{fmtMXN(Number(guia.margen))}</p></div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 truncate">
        {guia.origen === 'extensiv'
          ? `Ext · ${guia.extensiv_transaction_type} #${guia.extensiv_transaction_id}`
          : `Manual · ${guia.manual_reference}`}
      </p>
    </div>
  )
}

/* ─── Modal form ───────────────────────────────────────────────────────── */
interface GuiaFormProps {
  onClose:    () => void
  onSubmit:   (data: CreateGuiaData) => Promise<void>
  clientes:   { id: string; codigo: string; nombre: string; extensiv_customer_id?: number | null }[]
  creadoPor:  string | null
}

function GuiaForm({ onClose, onSubmit, clientes, creadoPor }: GuiaFormProps) {
  const [paqueteria, setPaqueteria] = useState<Paqueteria>('estafeta')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [fromPostalCode, setFromPostalCode] = useState('52000')
  const [toPostalCode, setToPostalCode] = useState('')
  const [routeStops, setRouteStops] = useState<RouteStop[]>([])
  const [postalOptions, setPostalOptions] = useState<Array<{ cp: string; label: string }>>([])
  const [costo, setCosto] = useState('')
  const [precio, setPrecio] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [pickResult, setPickResult] = useState<ExtensivPickResult | null>(null)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cliente = clientes.find(c => c.id === clienteId)
  const usaExtensiv = !!cliente?.extensiv_customer_id

  const margen = (Number(precio) || 0) - (Number(costo) || 0)
  const cleanFromCP = fromPostalCode.trim()
  const cleanToCP = toPostalCode.trim()
  const cleanStops = routeStops
    .map(s => ({ cp: s.cp.trim(), label: s.label?.trim() || undefined }))
    .filter(s => /^\d{5}$/.test(s.cp))

  useEffect(() => {
    let cancelled = false
    supabase
      .from('mx_postal_codes')
      .select('cp, estado, municipio, ciudad')
      .order('cp')
      .limit(400)
      .then(({ data }) => {
        if (cancelled) return
        setPostalOptions((data ?? []).map((p: { cp: string; estado: string | null; municipio: string | null; ciudad: string | null }) => ({
          cp: p.cp,
          label: `${p.cp} · ${p.ciudad || p.municipio || 'MX'}${p.estado ? `, ${p.estado}` : ''}`,
        })))
      })
    return () => { cancelled = true }
  }, [])

  const canSubmit =
    !!clienteId
    && !!trackingNumber.trim()
    && /^\d{5}$/.test(cleanFromCP)
    && /^\d{5}$/.test(cleanToCP)
    && Number(costo) >= 0
    && Number(precio) >= 0
    && pickResult !== null
    && (pickResult.type !== 'manual' || !!pickResult.reference?.trim())

  const handleSubmit = async () => {
    if (!canSubmit || !cliente || !pickResult) return
    setSubmitting(true)
    try {
      const isExt = pickResult.type === 'order' || pickResult.type === 'receipt'
      const data: CreateGuiaData = {
        paqueteria,
        tracking_number:           trackingNumber.trim(),
        cliente_id:                clienteId,
        cliente_codigo:            cliente.codigo,
        costo:                     Number(costo),
        precio:                    Number(precio),
        fecha,
        origen:                    isExt ? 'extensiv' : 'manual',
        extensiv_transaction_type: isExt ? (pickResult.type as 'order' | 'receipt') : null,
        extensiv_transaction_id:   isExt ? (pickResult.transactionId ?? null) : null,
        extensiv_customer_id:      isExt ? (pickResult.customerId ?? null) : null,
        manual_reference:          isExt ? null : (pickResult.reference ?? null),
        notas,
        creado_por:                creadoPor,
        from_postal_code:          cleanFromCP,
        to_postal_code:            cleanToCP,
        route_stops:               cleanStops,
        to_country:                'MX',
        provider:                  'manual',
        tracking_status:           'comprado',
      }
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-[#1e3a5f] inline-flex items-center gap-2">
            <Package size={18} /> Nueva guía
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Paquetería */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Paquetería</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PAQUETERIAS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaqueteria(p)}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    paqueteria === p
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={paqueteria === p ? { background: PAQUETERIA_COLOR[p] } : undefined}
                >
                  {PAQUETERIA_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Cliente *</label>
            <select
              value={clienteId}
              onChange={e => { setClienteId(e.target.value); setPickResult(null) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] outline-none"
            >
              <option value="">— Selecciona cliente —</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.extensiv_customer_id ? '· Extensiv' : '· Manual / Seko'}
                </option>
              ))}
            </select>
            {cliente && (
              <p className="text-[10px] text-gray-400 mt-1">
                {usaExtensiv
                  ? '✓ Cliente integrado con Extensiv — podrás seleccionar transacción.'
                  : '✓ Cliente sin Extensiv — captura referencia manual (Seko 365 / PT).'}
              </p>
            )}
          </div>

          {/* Tracking + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Tracking #</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="Número de guía"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Ruta para mapa */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-0.5">Ruta para mapa *</p>
              <p className="text-[10px] text-blue-700/70">
                En captura manual estos CP alimentan el mapa de tracking. Puedes agregar paradas intermedias.
              </p>
            </div>
            <datalist id="mx-postal-code-options">
              {postalOptions.map(p => <option key={p.cp} value={p.cp}>{p.label}</option>)}
            </datalist>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">CP origen *</label>
                <input
                  value={fromPostalCode}
                  onChange={e => setFromPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  list="mx-postal-code-options"
                  placeholder="52000"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">CP destino *</label>
                <input
                  value={toPostalCode}
                  onChange={e => setToPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  list="mx-postal-code-options"
                  placeholder="64000"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Paradas</label>
                <button
                  type="button"
                  onClick={() => setRouteStops(prev => [...prev, { cp: '', label: '' }])}
                  className="text-[11px] font-bold text-[#1e3a5f] hover:underline"
                >
                  + Agregar parada
                </button>
              </div>
              {routeStops.length === 0 ? (
                <p className="text-[10px] text-gray-400">Sin paradas intermedias.</p>
              ) : (
                <div className="space-y-2">
                  {routeStops.map((stop, idx) => (
                    <div key={idx} className="grid grid-cols-[90px_1fr_24px] gap-2">
                      <input
                        value={stop.cp}
                        onChange={e => setRouteStops(prev => prev.map((s, i) => i === idx ? { ...s, cp: e.target.value.replace(/\D/g, '').slice(0, 5) } : s))}
                        list="mx-postal-code-options"
                        placeholder="CP"
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
                      />
                      <input
                        value={stop.label ?? ''}
                        onChange={e => setRouteStops(prev => prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                        placeholder="Nombre de parada (opcional)"
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setRouteStops(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-600"
                        aria-label="Quitar parada"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Costo + Precio */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Costo (lo que pagamos)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={costo}
                onChange={e => setCosto(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Precio (al cliente)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Margen</label>
              <p className="px-3 py-2 text-sm font-bold rounded-lg border border-gray-200 bg-gray-50 tabular-nums" style={{ color: margen >= 0 ? '#7c3aed' : '#dc3545' }}>
                {fmtMXN(margen)}
              </p>
            </div>
          </div>

          {/* Vínculo */}
          {clienteId && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                Vincular con {usaExtensiv ? 'transacción Extensiv (o referencia manual)' : 'referencia manual'}
              </label>
              <ExtensivOperationPicker
                value={pickResult}
                onChange={setPickResult}
                defaultCustomer={cliente?.extensiv_customer_id ?? undefined}
                fromDays={7}
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Notas</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones (opcional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#1e3a5f] outline-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white shadow-sm disabled:opacity-40"
            style={{ background: 'var(--brand-navy)' }}
          >
            {submitting ? <Spinner size={14} /> : null} Guardar guía
          </button>
        </div>
      </div>
    </div>
  )
}
