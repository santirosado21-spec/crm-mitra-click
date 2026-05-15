import { useMemo, useState } from 'react'
import {
  Package, Upload, Download, Printer, Zap, Search, Loader2, RefreshCw, Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { NoPrintFoundIndicator } from '../../components/parcel/NoPrintFoundIndicator'
import { ParcelOrderImportModal } from './ParcelOrderImportModal'
import { useParcelOrders, type ParcelOrder } from '../../hooks/useParcelOrders'
import { usePrintQueue } from '../../hooks/usePrintQueue'
import { useOrderTemplates } from '../../hooks/useOrderTemplates'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { PAQUETERIA_LABEL, type TrackingStatus } from '../../types/guias'

const fmtMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'

const STATUS_LABEL: Record<TrackingStatus, string> = {
  cotizado: 'Cotizado', comprado: 'Comprado', en_transito: 'En tránsito',
  entregado: 'Entregado', excepcion: 'Excepción', devuelto: 'Devuelto',
}
const STATUS_COLOR: Record<TrackingStatus, string> = {
  cotizado: '#94a3b8', comprado: '#3b82f6', en_transito: '#f97316',
  entregado: '#28a745', excepcion: '#c8373c', devuelto: '#ffc107',
}

export function ParcelOrdersPage() {
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const toast = useToast()
  const { orders, loading, kpis, refetch, bulkInsert, processAndPrint, exportXlsx, remove } = useParcelOrders()
  const { enqueue } = usePrintQueue(user?.email)
  const { templates } = useOrderTemplates()
  const { clientes } = useClientCatalog()

  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState<TrackingStatus | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importOpen, setImportOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter(o => {
      if (statusF && o.tracking_status !== statusF) return false
      if (!q) return true
      return `${o.tracking_number} ${o.manual_reference ?? ''} ${o.clients?.name ?? ''}`
        .toLowerCase().includes(q)
    })
  }, [orders, search, statusF])

  const toggleRow = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  const toggleAll = () =>
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(o => o.id)))

  const selectedOrders = filtered.filter(o => selected.has(o.id))
  // "NO PRINT CLIENTS FOUND": hay seleccionadas pero ninguna tiene etiqueta imprimible.
  const showNoPrint = selectedOrders.length > 0 && selectedOrders.every(o => !o.label_url)

  const handleProcessPrint = async () => {
    if (selected.size === 0) { toast.info('Selecciona órdenes'); return }
    setProcessing(true)
    try {
      const ids = [...selected]
      const result = await processAndPrint(ids)
      if (result.failed === 0) toast.success(`${result.ok} órdenes procesadas`)
      else toast.error(`${result.ok} OK · ${result.failed} fallaron`, result.errors.slice(0, 2).join(' · '))
      setSelected(new Set())
    } catch (e) {
      toast.error('Error al procesar', e instanceof Error ? e.message : '')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = async () => {
    const printable = selectedOrders.filter(o => o.label_url)
    if (printable.length === 0) { toast.info('Sin etiquetas', 'Las órdenes seleccionadas no tienen etiqueta.'); return }
    if (!user?.email) return
    try {
      const email = user.email
      await enqueue(printable.map(o => ({
        guia_id: o.id, user_email: email, label_url: o.label_url ?? null,
        tracking_number: o.tracking_number, carrier: o.paqueteria, status: 'pendiente' as const,
      })))
      toast.success(`${printable.length} etiquetas enviadas a la cola de impresión`)
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : '')
    }
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`¿Eliminar ${selected.size} órdenes?`)) return
    for (const id of selected) { try { await remove(id) } catch { /* skip */ } }
    setSelected(new Set())
    toast.success('Órdenes eliminadas')
  }

  const handleImport = async (rows: Parameters<typeof bulkInsert>[0], fileName: string) => {
    const n = await bulkInsert(rows)
    toast.success(`${n} órdenes importadas`, fileName)
  }

  const kpiCards = [
    { label: t('common.total'), value: kpis.total },
    { label: 'Cotizadas', value: kpis.cotizadas },
    { label: 'Compradas', value: kpis.compradas },
    { label: 'Entregadas', value: kpis.entregadas },
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
                <Package size={20} /> {t('orders.title')}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{t('orders.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleProcessPrint} disabled={processing || selected.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                style={{ background: 'var(--brand-navy)' }}>
                {processing ? <Loader2 className="animate-spin" size={13} /> : <Zap size={13} />}
                {t('orders.processPrint')}
              </button>
              <button onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                <Upload size={13} /> {t('common.import')}
              </button>
              <button onClick={() => exportXlsx(filtered)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                <Download size={13} /> {t('common.export')}
              </button>
              <button onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                <Printer size={13} /> {t('common.print')}
              </button>
              <button onClick={handleDelete} disabled={selected.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40">
                <Trash2 size={13} /> {t('common.actions')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {kpiCards.map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.label}</p>
                <p className="text-xl font-bold text-[#1e3a5f] tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>

          {showNoPrint && <div className="mb-4"><NoPrintFoundIndicator show /></div>}

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search')}
                className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none w-56" />
            </div>
            <select value={statusF} onChange={e => setStatusF(e.target.value as TrackingStatus | '')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none">
              <option value="">{t('common.all')}</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={refetch} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
              <RefreshCw size={14} />
            </button>
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} órdenes · {selected.size} sel.</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 flex justify-center"><Spinner size={28} /></div>
            ) : filtered.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-400">{t('common.noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 uppercase text-[10px]">
                      <th className="px-3 py-2.5 w-8">
                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      </th>
                      <th className="px-3 py-2.5">{t('orders.transId')}</th>
                      <th className="px-3 py-2.5">{t('orders.orderNum')}</th>
                      <th className="px-3 py-2.5">{t('common.client')}</th>
                      <th className="px-3 py-2.5">{t('common.carrier')}</th>
                      <th className="px-3 py-2.5">{t('common.service')}</th>
                      <th className="px-3 py-2.5">{t('orders.trackingNum')}</th>
                      <th className="px-3 py-2.5 text-right">{t('orders.charge')}</th>
                      <th className="px-3 py-2.5">{t('orders.createdOn')}</th>
                      <th className="px-3 py-2.5">{t('common.status')}</th>
                      <th className="px-3 py-2.5">{t('orders.printStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o: ParcelOrder) => {
                      const st = (o.tracking_status ?? 'cotizado') as TrackingStatus
                      return (
                        <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleRow(o.id)} />
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-400">{o.id.slice(0, 8)}</td>
                          <td className="px-3 py-2 font-semibold text-gray-700">{o.manual_reference ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{o.clients?.name ?? '—'}</td>
                          <td className="px-3 py-2">{PAQUETERIA_LABEL[o.paqueteria] ?? o.paqueteria}</td>
                          <td className="px-3 py-2 text-gray-500">{o.auto_pick_service ?? '—'}</td>
                          <td className="px-3 py-2 font-mono text-gray-600">{o.tracking_number}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtMXN(Number(o.precio) || 0)}</td>
                          <td className="px-3 py-2 text-gray-500">{fmtDate(o.created_at)}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                              style={{ background: STATUS_COLOR[st] }}>
                              {STATUS_LABEL[st]}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {o.label_url
                              ? <span className="text-green-600 font-semibold">Listo</span>
                              : <span className="text-gray-400">Pendiente</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <ParcelOrderImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={handleImport}
        clientes={clientes}
        templates={templates}
        creadoPor={user?.email ?? null}
      />
    </div>
  )
}
