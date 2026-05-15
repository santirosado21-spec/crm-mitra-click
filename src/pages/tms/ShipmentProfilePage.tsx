import { useState } from 'react'
import { PieChart, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { BarPanel, PiePanel } from '../../components/parcel/MetricPanels'
import { useShipmentProfileMetrics, type ShipmentProfileFilters, type DateRangePreset } from '../../hooks/useShipmentProfileMetrics'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { PAQUETERIA_LABEL } from '../../types/guias'

const fmtMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

const CARRIERS = ['estafeta', 'ups', 'fedex', 'dhl', 'castores']
const RANGES: [DateRangePreset, string][] = [['mtd', 'MTD'], ['l7', 'L7'], ['l30', 'L30'], ['custom', 'Custom']]

export function ShipmentProfilePage() {
  const { t } = useTranslation()
  const { clientes } = useClientCatalog()
  const [filters, setFilters] = useState<ShipmentProfileFilters>({ clientIds: [], carriers: [], range: 'l30' })
  const { loading, metrics, rows, refetch } = useShipmentProfileMetrics(filters)

  const toggleClient = (id: string) => setFilters(f => ({
    ...f, clientIds: f.clientIds.includes(id) ? f.clientIds.filter(x => x !== id) : [...f.clientIds, id],
  }))
  const toggleCarrier = (c: string) => setFilters(f => ({
    ...f, carriers: f.carriers.includes(c) ? f.carriers.filter(x => x !== c) : [...f.carriers, c],
  }))

  const kpis = [
    { label: t('shipmentProfile.totalPackages'), value: String(metrics.totalPackages) },
    { label: t('shipmentProfile.totalPaid'),     value: fmtMXN(metrics.totalPaid) },
    { label: t('shipmentProfile.totalCost'),     value: fmtMXN(metrics.totalCost) },
    { label: t('shipmentProfile.avgCost'),       value: fmtMXN(metrics.avgCost) },
  ]

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 touch-pan-y">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <PieChart size={20} /> {t('shipmentProfile.title')}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{t('shipmentProfile.subtitle')}</p>
            </div>
            <button onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
              <RefreshCw size={13} /> Actualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {RANGES.map(([k, label]) => (
                <button key={k} onClick={() => setFilters(f => ({ ...f, range: k }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filters.range === k ? 'text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                  style={filters.range === k ? { background: 'var(--brand-navy)' } : undefined}>
                  {label}
                </button>
              ))}
            </div>
            {filters.range === 'custom' && (
              <>
                <input type="date" value={filters.customFrom ?? ''} onChange={e => setFilters(f => ({ ...f, customFrom: e.target.value }))}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none" />
                <input type="date" value={filters.customTo ?? ''} onChange={e => setFilters(f => ({ ...f, customTo: e.target.value }))}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none" />
              </>
            )}
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex flex-wrap gap-1">
              {CARRIERS.map(c => (
                <button key={c} onClick={() => toggleCarrier(c)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    filters.carriers.includes(c) ? 'text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                  style={filters.carriers.includes(c) ? { background: 'var(--brand-navy)' } : undefined}>
                  {PAQUETERIA_LABEL[c as keyof typeof PAQUETERIA_LABEL] ?? c}
                </button>
              ))}
            </div>
            <div className="h-5 w-px bg-gray-200" />
            <select onChange={e => { if (e.target.value) toggleClient(e.target.value); e.target.value = '' }}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none">
              <option value="">+ Cliente…</option>
              {clientes.filter(c => c.id && !filters.clientIds.includes(c.id)).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {filters.clientIds.map(id => {
              const c = clientes.find(x => x.id === id)
              return (
                <button key={id} onClick={() => toggleClient(id)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-white inline-flex items-center gap-1"
                  style={{ background: 'var(--brand-navy)' }}>
                  {c?.nombre ?? id.slice(0, 6)} ×
                </button>
              )
            })}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {kpis.map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.label}</p>
                <p className="text-xl font-bold text-[#1e3a5f] tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Spinner size={28} /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">
                <BarPanel title="Paquetes por carrier" data={metrics.byCarrier} />
                <BarPanel title="Paquetes por servicio" data={metrics.byService} />
                <BarPanel title="Paquetes por cuenta de facturación" data={metrics.byCarrierAccount} />
                <PiePanel title="Paquetes por país" data={metrics.byCountry} />
                <BarPanel title="Top destinos (CP)" data={metrics.byDestination} />
                <BarPanel title="Costo por carrier" data={metrics.costByCarrier} />
                <PiePanel title="Términos de pago" data={metrics.paymentTerms} />
                <BarPanel title="Margen / markup por carrier" data={metrics.marginByCarrier} />
                <BarPanel title="Rangos de peso" data={metrics.weightBreaks} />
              </div>

              {/* Tabla de detalle */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 pt-3">
                  Detalle de paquetes ({rows.length})
                </p>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-500 uppercase text-[10px]">
                        <th className="px-3 py-2">Tracking</th>
                        <th className="px-3 py-2">{t('common.carrier')}</th>
                        <th className="px-3 py-2">{t('common.service')}</th>
                        <th className="px-3 py-2">{t('common.date')}</th>
                        <th className="px-3 py-2 text-right">{t('common.cost')}</th>
                        <th className="px-3 py-2 text-right">{t('common.price')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 100).map(g => (
                        <tr key={g.id} className="border-b border-gray-50">
                          <td className="px-3 py-1.5 font-mono text-gray-600">{g.tracking_number}</td>
                          <td className="px-3 py-1.5">{g.paqueteria}</td>
                          <td className="px-3 py-1.5 text-gray-500">{g.auto_pick_service ?? '—'}</td>
                          <td className="px-3 py-1.5 text-gray-400">{g.fecha}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtMXN(Number(g.costo) || 0)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtMXN(Number(g.precio) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
