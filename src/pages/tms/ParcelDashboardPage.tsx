import { useMemo, useState } from 'react'
import {
  Package, Truck, CheckCircle2, AlertCircle, Clock, MapPin, RefreshCw,
  Search, DollarSign, TrendingUp,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useShipmentPositions, type ShipmentPosition } from '../../hooks/useShipmentPositions'
import { PAQUETERIA_LABEL, PAQUETERIA_COLOR, type TrackingStatus } from '../../types/guias'

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
  comprado:    '#3b82f6',
  en_transito: '#f97316',
  entregado:   '#10b981',
  excepcion:   '#ef4444',
  devuelto:    '#f59e0b',
}

const fmtMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtETA = (mins: number | null) => {
  if (mins == null) return '—'
  if (mins <= 0) return 'Llegando'
  const h = Math.floor(mins / 60), m = mins % 60
  if (h >= 24) return `${Math.round(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function ParcelDashboardPage() {
  const { positions, loading, error } = useShipmentPositions(20_000)
  const [filterStatus, setFilterStatus] = useState<TrackingStatus | ''>('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = positions
    if (filterStatus) list = list.filter(p => p.guia.tracking_status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.guia.tracking_number.toLowerCase().includes(q) ||
        (p.guia.cliente_codigo ?? '').toLowerCase().includes(q) ||
        (p.guia.from_postal_code ?? '').includes(q) ||
        (p.guia.to_postal_code ?? '').includes(q),
      )
    }
    // Orden: en_transito primero, luego comprado, luego entregado
    const order: Record<string, number> = { en_transito: 1, comprado: 2, cotizado: 3, excepcion: 4, devuelto: 5, entregado: 6 }
    return [...list].sort((a, b) => (order[a.guia.tracking_status ?? 'comprado'] ?? 9) - (order[b.guia.tracking_status ?? 'comprado'] ?? 9))
  }, [positions, filterStatus, search])

  const kpis = useMemo(() => {
    const buckets: Record<TrackingStatus, number> = {
      cotizado: 0, comprado: 0, en_transito: 0, entregado: 0, excepcion: 0, devuelto: 0,
    }
    let costoTotal = 0
    let precioTotal = 0
    for (const p of positions) {
      const s = p.guia.tracking_status
      if (s) buckets[s] += 1
      costoTotal += Number(p.guia.costo) || 0
      precioTotal += Number(p.guia.precio) || 0
    }
    return {
      total: positions.length,
      ...buckets,
      costoTotal,
      precioTotal,
      margenTotal: precioTotal - costoTotal,
    }
  }, [positions])

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <Package size={20} /> Dashboard de paquetes
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Toda la información de cada envío en tiempo real · auto-refresh cada 20s
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <RefreshCw size={11} /> realtime
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
            <KPI title="Total" value={kpis.total} color="#1e3a5f" icon={<Package size={12} />} />
            <KPI title="En tránsito" value={kpis.en_transito} color={STATUS_COLOR.en_transito} icon={<Truck size={12} />} />
            <KPI title="Entregados" value={kpis.entregado} color={STATUS_COLOR.entregado} icon={<CheckCircle2 size={12} />} />
            <KPI title="Excepción" value={kpis.excepcion} color={STATUS_COLOR.excepcion} icon={<AlertCircle size={12} />} />
            <KPI title="Costo total" value={fmtMXN(kpis.costoTotal)} color="#dc3545" icon={<DollarSign size={12} />} valueIsNumber={false} />
            <KPI title="Margen" value={fmtMXN(kpis.margenTotal)} color="#7c3aed" icon={<TrendingUp size={12} />} valueIsNumber={false} />
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Tracking #, cliente, CP origen/destino…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus((e.target.value || '') as TrackingStatus | '')}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white outline-none"
            >
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_LABEL) as TrackingStatus[]).map(k => (
                <option key={k} value={k}>{STATUS_LABEL[k]}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando paquetes…
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <Package size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Sin paquetes en este filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map(pos => <ShipmentDetailCard key={pos.guia.id} pos={pos} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function KPI({ title, value, color, icon, valueIsNumber = true }: {
  title: string; value: number | string; color: string; icon: React.ReactNode; valueIsNumber?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 inline-flex items-center gap-1">
        {icon} {title}
      </p>
      <p className={`mt-0.5 ${valueIsNumber ? 'kpi-number text-2xl' : 'text-base font-bold'}`} style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function ShipmentDetailCard({ pos }: { pos: ShipmentPosition }) {
  const g = pos.guia
  const status = (g.tracking_status ?? 'comprado') as TrackingStatus
  const carrier = g.auto_pick_carrier ?? g.paqueteria
  const carrierColor = PAQUETERIA_COLOR[g.paqueteria] ?? '#1e3a5f'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-[#1e3a5f] truncate">{g.tracking_number}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: carrierColor }}>
              {(PAQUETERIA_LABEL[g.paqueteria] ?? g.paqueteria).toUpperCase()}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </span>
            {g.override_reason && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase">
                override
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-extrabold text-emerald-600 tabular-nums">{fmtMXN(Number(g.precio))}</p>
          <p className="text-[10px] text-gray-400">precio cliente</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-gray-50/50">
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
          <span>{g.from_postal_code ?? '—'}</span>
          <span><Clock size={10} className="inline mb-0.5" /> ETA {fmtETA(pos.etaMinutes)}</span>
          <span>{g.to_postal_code ?? '—'}</span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.round(pos.progress * 100)}%`,
              background: STATUS_COLOR[status],
            }}
          />
        </div>
        {pos.from && pos.to && (
          <p className="text-[10px] text-gray-400 mt-1 text-center">
            {pos.from.ciudad ?? pos.from.estado ?? '—'} → {pos.to.ciudad ?? pos.to.estado ?? '—'}
          </p>
        )}
      </div>

      {/* Detalles */}
      <div className="px-4 py-3 grid grid-cols-2 gap-y-1.5 gap-x-4 text-[12px]">
        <Field label="Carrier"  value={`${carrier} ${g.auto_pick_service ?? ''}`} />
        <Field label="Cliente"  value={g.cliente_codigo ?? '—'} />
        <Field label="Peso"     value={g.weight_kg != null ? `${g.weight_kg} kg` : '—'} />
        <Field label="Provider" value={g.provider ?? 'mock'} />
        <Field label="Costo"    value={fmtMXN(Number(g.costo))} />
        <Field label="Margen"   value={fmtMXN(Number(g.margen))} />
        <Field label="Creada"   value={fmtDate(g.created_at)} />
        <Field label="Progreso" value={`${Math.round(pos.progress * 100)}%`} />
      </div>

      {g.override_reason && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-[11px] text-amber-800">
          <b>Motivo override:</b> {g.override_reason}
        </div>
      )}

      {pos.current && (
        <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-500 inline-flex items-center gap-1.5">
          <MapPin size={11} /> Posición actual: {pos.current.lat.toFixed(4)}, {pos.current.lon.toFixed(4)}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-[12px] text-gray-800 font-semibold truncate">{value}</p>
    </div>
  )
}
