import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, DollarSign, AlertCircle, CheckCircle2,
  Loader2, Send, FileText, Receipt, RefreshCw,
} from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { Sidebar } from '../../../components/layout/Sidebar'
import { Spinner } from '../../../components/ui/Spinner'
import { useAuthContext } from '../../../context/AuthContext'
import { useToast } from '../../../hooks/useToast'
import {
  getExtensivCustomers,
  getExtensivOrdersByCustomer,
  getExtensivReceiversByCustomer,
  createExtensivInvoice,
  type ExtensivCustomer,
} from '../../../lib/extensiv'
import {
  listChargesForCustomer,
  pushChargeToExtensiv,
  voidCharge,
  type BillingChargeRow,
} from '../../../lib/extensivBilling'
import { supabase } from '../../../lib/supabase'

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const fmtMXN  = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—')

function startOfMonth(d: Date): Date  { const r = new Date(d); r.setHours(0,0,0,0); r.setDate(1); return r }
function endOfMonth(d: Date): Date    { const r = startOfMonth(d); r.setMonth(r.getMonth() + 1); r.setDate(0); return r }
function addMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }
function isoDay(d: Date): string      { return d.toISOString().slice(0, 10) }

interface LegacyTotal { total: number; loading: boolean; error: string | null }

/* ─── Page ─────────────────────────────────────────────────────────────── */
export function ExtensivBilling() {
  const { user } = useAuthContext()
  const toast    = useToast()
  const isAdmin  = user?.role === 'admin'

  // Filtros
  const [customers, setCustomers]   = useState<ExtensivCustomer[]>([])
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [month, setMonth]           = useState<Date>(() => new Date())

  // Datos
  const [charges, setCharges] = useState<BillingChargeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Comparativo legacy
  const [legacyTotal, setLegacyTotal] = useState<LegacyTotal>({ total: 0, loading: false, error: null })

  // Acciones
  const [retrying, setRetrying]     = useState(false)
  const [retryProgress, setRetryProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [generating, setGenerating] = useState(false)
  const [confirmInvoice, setConfirmInvoice] = useState(false)

  // Rango de fechas del mes seleccionado
  const fromDate = isoDay(startOfMonth(month))
  const toDate   = isoDay(endOfMonth(month))

  // Carga inicial de clientes
  useEffect(() => {
    getExtensivCustomers()
      .then(setCustomers)
      .catch(e => setError(e instanceof Error ? e.message : 'Error cargando clientes'))
  }, [])

  // Recarga charges al cambiar filtros
  const reloadCharges = async () => {
    if (!customerId) { setCharges([]); return }
    setLoading(true); setError(null)
    try {
      const rows = await listChargesForCustomer(customerId, fromDate, toDate)
      setCharges(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando charges')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { reloadCharges() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, fromDate, toDate])

  // Calcula total de proforma legacy del mismo cliente/período (lectura solo)
  useEffect(() => {
    if (!customerId) { setLegacyTotal({ total: 0, loading: false, error: null }); return }
    setLegacyTotal({ total: 0, loading: true, error: null })

    ;(async () => {
      try {
        // Encuentra el cliente legacy en CRM (clients) por extensiv_customer_id
        const { data: clientRow } = await supabase
          .from('clients')
          .select('codigo')
          .eq('extensiv_customer_id', customerId)
          .eq('is_active', true)
          .maybeSingle()

        if (!clientRow?.codigo) {
          setLegacyTotal({ total: 0, loading: false, error: null })
          return
        }

        // Misma lógica que ProformasPage.handleGenerateFromExtensiv
        const [orders, receivers, tarifasRes] = await Promise.all([
          getExtensivOrdersByCustomer(customerId, fromDate, toDate),
          getExtensivReceiversByCustomer(customerId, fromDate, toDate),
          supabase
            .from('tarifarios')
            .select('concepto, precio')
            .eq('cliente_codigo', clientRow.codigo)
            .eq('activo', true),
        ])

        const totalEntradas = receivers.reduce((s, r) => s + r.numUnits1, 0)
        const totalSalidas  = orders.reduce((s, o) => s + o.numUnits1, 0)

        let total = 0
        for (const t of (tarifasRes.data ?? []) as { concepto: string; precio: number }[]) {
          const cl = t.concepto.toLowerCase()
          let qty = 0
          if (cl.includes('entrada') && !cl.includes('salida')) qty = totalEntradas
          else if (cl.includes('salida') && !cl.includes('entrada')) qty = totalSalidas
          total += qty * t.precio
        }

        setLegacyTotal({ total, loading: false, error: null })
      } catch (e) {
        setLegacyTotal({ total: 0, loading: false, error: e instanceof Error ? e.message : 'Error' })
      }
    })()
  }, [customerId, fromDate, toDate])

  // Totales / KPIs
  const kpis = useMemo(() => {
    let totalSent = 0
    let pending = 0, sent = 0, failed = 0
    for (const c of charges) {
      if (c.status === 'sent') { sent++; totalSent += Number(c.amount) }
      else if (c.status === 'pending') pending++
      else if (c.status === 'failed') failed++
    }
    return { totalSent, pending, sent, failed }
  }, [charges])

  const customerName = customers.find(c => c.id === customerId)?.name ?? null
  const monthLabel   = month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  // Comparativo
  const diff       = kpis.totalSent - legacyTotal.total
  const diffPct    = legacyTotal.total > 0 ? (diff / legacyTotal.total) * 100 : 0
  const diffOK     = Math.abs(diffPct) < 1            // <1% diff = OK
  const diffWarn   = Math.abs(diffPct) >= 1 && Math.abs(diffPct) < 10
  // const diffError  = Math.abs(diffPct) >= 10

  /* ─── Acciones ─────────────────────────────────────────────────────── */
  async function handleRetryAllFailed() {
    const failed = charges.filter(c => c.status === 'failed')
    if (failed.length === 0) return
    setRetrying(true)
    setRetryProgress({ done: 0, total: failed.length })

    for (let i = 0; i < failed.length; i++) {
      const c = failed[i]
      try {
        await pushChargeToExtensiv({
          sourceTable:     c.source_table as 'viajes' | 'operations' | 'servicios_adicionales',
          sourceId:        c.source_id,
          customerId:      c.customer_id,
          chargeType:      c.charge_type as 'FLETE_INTERNO' | 'FLETE_EXTERNO' | 'MANIOBRA_CARGA' | 'MANIOBRA_DESCARGA' | 'SERVICIO_VALOR_AGREGADO' | 'ALMACENAJE_DIA',
          amount:          Number(c.amount),
          description:     c.description,
          referenceNumber: c.reference_number,
          shipmentId:      c.shipment_id ?? undefined,
          chargeDate:      c.charge_date,
        })
      } catch { /* el log ya guardó el error */ }
      setRetryProgress({ done: i + 1, total: failed.length })
    }

    await reloadCharges()
    setRetrying(false)
    toast.success(`Reintentos completados`, `${failed.length} charges reintentados`)
  }

  async function handleVoid(c: BillingChargeRow) {
    const reason = window.prompt(`Anular charge ${c.reference_number}?\nMotivo (visible en log):`)
    if (!reason) return
    try {
      await voidCharge(c.id, reason)
      toast.info('Charge anulado', 'Recuerda anularlo también en Extensiv UI')
      await reloadCharges()
    } catch (e) {
      toast.error('No se pudo anular', e instanceof Error ? e.message : 'Error')
    }
  }

  async function handleGenerateInvoice() {
    if (!customerId) return
    setGenerating(true)
    try {
      const r = await createExtensivInvoice(customerId, fromDate, toDate)
      toast.success('Factura generada en Extensiv', `invoiceId: ${r.invoiceId || '—'}`)
      setConfirmInvoice(false)
    } catch (e) {
      toast.error('No se pudo generar', e instanceof Error ? e.message : 'Error')
    } finally {
      setGenerating(false)
    }
  }

  /* ─── Render ───────────────────────────────────────────────────────── */
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
                <Receipt size={20} /> Extensiv Billing
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Admin / cobranza · Reconciliación contra Proformas legacy · Generación de invoice mensual
              </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={customerId ?? ''}
                onChange={e => setCustomerId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-[#1e3a5f] focus:outline-none min-w-[200px]"
              >
                <option value="">— elige cliente Extensiv —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setMonth(addMonths(month, -1))}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  aria-label="Mes anterior"
                ><ChevronLeft size={14} /></button>
                <p className="text-xs font-semibold text-gray-700 min-w-[120px] text-center capitalize">
                  {monthLabel}
                </p>
                <button
                  type="button"
                  onClick={() => setMonth(addMonths(month, 1))}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  aria-label="Mes siguiente"
                ><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KPI title="Total enviado a Extensiv" value={fmtMXN(kpis.totalSent)} color="#1e3a5f" icon={<DollarSign size={14}/>} />
            <KPI title="Pendientes"               value={String(kpis.pending)}    color="#f59e0b" />
            <KPI title="Enviados"                 value={String(kpis.sent)}       color="#28a745" icon={<CheckCircle2 size={14}/>} />
            <KPI title="Fallidos"                 value={String(kpis.failed)}     color="#dc3545" icon={<AlertCircle size={14}/>} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {!customerId ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
              <p className="text-sm">Selecciona un cliente Extensiv para empezar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Tabla de charges (col-span-2) */}
              <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-700 inline-flex items-center gap-2">
                    <FileText size={14} /> Charges del período
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {kpis.failed > 0 && (
                      <button
                        type="button"
                        disabled={retrying}
                        onClick={handleRetryAllFailed}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
                      >
                        {retrying
                          ? <><Loader2 className="animate-spin" size={12} /> {retryProgress.done}/{retryProgress.total}</>
                          : <><RefreshCw size={12} /> Reintentar fallidos ({kpis.failed})</>
                        }
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setConfirmInvoice(true)}
                        disabled={generating || charges.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                        style={{ background: 'var(--brand-navy)' }}
                      >
                        <Send size={12} /> Generar invoice
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-xs">
                    <Spinner size={20} /> Cargando charges...
                  </div>
                ) : charges.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-12">
                    Sin charges en este período. Pushea desde TMS / Bitácora con el botón "Cobrar".
                  </p>
                ) : (
                  <>
                    {/* Mobile: cards */}
                    <div className="lg:hidden space-y-2 p-2">
                      {charges.map(c => (
                        <ChargeCard key={c.id} c={c} onVoid={isAdmin ? handleVoid : undefined} />
                      ))}
                    </div>

                    {/* Desktop: tabla */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Fecha</th>
                            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Source</th>
                            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Ref</th>
                            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Tipo</th>
                            <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Monto</th>
                            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Status</th>
                            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Charge ID</th>
                            <th className="px-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {charges.map(c => (
                            <tr key={c.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                              <td className="px-3 py-2 text-xs text-gray-600">{fmtDate(c.charge_date)}</td>
                              <td className="px-3 py-2 text-[11px] text-gray-500 capitalize">{c.source_table}</td>
                              <td className="px-3 py-2 text-xs font-mono text-[#1e3a5f]">{c.reference_number}</td>
                              <td className="px-3 py-2 text-[11px] text-gray-700">{c.charge_type}</td>
                              <td className="px-3 py-2 text-xs text-right font-semibold tabular-nums">{fmtMXN(Number(c.amount))}</td>
                              <td className="px-3 py-2"><StatusPill status={c.status} /></td>
                              <td className="px-3 py-2 text-[10px] font-mono text-gray-400">{c.extensiv_charge_id ?? '—'}</td>
                              <td className="px-2 py-2">
                                {isAdmin && c.status === 'sent' && (
                                  <button
                                    onClick={() => handleVoid(c)}
                                    title="Anular charge (motivo audita)"
                                    className="text-[10px] text-gray-400 hover:text-rose-600"
                                  >
                                    Anular
                                  </button>
                                )}
                                {c.status === 'failed' && c.error_message && (
                                  <span title={c.error_message} className="text-[10px] text-rose-500 cursor-help">
                                    ⚠ ver error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Panel comparativo */}
              <aside className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 inline-flex items-center gap-2">
                  <RefreshCw size={14} /> Reconciliación con Proforma legacy
                </p>

                {legacyTotal.loading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400 gap-2 text-xs">
                    <Spinner size={16} /> Calculando proforma legacy...
                  </div>
                ) : legacyTotal.error ? (
                  <p className="text-xs text-rose-600">{legacyTotal.error}</p>
                ) : (
                  <>
                    <div className="space-y-2 text-sm">
                      <CompareRow label="Total Extensiv (sent)" value={fmtMXN(kpis.totalSent)} color="#1e3a5f" />
                      <CompareRow label="Total Proforma legacy" value={fmtMXN(legacyTotal.total)} color="#64748b" />
                      <div className="border-t border-gray-100 my-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Diferencia</span>
                        <span className={`text-base font-bold tabular-nums ${
                          diffOK     ? 'text-emerald-600' :
                          diffWarn   ? 'text-amber-600'   :
                                       'text-rose-600'
                        }`}>
                          {diff >= 0 ? '+' : ''}{fmtMXN(diff)}
                          {legacyTotal.total > 0 && (
                            <span className="text-[11px] font-normal ml-1">({diffPct.toFixed(1)}%)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {customerName && (
                      <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                        {customerName} · {monthLabel}.
                        {legacyTotal.total === 0 && ' (Sin tarifarios o sin movimientos en Extensiv para el período.)'}
                      </p>
                    )}

                    <p className="text-[10px] text-gray-400 mt-2 italic">
                      Solo lectura. La proforma legacy se sigue generando desde /proformas como hoy.
                    </p>
                  </>
                )}
              </aside>
            </div>
          )}

          {/* Modal de confirmación: generar invoice */}
          {confirmInvoice && (
            <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
                <p className="text-base font-semibold text-gray-900 mb-2 inline-flex items-center gap-2">
                  <Send size={16} /> Generar invoice en Extensiv
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Vas a generar una factura en Extensiv para <strong>{customerName}</strong> con todos los charges
                  del período <strong>{monthLabel}</strong> ({kpis.sent} charges, total {fmtMXN(kpis.totalSent)}).
                  Esta acción <strong>no es reversible</strong> en el CRM (solo desde Extensiv UI).
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmInvoice(false)}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateInvoice}
                    disabled={generating}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: 'var(--brand-navy)' }}
                  >
                    {generating ? <><Loader2 className="animate-spin inline mr-1" size={14} /> Generando...</> : 'Sí, generar invoice'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

/* ─── Subcomponentes ───────────────────────────────────────────────────── */
function KPI({ title, value, color, icon }: { title: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 inline-flex items-center gap-1">
        {icon} {title}
      </p>
      <p className="kpi-number text-2xl mt-1" style={{ color }}>{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: BillingChargeRow['status'] }) {
  const map = {
    pending: { bg: 'bg-amber-50',    text: 'text-amber-700',    label: 'Pendiente' },
    sent:    { bg: 'bg-emerald-50',  text: 'text-emerald-700',  label: 'Enviado' },
    failed:  { bg: 'bg-rose-50',     text: 'text-rose-700',     label: 'Fallido' },
    voided:  { bg: 'bg-gray-100',    text: 'text-gray-600',     label: 'Anulado' },
  }[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map.bg} ${map.text}`}>
      {map.label}
    </span>
  )
}

function ChargeCard({ c, onVoid }: { c: BillingChargeRow; onVoid?: (c: BillingChargeRow) => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-mono font-semibold text-[#1e3a5f]">{c.reference_number}</span>
        <StatusPill status={c.status} />
      </div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] text-gray-500">{c.charge_type}</span>
        <span className="text-sm font-bold tabular-nums">{fmtMXN(Number(c.amount))}</span>
      </div>
      <p className="text-[10px] text-gray-400">
        {fmtDate(c.charge_date)} · {c.source_table} · {c.extensiv_charge_id ?? 'sin chargeId'}
      </p>
      {c.status === 'failed' && c.error_message && (
        <p className="text-[10px] text-rose-600 mt-1">{c.error_message}</p>
      )}
      {onVoid && c.status === 'sent' && (
        <button onClick={() => onVoid(c)} className="text-[10px] text-gray-400 hover:text-rose-600 mt-1">
          Anular
        </button>
      )}
    </div>
  )
}

function CompareRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-base font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
