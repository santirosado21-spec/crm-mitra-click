import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Inbox, Search, FileText, ArrowRight, AlertCircle, Trash2, Calendar, MapPin, User, Truck,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { useCartasInstruccion } from '../../hooks/useCartasInstruccion'
import {
  STATUS_LABEL, STATUS_COLOR,
  type CartaFilters, type CartaInstruccion, type CartaStatus,
} from '../../types/cartas'

const fmtDate = (d: string | null) => d
  ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
  : '—'

export function CartasRecibidasPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [filters, setFilters] = useState<CartaFilters>({ status: 'enviada' })
  const { cartas, loading, error, kpis, remove } = useCartasInstruccion(filters)
  const [selected, setSelected] = useState<CartaInstruccion | null>(null)

  const sortedCartas = useMemo(() => cartas, [cartas])

  const handleDelete = async (c: CartaInstruccion) => {
    if (!confirm(`¿Eliminar la carta ${c.folio}?`)) return
    try {
      await remove(c.id)
      toast.success('Carta eliminada')
      if (selected?.id === c.id) setSelected(null)
    } catch (e) {
      toast.error('No se pudo eliminar', e instanceof Error ? e.message : 'Error')
    }
  }

  const handleProcesar = (c: CartaInstruccion) => {
    navigate(`/tms/carta-porte?fromCarta=${c.id}`)
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
              <Inbox size={20} /> Cartas de instrucción recibidas
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Bandeja de Transportes · Cartas enviadas por SAC, listas para convertir en Carta Porte.
            </p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KPI title="Total" value={String(kpis.total)} color="#1e3a5f" />
            <KPI title="Enviadas" value={String(kpis.enviadas)} color="#1e3a5f" />
            <KPI title="Procesadas" value={String(kpis.procesadas)} color="#28a745" />
            <KPI title="Canceladas" value={String(kpis.canceladas)} color="#94a3b8" />
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Folio, cliente, referencia, destino…"
                value={filters.search ?? ''}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
              />
            </div>
            <select
              value={filters.status ?? ''}
              onChange={e => setFilters(f => ({ ...f, status: (e.target.value || undefined) as CartaStatus | undefined }))}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="enviada">Enviadas</option>
              <option value="procesada">Procesadas</option>
              <option value="cancelada">Canceladas</option>
              <option value="borrador">Borradores</option>
            </select>
            <div className="flex gap-1.5 items-center">
              <input type="date" value={filters.fechaDesde ?? ''} onChange={e => setFilters(f => ({ ...f, fechaDesde: e.target.value || undefined }))} className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
              <span className="text-gray-400 text-xs">→</span>
              <input type="date" value={filters.fechaHasta ?? ''} onChange={e => setFilters(f => ({ ...f, fechaHasta: e.target.value || undefined }))} className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando cartas…
            </div>
          ) : sortedCartas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <Inbox size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Sin cartas en este filtro.</p>
              <p className="text-[11px] text-gray-400">SAC puede enviar nuevas desde /sac/carta-instruccion.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
              {/* Lista */}
              <div className="space-y-2">
                {sortedCartas.map(c => {
                  const active = selected?.id === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`w-full text-left bg-white rounded-xl border shadow-sm p-3 transition-colors ${
                        active ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/15' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-semibold text-[#1e3a5f]">{c.folio}</p>
                          <p className="text-sm font-bold text-gray-800 truncate">{c.cliente_nombre}</p>
                        </div>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                          style={{ background: STATUS_COLOR[c.status] }}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate"><MapPin size={10} className="inline mb-0.5" /> {c.origen ?? '—'} → {c.destino}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        <Calendar size={10} className="inline mb-0.5" /> {fmtDate(c.fecha_carga)} · {c.total_bultos} bultos · {c.total_peso_kg} kg
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Detalle */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sticky top-2">
                {!selected ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    Selecciona una carta para ver el detalle.
                  </div>
                ) : (
                  <CartaDetalle carta={selected} onProcesar={() => handleProcesar(selected)} onDelete={() => handleDelete(selected)} />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function KPI({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      <p className="kpi-number text-xl mt-1" style={{ color }}>{value}</p>
    </div>
  )
}

function CartaDetalle({ carta, onProcesar, onDelete }: { carta: CartaInstruccion; onProcesar: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">Folio</p>
          <p className="font-mono font-bold text-[#1e3a5f]">{carta.folio}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Enviada {fmtDate(carta.enviada_at?.slice(0, 10) ?? null)} por {carta.enviada_por ?? '—'}</p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: STATUS_COLOR[carta.status] }}>
          {STATUS_LABEL[carta.status]}
        </span>
      </div>

      <Row label="Cliente"     value={carta.cliente_nombre} />
      <Row label="Referencia"  value={carta.referencia} />
      <Row label="Servicio"    value={carta.tipo_servicio} />

      <div className="grid grid-cols-2 gap-2">
        <Row label="Origen"   value={`${carta.origen ?? '—'}\n${carta.origen_direccion ?? ''}`} multi />
        <Row label="Destino"  value={`${carta.destino}\n${carta.destino_direccion}`} multi />
        <Row label="Carga"    value={`${fmtDate(carta.fecha_carga)} ${carta.hora_carga ?? ''}`} />
        <Row label="Entrega"  value={`${fmtDate(carta.fecha_entrega)} ${carta.hora_entrega ?? ''}`} />
        <Row label="Contacto carga"   value={carta.contacto_carga} />
        <Row label="Contacto entrega" value={carta.contacto_entrega} />
      </div>

      {(carta.unidad_sugerida || carta.operador_sugerido) && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sugerido por SAC</p>
          {carta.unidad_sugerida && <p className="text-[11px] text-gray-700"><Truck size={11} className="inline mb-0.5" /> {carta.unidad_sugerida} · {carta.placas_sugeridas ?? ''}</p>}
          {carta.operador_sugerido && <p className="text-[11px] text-gray-700"><User size={11} className="inline mb-0.5" /> {carta.operador_sugerido}</p>}
        </div>
      )}

      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Mercancías ({carta.mercancias.length})</p>
        <div className="space-y-1.5">
          {carta.mercancias.map((m, i) => (
            <div key={i} className="text-[11px] border border-gray-100 rounded p-2">
              <p className="font-semibold text-gray-700">{m.descripcion} <span className="text-gray-400">· {m.sku || '—'}</span></p>
              <p className="text-gray-500">Cant. {m.cantidad || '0'} · {m.empaque || '—'} · {m.peso || '0'} kg{m.valor ? ` · $${m.valor}` : ''}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-bold text-[#1e3a5f] mt-1">Totales · {carta.total_bultos} bultos · {carta.total_peso_kg} kg</p>
      </div>

      {carta.instrucciones && (
        <Row label="Instrucciones" value={carta.instrucciones} multi />
      )}
      {carta.seguridad && (
        <Row label="Seguridad" value={carta.seguridad} multi />
      )}
      {carta.documentos && (
        <Row label="Documentos requeridos" value={carta.documentos} />
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        {carta.status !== 'cancelada' && (
          <button
            type="button"
            onClick={onProcesar}
            className="flex-1 h-10 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#16304d]"
          >
            <FileText size={15} /> Convertir a Carta Porte <ArrowRight size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="h-10 px-3 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5"
        >
          <Trash2 size={14} /> Eliminar
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, multi }: { label: string; value: string | null | undefined; multi?: boolean }) {
  if (!value || (typeof value === 'string' && !value.trim())) return null
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`text-[12px] text-gray-800 ${multi ? 'whitespace-pre-line' : ''}`}>{value}</p>
    </div>
  )
}
