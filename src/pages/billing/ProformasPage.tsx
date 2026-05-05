import { useState, useEffect } from 'react'
import { Save, CheckCircle, Download, CloudDownload, Loader2, Info } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { ProformaTable } from './components/ProformaTable'
import { type ProformaRow } from './proformaParser'
import { exportProformaXLSX } from './proformaExport'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { supabase } from '../../lib/supabase'
import {
  getExtensivOrdersByCustomer,
  getExtensivReceiversByCustomer,
  type ExtensivOrderDetail,
  type ExtensivReceiverDetail,
} from '../../lib/extensiv'

type Stage = 'idle' | 'parsing' | 'review' | 'approved'

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
const today = new Date().toISOString().split('T')[0]

const inputCls = 'px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-colors'

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="h-10 bg-gray-100 border-b border-gray-200 animate-pulse" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-100 animate-pulse">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
          <div className="h-3 w-20 bg-gray-100 rounded" />
          <div className="h-3 flex-1 bg-gray-100 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  )
}

export function ProformasPage() {
  const { clientes: CLIENTES } = useClientCatalog()

  const [stage, setStage] = useState<Stage>('idle')
  const [rows, setRows] = useState<ProformaRow[]>([])
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  // Extensiv generation state
  const [clienteF, setClienteF] = useState('')
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(today)
  const [extensivId, setExtensivId] = useState<number | null>(null)
  const [loadingExtId, setLoadingExtId] = useState(false)
  const [loadingExt, setLoadingExt] = useState(false)

  // Store Extensiv raw data for export sheets
  const [extOrders, setExtOrders] = useState<ExtensivOrderDetail[]>([])
  const [extReceivers, setExtReceivers] = useState<ExtensivReceiverDetail[]>([])

  // Fetch extensiv_customer_id when client changes
  useEffect(() => {
    setExtensivId(null)
    if (!clienteF) return
    setLoadingExtId(true)
    supabase
      .from('clients')
      .select('extensiv_customer_id')
      .eq('name', clienteF)
      .eq('is_active', true)
      .single()
      .then(({ data }) => {
        setExtensivId(data?.extensiv_customer_id ?? null)
        setLoadingExtId(false)
      })
      .catch(() => setLoadingExtId(false))
  }, [clienteF])

  const hasExtensivId = !!extensivId

  // ── Generate from Extensiv ──────────────────────────────────────────
  const handleGenerateFromExtensiv = async () => {
    if (!extensivId || !clienteF) return
    const cliente = CLIENTES.find(c => c.nombre === clienteF)
    if (!cliente) return

    setLoadingExt(true)
    setError('')
    setStage('parsing')

    try {
      // Fetch orders, receivers, and tarifarios in parallel
      const [orders, receivers, tarifasRes] = await Promise.all([
        getExtensivOrdersByCustomer(extensivId, fechaDesde, fechaHasta),
        getExtensivReceiversByCustomer(extensivId, fechaDesde, fechaHasta),
        supabase
          .from('tarifarios')
          .select('concepto, precio, categoria, unidad')
          .eq('cliente_codigo', cliente.codigo)
          .eq('activo', true)
          .order('categoria')
          .order('concepto'),
      ])

      setExtOrders(orders)
      setExtReceivers(receivers)

      const tarifas = (tarifasRes.data ?? []) as { concepto: string; precio: number; categoria: string; unidad: string }[]

      const totalEntradas = receivers.reduce((s, r) => s + r.numUnits1, 0)
      const totalSalidas = orders.reduce((s, o) => s + o.numUnits1, 0)

      const conceptQtyMap: Record<string, number> = {}
      for (const t of tarifas) {
        const cl = t.concepto.toLowerCase()
        let qty = 0
        if (cl.includes('entrada') && !cl.includes('salida')) {
          qty = totalEntradas
        } else if (cl.includes('salida') && !cl.includes('entrada')) {
          qty = totalSalidas
        } else if (cl.includes('almacenaje') && !cl.includes('adicional')) {
          qty = 0
        }
        conceptQtyMap[t.concepto] = qty
      }

      const proformaRows: ProformaRow[] = tarifas.map(t => {
        const qty = conceptQtyMap[t.concepto] ?? 0
        const total = qty * t.precio
        return {
          id: crypto.randomUUID(),
          refInterna: '',
          fecha: fechaDesde,
          cliente: clienteF,
          concepto: t.concepto,
          origen: String(qty),
          destino: String(t.precio),
          importe: Math.round(total * 100) / 100,
          tipo: t.categoria as ProformaRow['tipo'],
        }
      })

      if (proformaRows.length === 0) {
        setError(`No hay tarifarios configurados para ${clienteF}. Configúralos primero.`)
        setStage('idle')
      } else {
        setFileName(`Extensiv: ${clienteF}`)
        setRows(proformaRows)
        setStage('review')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al consultar Extensiv')
      setStage('idle')
    } finally {
      setLoadingExt(false)
    }
  }

  const handleReset = () => {
    setStage('idle')
    setRows([])
    setError('')
    setFileName('')
    setExtOrders([])
    setExtReceivers([])
  }

  const handleSave = () => {
    alert('Borrador guardado (integración Supabase pendiente)')
  }

  const handleApprove = () => {
    setStage('approved')
  }

  const handleExportXLSX = () => {
    exportProformaXLSX({
      rows,
      clientName: clienteF || 'SCC',
      from: fechaDesde,
      to: fechaHasta,
      orders: extOrders,
      receivers: extReceivers,
    })
  }

  const total = rows.reduce((s, r) => s + r.importe, 0)
  const clientes = [...new Set(rows.map(r => r.cliente).filter(c => c !== 'RESUMEN'))]

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <div className="print:hidden">
        <Header />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Borradores de Proforma</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Genera desde Extensiv · Revisa · Aprueba y exporta
              </p>
            </div>

            {stage !== 'idle' && (
              <div className="flex items-center gap-2 text-xs">
                {(['Fuente', 'Revisar', 'Aprobar'] as const).map((label, i) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      (stage === 'parsing' && i === 0) ||
                      (stage === 'review' && i === 1) ||
                      (stage === 'approved' && i === 2)
                        ? 'bg-[#1e3a5f] text-white'
                        : (stage === 'review' && i === 0) ||
                          (stage === 'approved' && i < 2)
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}>{i + 1}</div>
                    <span className="text-gray-500 hidden sm:inline">{label}</span>
                    {i < 2 && <span className="text-gray-300">›</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Source: only Extensiv generation ── */}
          {stage === 'idle' && (
            <div className="max-w-2xl mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CloudDownload size={18} className="text-[#1e3a5f]" />
                  <p className="text-sm font-bold text-[#1e3a5f]">Generar desde Extensiv</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cliente</label>
                    <select
                      className={`${inputCls} w-full`}
                      value={clienteF}
                      onChange={e => { setClienteF(e.target.value); setError('') }}
                    >
                      <option value="">— Seleccionar cliente —</option>
                      {CLIENTES.map(c => (
                        <option key={c.codigo} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Desde</label>
                      <input type="date" className={inputCls} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hasta</label>
                      <input type="date" className={inputCls} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                    </div>
                  </div>

                  {clienteF && (
                    <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                      loadingExtId ? 'text-gray-500 bg-gray-50 border border-gray-100'
                      : hasExtensivId
                        ? 'text-green-700 bg-green-50 border border-green-100'
                        : 'text-amber-700 bg-amber-50 border border-amber-100'
                    }`}>
                      <Info size={12} className="shrink-0" />
                      {loadingExtId
                        ? 'Verificando...'
                        : hasExtensivId
                          ? `Vinculado a Extensiv (ID: ${extensivId})`
                          : 'Sin ID de Extensiv — vincula al cliente primero'}
                    </div>
                  )}

                  <button
                    onClick={handleGenerateFromExtensiv}
                    disabled={!clienteF || !hasExtensivId || loadingExt || loadingExtId}
                    className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] hover:opacity-90 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity"
                    style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.3)' }}
                  >
                    {loadingExt
                      ? <><Loader2 size={15} className="animate-spin" /> Consultando Extensiv...</>
                      : <><CloudDownload size={15} /> Generar Proforma</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="max-w-4xl mb-4">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            </div>
          )}

          {/* ── Skeleton ── */}
          {stage === 'parsing' && <TableSkeleton />}

          {/* ── Resumen ── */}
          {(stage === 'review' || stage === 'approved') && rows.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 max-w-4xl">
                {[
                  { label: 'Fuente', value: fileName, small: true },
                  { label: 'Clientes', value: clientes.join(', ') || '—', small: true },
                  { label: 'Total a facturar', value: fmt(total), accent: true },
                ].map(c => (
                  <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                    <p className={`font-semibold truncate ${c.accent ? 'text-[#1e3a5f] text-lg' : 'text-gray-800 text-sm'}`}>
                      {c.value}
                    </p>
                  </div>
                ))}
              </div>

              {stage === 'approved' && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 max-w-4xl">
                  <CheckCircle size={17} className="text-green-600 shrink-0" />
                  <p className="text-sm font-medium text-green-700">Proforma aprobada. Lista para exportar.</p>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Borrador interactivo — haz clic en{' '}
                  <span className="inline-flex items-center gap-0.5 text-gray-400"><span className="w-3 h-3 inline-block">✏</span></span>
                  {' '}para editar cualquier campo
                </p>
                <ProformaTable rows={rows} onChange={setRows} />
              </div>

              {/* ── Acciones ── */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Nueva Proforma
                </button>

                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Save size={15} /> Guardar borrador
                </button>

                {stage !== 'approved' && (
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors shadow-sm"
                    style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.3)' }}
                  >
                    <CheckCircle size={15} /> Aprobar Proforma
                  </button>
                )}

                <button
                  onClick={handleExportXLSX}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#28a745] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors"
                >
                  <Download size={15} /> Exportar Excel
                </button>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  )
}
