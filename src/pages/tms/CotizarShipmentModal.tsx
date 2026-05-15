import { useEffect, useMemo, useState } from 'react'
import {
  X, Package, Search, Sparkles, AlertCircle, CheckCircle2, Loader2, MapPin, Box, Zap,
} from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { getActiveProviders } from '../../lib/carriers/registry'
import { pickCarrier, autopickSavings } from '../../lib/carriers/autopick'
import { applyRules } from '../../lib/carriers/rules'
import { distanceBetweenCPs } from '../../lib/postal/distance'
import { printMockLabel } from '../../lib/carriers/labels'
import { useShippingRules } from '../../hooks/useShippingRules'
import { useMarkupProfiles } from '../../hooks/useMarkupProfiles'
import { applyMarkupToRate } from '../../lib/carriers/markup'
import type { Address, ParcelDimensions, Rate } from '../../lib/carriers/types'
import type { CreateGuiaData, RateQuote, Paqueteria } from '../../types/guias'

interface Cliente {
  id:                    string
  codigo:                string
  nombre:                string
  extensiv_customer_id?: number | null
}

interface Props {
  open:        boolean
  onClose:     () => void
  onSubmit:    (data: CreateGuiaData) => Promise<void>
  clientes:    Cliente[]
  creadoPor:   string | null
}

const fmtMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

const CARRIER_TO_PAQUETERIA: Record<string, Paqueteria> = {
  estafeta: 'estafeta',
  ups:      'ups',
  fedex:    'fedex',
  dhl:      'dhl',
  castores: 'castores',
}

