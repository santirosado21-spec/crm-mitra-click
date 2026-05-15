import { useState } from 'react'
import { FileStack, Plus, Trash2, X, Save, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useOrderTemplates } from '../../hooks/useOrderTemplates'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import type { OrderTemplatePayload } from '../../types/techship'

const CARRIERS = ['estafeta', 'ups', 'fedex', 'dhl', 'castores']

interface DraftTemplate {
  nombre:      string
  descripcion: string
  cliente_id:  string | null
  payload:     OrderTemplatePayload
}

const EMPTY: DraftTemplate = {
  nombre: '', descripcion: '', cliente_id: null,
  payload: { carrier: '', service: '', weight_kg: 1, length_cm: 30, width_cm: 20, height_cm: 10 },
}

export function OrderTemplatesPage() {
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const toast = useToast()
  const { templates, loading, create, remove } = useOrderTemplates()
  const { clientes } = useClientCatalog()

  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<DraftTemplate>(EMPTY)
  const [saving, setSaving] = useState(false)

  const setP = (patch: Partial<OrderTemplatePayload>) =>
    setDraft(d => ({ ...d, payload: { ...d.payload, ...patch } }))

  const handleSave = async () => {
    if (!draft.nombre.trim()) return
    setSaving(true)
    try {
      await create({
        nombre: draft.nombre.trim(), descripcion: draft.descripcion,
        cliente_id: draft.cliente_id, payload: draft.payload, creado_por: user?.email ?? null,
      })
      toast.success('Plantilla creada', draft.nombre)
      setDraft(EMPTY)
      setFormOpen(false)
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : '')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return
    try { await remove(id); toast.success('Plantilla eliminada') }
    catch (e) { toast.error('Error', e instanceof Error ? e.message : '') }
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 touch-pan-y">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <FileStack size={20} /> {t('nav.templates')}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Plantillas reutilizables para órdenes recurrentes — se cargan al importar.
              </p>
            </div>
            <button onClick={() => { setDraft(EMPTY); setFormOpen(true) }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--brand-navy)' }}>
              <Plus size={13} /> Nueva plantilla
            </button>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Spinner size={28} /></div>
          ) : templates.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">{t('common.noData')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map(tpl => (
                <div key={tpl.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1e3a5f] truncate">{tpl.nombre}</p>
                      <p className="text-[11px] text-gray-400">{tpl.descripcion || 'Sin descripción'}</p>
                    </div>
                    <button onClick={() => handleDelete(tpl.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {tpl.payload.carrier && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{tpl.payload.carrier}</span>}
                    {tpl.payload.service && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{tpl.payload.service}</span>}
                    {tpl.payload.weight_kg != null && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{tpl.payload.weight_kg} kg</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Usos: <b className="text-gray-600">{tpl.use_count}</b></span>
                    <span>{tpl.last_used_at ? `Último: ${tpl.last_used_at.slice(0, 10)}` : 'Sin usar'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1e3a5f]">Nueva plantilla de orden</h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Nombre *</label>
                <input value={draft.nombre} onChange={e => setDraft(d => ({ ...d, nombre: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Descripción</label>
                <input value={draft.descripcion} onChange={e => setDraft(d => ({ ...d, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Cliente</label>
                <select value={draft.cliente_id ?? ''} onChange={e => setDraft(d => ({ ...d, cliente_id: e.target.value || null }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none">
                  <option value="">— Cualquiera —</option>
                  {clientes.filter(c => c.id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Carrier</label>
                <select value={draft.payload.carrier ?? ''} onChange={e => setP({ carrier: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none">
                  <option value="">— Auto —</option>
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Servicio</label>
                <input value={draft.payload.service ?? ''} onChange={e => setP({ service: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Peso (kg)</label>
                <input type="number" step="any" value={draft.payload.weight_kg ?? ''} onChange={e => setP({ weight_kg: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-2 col-span-2">
                <input type="number" placeholder="Largo" value={draft.payload.length_cm ?? ''} onChange={e => setP({ length_cm: Number(e.target.value) || 0 })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
                <input type="number" placeholder="Ancho" value={draft.payload.width_cm ?? ''} onChange={e => setP({ width_cm: Number(e.target.value) || 0 })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
                <input type="number" placeholder="Alto" value={draft.payload.height_cm ?? ''} onChange={e => setP({ height_cm: Number(e.target.value) || 0 })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex justify-end gap-2">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!draft.nombre.trim() || saving}
                className="px-5 py-2 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold disabled:opacity-40 inline-flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
