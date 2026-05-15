import { useMemo, useState } from 'react'
import { Percent, Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { MarkupRuleEditor } from '../../components/parcel/MarkupRuleEditor'
import { useMarkupProfiles } from '../../hooks/useMarkupProfiles'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { useToast } from '../../hooks/useToast'
import type { CreateMarkupRuleData } from '../../types/techship'

export function MarkupProfilesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { profiles, rules, loading, createProfile, updateProfile, removeProfile, saveRules } = useMarkupProfiles()
  const { clientes } = useClientCatalog()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftRules, setDraftRules] = useState<CreateMarkupRuleData[]>([])
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const selected = profiles.find(p => p.id === selectedId) ?? null

  // Carga las reglas del perfil seleccionado en el borrador editable.
  const selectProfile = (id: string) => {
    setSelectedId(id)
    setDraftRules(
      rules.filter(r => r.profile_id === id).map(r => ({
        profile_id: r.profile_id, cliente_id: r.cliente_id, carrier: r.carrier,
        service: r.service, markup_pct: r.markup_pct, min_markup: r.min_markup,
        max_markup: r.max_markup, prioridad: r.prioridad,
      })),
    )
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const p = await createProfile({
        nombre: newName.trim(), descripcion: '', activo: true, prioridad: 100,
      })
      setNewName('')
      selectProfile(p.id)
      toast.success('Perfil creado', p.nombre)
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : '')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveRules = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await saveRules(selectedId, draftRules)
      toast.success('Reglas guardadas')
    } catch (e) {
      toast.error('Error al guardar', e instanceof Error ? e.message : '')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este perfil y sus reglas?')) return
    try {
      await removeProfile(id)
      if (selectedId === id) { setSelectedId(null); setDraftRules([]) }
      toast.success('Perfil eliminado')
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : '')
    }
  }

  const clienteOpts = useMemo(() => clientes.map(c => ({ id: c.id, nombre: c.nombre })), [clientes])

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 touch-pan-y">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
              <Percent size={20} /> {t('markup.title')}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{t('markup.subtitle')}</p>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Spinner size={28} /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Lista de perfiles */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  {t('markup.profile')}s
                </p>
                <div className="flex flex-col gap-1 mb-3">
                  {profiles.length === 0 && <p className="text-xs text-gray-400 py-3">Sin perfiles aún.</p>}
                  {profiles.map(p => (
                    <button key={p.id} onClick={() => selectProfile(p.id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        selectedId === p.id ? 'text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      style={selectedId === p.id ? { background: 'var(--brand-navy)' } : undefined}>
                      <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                      {!p.activo && <span className="text-[9px] uppercase opacity-70">inactivo</span>}
                      <Trash2 size={12} className="shrink-0 opacity-50 hover:opacity-100"
                        onClick={e => { e.stopPropagation(); handleDelete(p.id) }} />
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nuevo perfil"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none" />
                  <button onClick={handleCreate} disabled={creating || !newName.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                    style={{ background: 'var(--brand-navy)' }}>
                    {creating ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                  </button>
                </div>
              </div>

              {/* Editor de reglas */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                {!selected ? (
                  <p className="text-sm text-gray-400 py-10 text-center">
                    Selecciona un perfil para editar sus reglas.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm font-bold text-[#1e3a5f]">{selected.nombre}</p>
                        <label className="text-xs text-gray-500 inline-flex items-center gap-1.5 mt-1">
                          <input type="checkbox" checked={selected.activo}
                            onChange={e => updateProfile(selected.id, { activo: e.target.checked })} />
                          {t('markup.active')}
                          <span className="ml-2">· {t('markup.priority')}:</span>
                          <input type="number" value={selected.prioridad}
                            onChange={e => updateProfile(selected.id, { prioridad: Number(e.target.value) || 100 })}
                            className="w-14 px-1.5 py-0.5 border border-gray-200 rounded outline-none tabular-nums" />
                        </label>
                      </div>
                      <button onClick={handleSaveRules} disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: 'var(--brand-navy)' }}>
                        {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                        {t('common.save')}
                      </button>
                    </div>
                    <MarkupRuleEditor rules={draftRules} onChange={setDraftRules} clientes={clienteOpts} />
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