export function CotizarShipmentModal({ open, onClose, onSubmit, clientes, creadoPor }: Props) {
  const toast = useToast()
  const { rules } = useShippingRules()
  const { profiles: markupProfiles, rules: markupRules } = useMarkupProfiles()

  // Form
  const [clienteId, setClienteId] = useState('')
  const [fromCP, setFromCP] = useState('52000')   // Lerma default
  const [toCP, setToCP] = useState('')
  const [toCountry, setToCountry] = useState('MX')
  const [weightKg, setWeightKg] = useState('')
  const [lengthCm, setLengthCm] = useState('30')
  const [widthCm, setWidthCm] = useState('20')
  const [heightCm, setHeightCm] = useState('10')
  const [precio, setPrecio] = useState('')
  const [notas, setNotas] = useState('')

  // Cotización
  const [rates, setRates] = useState<Rate[]>([])
  const [loading, setLoading] = useState(false)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [isMockOnly, setIsMockOnly] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Compra
  const [buying, setBuying] = useState<string | null>(null)   // rate_id de la fila siendo comprada
  const [overrideTarget, setOverrideTarget] = useState<Rate | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  const cliente = clientes.find(c => c.id === clienteId) ?? null
  // Aplicar reglas de routing antes del auto-pick
  const ruleApp = useMemo(
    () => applyRules(rates, { distance_km: distanceKm }, rules),
    [rates, distanceKm, rules],
  )
  const auto = useMemo(
    () => pickCarrier(ruleApp.rates, { distance_km: distanceKm }),
    [ruleApp.rates, distanceKm],
  )
  const ahorro = useMemo(() => autopickSavings(auto), [auto])

  useEffect(() => {
    if (!open) {
      // Reset al cerrar
      setRates([]); setDistanceKm(null); setError(null)
      setBuying(null); setOverrideTarget(null); setOverrideReason('')
    }
  }, [open])

  if (!open) return null

  const canCotizar =
    !!clienteId && /^\d{5}$/.test(fromCP) && /^\d{5}$/.test(toCP) && Number(weightKg) > 0
    && Number(lengthCm) > 0 && Number(widthCm) > 0 && Number(heightCm) > 0

  const handleCotizar = async () => {
    if (!canCotizar || !cliente) return
    setLoading(true); setError(null)
    try {
      const { clients, isMockOnly: mockOnly } = await getActiveProviders()
      setIsMockOnly(mockOnly)

      const distance = await distanceBetweenCPs(fromCP, toCP)
      setDistanceKm(distance)

      const from: Address = {
        name: 'Supply Chain MX', company: 'CEDIS Lerma',
        street1: 'Carretera Lerma-La Marquesa Km 4',
        city: 'Lerma', state: 'México', postal_code: fromCP, country: 'MX',
      }
      const to: Address = {
        name: cliente.nombre, company: cliente.nombre,
        street1: '(por capturar al despachar)',
        city: '', state: '', postal_code: toCP, country: toCountry,
      }
      const parcel: ParcelDimensions = {
        weight_kg: Number(weightKg),
        length_cm: Number(lengthCm),
        width_cm:  Number(widthCm),
        height_cm: Number(heightCm),
      }
      const all: Rate[] = []
      for (const c of clients) {
        try {
          const rs = await c.getRates({ from, to, parcel })
          all.push(...rs)
        } catch (e) {
          console.error(`[${c.name}] getRates falló`, e)
        }
      }
      if (all.length === 0) {
        setError('Ningún provider devolvió cotizaciones. Verifica configuración o intenta de nuevo.')
      }
      // Aplicar markup configurable: el precio mostrado es el que se cobra al
      // cliente; base_cost_mxn conserva el costo original del carrier.
      const ctx = { profiles: markupProfiles, rules: markupRules }
      const marked = all.map(r => {
        const result = applyMarkupToRate(r.price_mxn, {
          clienteId: cliente.id, carrier: r.carrier, service: r.service,
        }, ctx)
        return result.markup_amount > 0
          ? { ...r, base_cost_mxn: r.price_mxn, price_mxn: result.final_price }
          : r
      })
      setRates(marked)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cotizar')
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async (rate: Rate, isOverride: boolean, reason: string | null) => {
    if (!cliente) return
    setBuying(rate.rate_id)
    try {
      // Generar PDF mock + auto-print (en modo demo). Cuando lleguen APIs
      // reales, esto se reemplaza con el label_url devuelto por el provider.
      const trackingCode = `MOCK${Date.now().toString().slice(-8)}`
      const labelUrl = await printMockLabel({
        tracking_code: trackingCode,
        rate,
        from: {
          name: 'Supply Chain MX', street1: 'Carretera Lerma-La Marquesa Km 4',
          city: 'Lerma', state: 'México', postal_code: fromCP, country: 'MX',
        },
        to: {
          name: cliente.nombre, street1: '(por capturar al despachar)',
          city: '', state: '', postal_code: toCP, country: toCountry,
        },
        parcel: {
          weight_kg: Number(weightKg), length_cm: Number(lengthCm),
          width_cm: Number(widthCm), height_cm: Number(heightCm),
        },
        cliente: cliente.nombre,
      })

      // Snapshot de TODAS las cotizaciones recibidas para auditoría.
      const rateQuotes: RateQuote[] = rates.map(r => ({
        carrier:          r.carrier,
        service:          r.service,
        price_mxn:        r.price_mxn,
        delivery_days:    r.delivery_days,
        is_local:         r.is_local,
        provider:         r.provider,
        provider_rate_id: r.rate_id,
      }))

      const data: CreateGuiaData = {
        paqueteria:                CARRIER_TO_PAQUETERIA[rate.carrier] ?? 'estafeta',
        tracking_number:           trackingCode,
        cliente_id:                cliente.id,
        cliente_codigo:            cliente.codigo,
        costo:                     rate.price_mxn,
        precio:                    Number(precio) || rate.price_mxn,
        fecha:                     new Date().toISOString().slice(0, 10),
        origen:                    'manual',
        extensiv_transaction_type: null,
        extensiv_transaction_id:   null,
        extensiv_customer_id:      null,
        manual_reference:          `Auto-pick ${rate.carrier_label} ${rate.service_label}`,
        notas,
        creado_por:                creadoPor,
        from_postal_code:          fromCP,
        to_postal_code:            toCP,
        to_country:                toCountry,
        weight_kg:                 Number(weightKg),
        length_cm:                 Number(lengthCm),
        width_cm:                  Number(widthCm),
        height_cm:                 Number(heightCm),
        rate_quotes:               rateQuotes,
        auto_pick_carrier:         auto.winner?.carrier ?? null,
        auto_pick_service:         auto.winner?.service ?? null,
        auto_pick_score:           null,
        auto_pick_reasoning:       auto.reasoning,
        override_reason:           isOverride ? reason : null,
        override_by:               isOverride ? creadoPor : null,
        label_url:                 labelUrl,
        label_format:              'pdf',
        provider:                  rate.provider,
        provider_shipment_id:      null,
        provider_rate_id:          rate.rate_id,
        tracking_status:           'comprado',
      }

      await onSubmit(data)
      toast.success('Etiqueta generada', `${rate.carrier_label} ${rate.service_label} · ${trackingCode}`)
      onClose()
    } catch (e) {
      toast.error('No se pudo comprar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBuying(null)
    }
  }

  const handleClickBuy = (rate: Rate) => {
    if (!auto.winner) return
    if (rate.rate_id === auto.winner.rate_id) {
      handleBuy(rate, false, null)
    } else {
      setOverrideTarget(rate)
      setOverrideReason('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-[#1e3a5f] inline-flex items-center gap-2">
            <Sparkles size={18} /> Cotizar y comprar etiqueta
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Banner modo demo */}
          {isMockOnly && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 inline-flex items-center gap-2 w-full">
              <Zap size={14} className="shrink-0" />
              <span><b>Modo demo</b> — rates simulados. Las etiquetas no son válidas para envío real. Configura un provider en /tms/carriers.</span>
            </div>
          )}

          {/* Cliente */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Cliente *</label>
            <select
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
            >
              <option value="">— Selecciona cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Origen / destino */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">CP origen</label>
              <input
                type="text"
                value={fromCP}
                onChange={e => setFromCP(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="52000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono"
              />
              <p className="text-[10px] text-gray-400 mt-1">CEDIS Lerma por default</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">CP destino *</label>
              <input
                type="text"
                value={toCP}
                onChange={e => setToCP(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="06700"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">País destino</label>
              <select
                value={toCountry}
                onChange={e => setToCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
              >
                <option value="MX">México</option>
                <option value="US">Estados Unidos</option>
                <option value="CA">Canadá</option>
                <option value="GT">Guatemala</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>

          {/* Paquete */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block inline-flex items-center gap-1">
              <Box size={12} /> Paquete *
            </label>
            <div className="grid grid-cols-4 gap-2">
              <input type="number" min={0.1} step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="Peso (kg)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
              <input type="number" min={1} step="1" value={lengthCm} onChange={e => setLengthCm(e.target.value)} placeholder="Largo (cm)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
              <input type="number" min={1} step="1" value={widthCm} onChange={e => setWidthCm(e.target.value)} placeholder="Ancho (cm)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
              <input type="number" min={1} step="1" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="Alto (cm)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
            </div>
          </div>

          {/* Botón cotizar */}
          <button
            type="button"
            onClick={handleCotizar}
            disabled={!canCotizar || loading}
            className="w-full h-11 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[#16304d] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            {loading ? 'Cotizando…' : 'Cotizar con todas las paqueterías'}
          </button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 inline-flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Resultados */}
          {rates.length > 0 && auto.winner && (
            <>
              {/* Auto-pick destacado */}
              <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 size={11} /> Recomendado por el sistema
                    </p>
                    <p className="text-base font-bold text-gray-900 mt-1">
                      {auto.winner.carrier_label} · {auto.winner.service_label}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{auto.reasoning}</p>
                    {ruleApp.applied.length > 0 && (
                      <p className="text-[10px] text-purple-700 mt-0.5">
                        🎯 {ruleApp.applied.length} regla(s) aplicadas: {ruleApp.applied.map(r => r.name).join(', ')}
                      </p>
                    )}
                    {ahorro > 0 && (
                      <p className="text-[11px] text-emerald-700 mt-1">
                        💰 Ahorras {fmtMXN(ahorro)} vs el 2º más barato
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-extrabold text-emerald-700">{fmtMXN(auto.winner.price_mxn)}</p>
                    <p className="text-[10px] text-gray-500">{auto.winner.delivery_days} día(s)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuy(auto.winner!, false, null)}
                  disabled={buying !== null}
                  className="w-full mt-3 h-10 rounded-lg bg-emerald-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {buying === auto.winner.rate_id ? <Loader2 className="animate-spin" size={14} /> : <Package size={14} />}
                  Comprar etiqueta recomendada
                </button>
              </div>

              {distanceKm !== null && (
                <p className="text-[11px] text-gray-500 inline-flex items-center gap-1">
                  <MapPin size={11} /> Distancia {fromCP} → {toCP}: <b>{distanceKm} km</b>
                </p>
              )}

              {/* Tabla todas las cotizaciones */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Todas las cotizaciones ({rates.length})</p>
                <div className="space-y-1.5">
                  {auto.ranking.map(({ rate, score, reasoning }, idx) => {
                    const isWinner = idx === 0
                    return (
                      <div
                        key={rate.rate_id}
                        className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center rounded-lg border px-3 py-2 ${
                          isWinner ? 'border-emerald-300 bg-emerald-50/40' : 'border-gray-100 bg-white'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold inline-flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {rate.carrier_label} · <span className="text-gray-500 font-normal">{rate.service_label}</span>
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{reasoning} · score {score.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          {rate.base_cost_mxn != null && (
                            <p className="text-[10px] text-gray-400 line-through tabular-nums">
                              {fmtMXN(rate.base_cost_mxn)}
                            </p>
                          )}
                          <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--brand-navy)' }}>
                            {fmtMXN(rate.price_mxn)}
                          </p>
                          <p className="text-[10px] text-gray-400">{rate.delivery_days}d</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleClickBuy(rate)}
                          disabled={buying !== null}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            isWinner
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border border-gray-200 text-gray-700 hover:bg-gray-100'
                          } disabled:opacity-50`}
                        >
                          {buying === rate.rate_id ? <Loader2 className="animate-spin" size={11} /> : 'Comprar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Precio cliente + notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Precio al cliente (opcional)</label>
                  <input
                    type="number" min={0} step="0.01" value={precio}
                    onChange={e => setPrecio(e.target.value)}
                    placeholder="Si vacío, usa el costo del auto-pick"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Notas</label>
                  <input
                    type="text" value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Observaciones (opcional)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex justify-end">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de override */}
      {overrideTarget && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-5 space-y-3">
            <h3 className="text-base font-bold text-[#1e3a5f]">Justifica el override</h3>
            <p className="text-xs text-gray-500">
              Estás eligiendo <b>{overrideTarget.carrier_label} {overrideTarget.service_label}</b> en vez del auto-pick recomendado
              ({auto.winner?.carrier_label}). Escribe el motivo — queda en el log.
            </p>
            <textarea
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              rows={3}
              placeholder='Ej. "Cliente exige UPS por reclamo previo"'
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setOverrideTarget(null); setOverrideReason('') }}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!overrideReason.trim() || buying !== null}
                onClick={() => {
                  const target = overrideTarget
                  setOverrideTarget(null)
                  handleBuy(target, true, overrideReason.trim())
                }}
                className="px-4 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-xs font-bold disabled:opacity-50"
              >
                {buying ? <Loader2 className="animate-spin" size={11} /> : null} Confirmar override y comprar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner global solo si no hay rates aún */}
      {loading && rates.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/30 pointer-events-none">
          <Spinner size={28} />
        </div>
      )}
    </div>
  )
}
