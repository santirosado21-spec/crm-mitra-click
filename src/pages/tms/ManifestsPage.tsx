import { useMemo, useState } from 'react'
import { ClipboardList, Plus, FileCheck, Loader2, Trash2, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { CreateManifestModal } from '../../components/parcel/CreateManifestModal'
import { useManifests } from '../../hooks/useManifests'
import { useGuiasPaqueteria } from '../../hooks/useGuiasPaqueteria'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { finalizeManifest } from '../../lib/carriers/manifests'
import { supabase } from '../../lib/supabase'

type Tab = 'finalize' | 'history'

export function ManifestsPage() {
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const toast = useToast()
  const { manifests, loading, createManifest, markFinalized, remove } = useManifests()
  const { guias } = useGuiasPaqueteria({ trackingStatus: 'comprado' })

  const [tab, setTab] = useState<Tab>('finalize')
  const [createOpen, setCreateOpen] = useState(false)
  const [finalizing, setFinalizing] = useState<string | null>(null)

  const manifestedGuiaIds = useMemo(() => {
    const s = new Set<string>()
    for (const m of manifests) for (const gid of m.guia_ids) s.add(gid)
    return s
  }, [manifests])

  const openManifests = manifests.filter(m => m.status === 'abierto')
  const historyManifests = manifests.filter(m => m.status !== 'abierto')

  const handleCreate = async (carrier: string, provider: string, guiaIds: string[]) => {
    try {
      await createManifest({ carrier, provider, guiaIds, creadoPor: user?.email ?? null })
      toast.success('Manifiesto creado', `${guiaIds.length} guías`)
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : '')
    }
  }

  const handleFinalize = async (manifestId: string) => {
    const m = manifests.find(x => x.id === manifestId)
    if (!m) return
    setFinalizing(manifestId)
    try {
      // Carga las guías del manifiesto por id — no por estado. El hook
      // useGuiasPaqueteria solo trae las 'comprado', y un manifiesto puede
      // contener guías ya avanzadas (en tránsito/entregado) que de otro modo
      // se caerían del PDF.
      const { data: guiaRows, error: guiaErr } = await supabase
        .from('guias_paqueteria')
        .select('tracking_number, cliente_codigo, to_postal_code')
        .in('id', m.guia_ids)
      if (guiaErr) throw guiaErr
      const guiaLines = (guiaRows ?? []).map(g => ({
        tracking_number: g.tracking_number,
        cliente: g.cliente_codigo ?? '—',
        destino: g.to_postal_code ?? '—',
      }))
      const result = await finalizeManifest({
        folio: m.folio, carrier: m.carrier, provider: m.provider,
        fecha: m.fecha, guias: guiaLines, trackingNumbers: guiaLines.map(g => g.tracking_number),
      })
      await markFinalized(manifestId, result.pdf_url, result.provider_manifest_id)
      if (result.pdf_url) window.open(result.pdf_url, '_blank')
      toast.success('Manifiesto finalizado', result.note ?? `vía ${result.source}`)
    } catch (e) {
      toast.error('Error al finalizar', e instanceof Error ? e.message : '')
    } finally {
      setFinalizing(null)
    }
  }

  const list = tab === 'finalize' ? openManifests : historyManifests

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 touch-pan-y">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <ClipboardList size={20} /> {t('manifests.title')}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{t('manifests.subtitle')}</p>
            </div>
            <button onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--brand-navy)' }}>
              <Plus size={13} /> Nuevo manifiesto
            </button>
          </div>

          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {([['finalize', t('manifests.finalize')], ['history', t('manifests.history')]] as [Tab, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === k ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Spinner size={28} /></div>
          ) : list.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">{t('common.noData')}</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500 uppercase text-[10px]">
                    <th className="px-3 py-2.5">{t('manifests.folio')}</th>
                    <th className="px-3 py-2.5">{t('common.carrier')}</th>
                    <th className="px-3 py-2.5">{t('common.date')}</th>
                    <th className="px-3 py-2.5 text-right">{t('manifests.totalGuias')}</th>
                    <th className="px-3 py-2.5">{t('common.status')}</th>
                    <th className="px-3 py-2.5 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="px-3 py-2 font-mono font-semibold text-gray-700">{m.folio}</td>
                      <td className="px-3 py-2 uppercase">{m.carrier}</td>
                      <td className="px-3 py-2 text-gray-500">{m.fecha}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.guia_ids.length}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ background: m.status === 'finalizado' ? '#28a745' : m.status === 'cancelado' ? '#c8373c' : '#ffc107' }}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {m.status === 'abierto' && (
                            <button onClick={() => handleFinalize(m.id)} disabled={finalizing === m.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white disabled:opacity-40"
                              style={{ background: 'var(--brand-navy)' }}>
                              {finalizing === m.id ? <Loader2 className="animate-spin" size={11} /> : <FileCheck size={11} />}
                              Finalizar
                            </button>
                          )}
                          {m.pdf_url && (
                            <a href={m.pdf_url} target="_blank" rel="noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f]">
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button onClick={() => remove(m.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <CreateManifestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        guias={guias}
        manifestedGuiaIds={manifestedGuiaIds}
        onCreate={handleCreate}
      />
    </div>
  )
}
