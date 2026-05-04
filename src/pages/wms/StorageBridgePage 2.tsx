import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, AlertTriangle, CheckCircle2, FileSpreadsheet, DollarSign } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useMonthlyStorageCalc, monthName } from '../../hooks/useMonthlyStorageCalc'
import { exportBindERPSingleClient, exportBindERPAllClients } from '../../lib/bindErpExporter'

export function StorageBridgePage() {
  const navigate = useNavigate()
  const today = new Date()

  // Default: previous complete month (you don't bill the current one yet)
  const defaultDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const [year, setYear] = useState(defaultDate.getFullYear())
  const [month, setMonth] = useState(defaultDate.getMonth() + 1)
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false)
  const [exportError, setExportError] = useState('')

  const { rows, totals, status, error, lastFetch, fetchNow } = useMonthlyStorageCalc(year, month)

  const filtered = useMemo(() => {
    return onlyDiscrepancies
      ? rows.filter(r => (r.discrepancyPct ?? 0) > 0.05 || (!r.tariffUnit && r.positions > 0))
      : rows
  }, [rows, onlyDiscrepancies])

  const handleExportClient = (rowIdx: number) => {
    setExportError('')
    try {
      exportBindERPSingleClient(rows[rowIdx], year, month)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Error al exportar')
    }
  }

  const handleExportAll = () => {
    setExportError('')
    try {
      exportBindERPAllClients(rows.filter(r => r.storageMXN > 0), year, month)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Error al exportar')
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <button
            onClick={() => navigate('/wms')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1e3a5f] mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Volver a Herramientas de WMS
          </button>

          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Bridge Facturación</h1>
              <p className="text-xs text-gray-500 mt-1">
                Calcula el storage mensual de cada cliente usando Extensiv + tarifarios, exporta a Bind ERP.
              </p>
            </div>

            {/* Period + refresh */}
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                {months.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={fetchNow}
                disabled={status === 'loading'}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#16304d] disabled:opacity-60"
              >
                <RefreshCw size={12} className={status === 'loading' ? 'animate-spin' : ''} />
                {status === 'loading' ? 'Calculando...' : 'Recalcular'}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          {exportError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} /> {exportError}
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPI label="Clientes con storage" value={String(totals.clients)} color="#1e3a5f" />
            <KPI
              label="Total MXN esperado"
              value={new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(totals.expectedMXN)}
              color="#059669"
            />
            <KPI label="Sin tarifa configurada" value={String(totals.missingTariff)} color="#d97706" />
            <KPI
              label="Discrepancias >5%"
              value={String(rows.filter(r => (r.discrepancyPct ?? 0) > 0.05).length)}
              color="#dc2626"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyDiscrepancies}
                onChange={e => setOnlyDiscrepancies(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              Solo mostrar discrepancias o sin tarifa
            </label>
            <button
              onClick={handleExportAll}
              disabled={totals.expectedMXN === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#1e3a5f] bg-white text-xs font-semibold text-[#1e3a5f] hover:bg-[#1e3a5f]/5 disabled:opacity-40"
            >
              <Download size={12} /> Exportar todos (Bind ERP)
            </button>
          </div>

          {/* Results table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-gray-500">Código</th>
                  <th className="text-right px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-gray-500">Posiciones</th>
                  <th className="text-right px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-gray-500">M²</th>
                  <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-gray-500">Tarifa</th>
                  <th className="text-right px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-gray-500">Calculado</th>
                  <th className="text-right px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-gray-500">Proforma</th>
                  <th className="text-center px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-gray-500">Estado</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody>
                {status === 'loading' && rows.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-xs text-gray-400">Calculando storage del mes...</td></tr>
                )}
                {filtered.map((r, idx) => {
                  const discrepancy = (r.discrepancyPct ?? 0) > 0.05
                  const hasIssue = discrepancy || (!r.tariffUnit && r.positions > 0)
                  return (
                    <tr key={r.customerId || r.customerName} className={`border-b border-gray-50 hover:bg-gray-50/50 ${hasIssue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{r.customerName}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{r.clienteCodigo ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-gray-700">{r.positions}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-500">{r.totalM2 > 0 ? r.totalM2.toFixed(1) : '—'}</td>
                      <td className="px-4 py-2.5 text-[11px]">
                        {r.tariffUnit ? (
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <span className="font-mono font-semibold">{r.tariffUnit}</span>
                            <span className="text-gray-400">·</span>
                            <span>${r.tariffRate.toLocaleString('es-MX')}</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold">{r.note ?? 'Sin tarifa'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-[#1e3a5f]">
                        {r.storageMXN > 0
                          ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(r.storageMXN)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                        {r.proformaMXN !== null
                          ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(r.proformaMXN)
                          : <span className="text-gray-300">(no proforma)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {!r.tariffUnit && r.positions > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">
                            <AlertTriangle size={10} /> Sin tarifa
                          </span>
                        ) : discrepancy ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold" title={`Diferencia: ${Math.round((r.discrepancyPct ?? 0) * 100)}%`}>
                            <AlertTriangle size={10} /> Discrepancia
                          </span>
                        ) : r.storageMXN > 0 && r.hasProforma ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-semibold">
                            <CheckCircle2 size={10} /> OK
                          </span>
                        ) : r.storageMXN > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                            Pendiente proforma
                          </span>
                        ) : (
                          <span className="text-gray-300 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleExportClient(idx)}
                          disabled={r.storageMXN === 0 || !r.tariffUnit}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-[#1e3a5f] hover:bg-[#1e3a5f]/5 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                          <FileSpreadsheet size={11} /> Exportar
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && status === 'ready' && (
                  <tr><td colSpan={9} className="text-center py-12 text-xs text-gray-400">Sin resultados con los filtros actuales</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {lastFetch && (
            <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
              <DollarSign size={10} />
              Última actualización: {lastFetch.toLocaleString('es-MX')}
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
