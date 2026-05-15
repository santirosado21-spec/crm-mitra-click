import { useState } from 'react'
import { Gauge, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { BarPanel } from '../../components/parcel/MetricPanels'
import { useDeliveryPerformanceMetrics, type DeliveryFilters } from '../../hooks/useDeliveryPerformanceMetrics'
import { PAQUETERIA_LABEL } from '../../types/guias'

const CARRIERS = ['estafeta', 'ups', 'fedex', 'dhl', 'castores']
const RANGES: [number, string][] = [[7, 'L7'], [30, 'L30'], [90, 'L90']]

export function DeliveryPerformancePage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<DeliveryFilters>({ clientIds: [], carriers: [], days: 30 })
  const { loading, metrics, exceptions, inTransitRows, refetch } = useDeliveryPerformanceMetrics(filters)

  const toggleCarrier = (c: string) => setFilters(f => ({
    ...f, carriers: f.carriers.includes(c) ? f.carriers.filter(x => x !== c) : [...f.carriers, c],
  }))

  const kpis = [
    { label: t('delivery.onTime'),          value: `${metrics.onTimeDeliveryPct}%`,  color: '#28a745' },
    { label: 'Performance',                 value: `${metrics.performancePct}%`,     color: '#1e3a5f' },
    { label: t('delivery.onTimeInduction'), value: `${metrics.onTimeInductionPct}%`, color: '#3b82f6' },
    { label: t('delivery.delayed'),         value: String(metrics.delayed),          color: '#ffc107' },
    { label: t('delivery.returned'),        value: String(metrics.returned),         color: '#c8373c' },
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
                <Gauge size={20} /> {t('delivery.title')}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{t('delivery.subtitle')}</p>
            </div>
            <button onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
              <RefreshCw size={13} /> Actualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {RANGES.map(([d, label]) => (
                <button key={d} onClick={() => setFilters(f => ({ ...f, days: d }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filters.days === d ? 'text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                  style={filters.days === d ? { background: 'var(--brand-navy)' } : undefined}>
                  {label}
                </button>
              ))}
            </div>
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
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            {kpis.map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.label}</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Spinner size={28} /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                <BarPanel title="Entregas a tiempo por cliente" data={metrics.onTimeDeliveryByClient} />
                <BarPanel title="Inducción a tiempo por cliente" data={metrics.onTimeInductionByClient} />
                <BarPanel title="Retrasados por cliente" data={metrics.delayedByClient} />
                <BarPanel title="Devoluciones por cliente" data={metrics.returnedByClient} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Exception tracking */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 pt-3">
                    Excepciones de tracking ({exceptions.length})
                  </p>
                  <div className="overflow-x-auto mt-2 max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-left text-gray-500 uppercase text-[10px]">
                          <th className="px-3 py-2">Tracking</th>
                          <th className="px-3 py-2">{t('common.carrier')}</th>
                          <th className="px-3 py-2">{t('common.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exceptions.length === 0 ? (
                          <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Sin excepciones</td></tr>
                        ) : exceptions.map(g => (
                          <tr key={g.id} className="border-b border-gray-50">
                            <td className="px-3 py-1.5 font-mono text-gray-600">{g.tracking_number}</td>
                            <td className="px-3 py-1.5">{g.paqueteria}</td>
                            <td className="px-3 py-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                style={{ background: g.tracking_status === 'devuelto' ? '#c8373c' : '#ffc107' }}>
                                {g.tracking_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* In transit activity */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 pt-3">
                    Actividad en tránsito ({inTransitRows.length})
                  </p>
                  <div className="overflow-x-auto mt-2 max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-left text-gray-500 uppercase text-[10px]">
                          <th className="px-3 py-2">Tracking</th>
                          <th className="px-3 py-2">{t('common.carrier')}</th>
                          <th className="px-3 py-2">{t('common.date')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inTransitRows.length === 0 ? (
                          <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Sin envíos en tránsito</td></tr>
                        ) : inTransitRows.map(g => (
                          <tr key={g.id} className="border-b border-gray-50">
                            <td className="px-3 py-1.5 font-mono text-gray-600">{g.tracking_number}</td>
                            <td className="px-3 py-1.5">{g.paqueteria}</td>
                            <td className="px-3 py-1.5 text-gray-400">{g.fecha}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
