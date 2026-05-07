import { useState } from 'react'
import {
  Filter, Plus, Trash2, X, AlertCircle, Loader2, Eye, EyeOff,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { useShippingRules } from '../../hooks/useShippingRules'
import type {
  ShippingRule, CreateShippingRuleInput,
} from '../../types/shippingRules'

const CARRIERS = [
  { value: '',         label: '— sin preferencia —' },
  { value: 'estafeta', label: 'Estafeta' },
  { value: 'castores', label: 'Castores' },
  { value: 'ups',      label: 'UPS' },
  { value: 'fedex',    label: 'FedEx' },
  { value: 'dhl',      label: 'DHL' },
]

export function ShippingRulesPage() {
  const toast = useToast()
  const { rules, loading, error, create, update, remove } = useShippingRules()
  const [editing, setEditing] = useState<ShippingRule | 'new' | null>(null)

  const handleSave = async (input: CreateShippingRuleInput, id?: string) => {
    try {
      if (id) await update(id, input)
      else    await create(input)
      toast.success('Regla guardada', input.name)
      setEditing(null)
    } catch (e) {
      toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Error')
    }
  }

  const handleDelete = async (rule: ShippingRule) => {
    if (!confirm(`¿Eliminar la regla "${rule.name}"?`)) return
    try {
      await remove(rule.id)
      toast.success('Regla eliminada')
    } catch (e) {
      toast.error('No se pudo eliminar', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <Filter size={20} /> Reglas de routing
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Solo administradores · Filtra/prioriza carriers por distancia y costo antes del auto-pick.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="h-10 px-4 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2 shadow-sm"
              style={{ background: 'var(--brand-navy)' }}
            >
              <Plus size={16} /> Nueva regla
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando reglas…
            </div>
          ) : rules.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <p className="text-sm text-gray-400">Aún no hay reglas. Crea la primera con el botón de arriba.</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Sin reglas, el auto-pick aplica solo el filtro local-first y el score por precio/tiempo/distancia.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div key={rule.id} className={`bg-white rounded-xl border shadow-sm p-4 ${rule.active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 truncate">{rule.name}</p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold">
                            prioridad {rule.priority}
                          </span>
                          {!rule.active && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                              inactiva
                            </span>
                          )}
                        </div>
                        {rule.description && <p className="text-[11px] text-gray-500 mt-0.5">{rule.description}</p>}
                        <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px]">
                          {(rule.distance_km_min != null || rule.distance_km_max != null) && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                              📏 {rule.distance_km_min ?? '0'}–{rule.distance_km_max ?? '∞'} km
                            </span>
                          )}
                          {rule.max_cost_mxn != null && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                              💵 ≤ ${Number(rule.max_cost_mxn).toLocaleString('es-MX')} MXN
                            </span>
                          )}
                          {rule.preferred_carrier && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
                              ✓ Prefiere {rule.preferred_carrier}{rule.preferred_service ? ` ${rule.preferred_service}` : ''}
                            </span>
                          )}
                          {rule.exclude_carriers?.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                              ✗ Excluye {rule.exclude_carriers.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => update(rule.id, { active: !rule.active })}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                          rule.active
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {rule.active ? <EyeOff size={11} className="inline mb-0.5" /> : <Eye size={11} className="inline mb-0.5" />}
                        {' '}{rule.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(rule)}
                        className="px-3 py-1 rounded bg-[#1e3a5f] text-white text-[11px] font-bold hover:bg-[#16304d]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rule)}
                        className="p-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {editing && (
        <RuleModal
          rule={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function RuleModal({
  rule, onClose, onSave,
}: {
  rule:    ShippingRule | null
  onClose: () => void
  onSave:  (input: CreateShippingRuleInput, id?: string) => Promise<void>
}) {
  const [name, setName]                   = useState(rule?.name ?? '')
  const [description, setDescription]     = useState(rule?.description ?? '')
  const [priority, setPriority]           = useState(String(rule?.priority ?? 100))
  const [distanceMin, setDistanceMin]     = useState(rule?.distance_km_min != null ? String(rule.distance_km_min) : '')
  const [distanceMax, setDistanceMax]     = useState(rule?.distance_km_max != null ? String(rule.distance_km_max) : '')
  const [maxCost, setMaxCost]             = useState(rule?.max_cost_mxn != null ? String(rule.max_cost_mxn) : '')
  const [preferredCarrier, setPreferredCarrier] = useState(rule?.preferred_carrier ?? '')
  const [preferredService, setPreferredService] = useState(rule?.preferred_service ?? '')
  const [excludeCarriers, setExcludeCarriers]   = useState<string[]>(rule?.exclude_carriers ?? [])
  const [active, setActive]               = useState(rule?.active ?? true)
  const [saving, setSaving]               = useState(false)

  const toggleExclude = (carrier: string) => {
    setExcludeCarriers(prev =>
      prev.includes(carrier) ? prev.filter(c => c !== carrier) : [...prev, carrier],
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name:               name.trim(),
        description:        description.trim(),
        priority:           Number(priority) || 100,
        distance_km_min:    distanceMin ? Number(distanceMin) : null,
        distance_km_max:    distanceMax ? Number(distanceMax) : null,
        max_cost_mxn:       maxCost ? Number(maxCost) : null,
        preferred_provider: null,
        preferred_carrier:  preferredCarrier || null,
        preferred_service:  preferredService.trim() || null,
        exclude_carriers:   excludeCarriers,
        active,
      }, rule?.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1e3a5f] inline-flex items-center gap-2">
            <Filter size={18} /> {rule ? 'Editar' : 'Nueva'} regla
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Nombre *</label>
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder='Ej. "Locales cortos baratos"'
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder='Ej. "Para envíos &lt; 500 km usar Estafeta si Estafeta cobra menos de $300"'
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
            />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Condiciones (opcional)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">Distancia min (km)</label>
                <input
                  type="number" min={0} step={1} value={distanceMin}
                  onChange={e => setDistanceMin(e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">Distancia max (km)</label>
                <input
                  type="number" min={0} step={1} value={distanceMax}
                  onChange={e => setDistanceMax(e.target.value)}
                  placeholder="∞"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">Costo máximo (MXN)</label>
                <input
                  type="number" min={0} step={1} value={maxCost}
                  onChange={e => setMaxCost(e.target.value)}
                  placeholder="∞"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              La regla aplica si el envío cumple TODAS las condiciones que tengan valor.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Acción</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">Carrier preferido</label>
                <select
                  value={preferredCarrier}
                  onChange={e => setPreferredCarrier(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                >
                  {CARRIERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">Servicio (opcional)</label>
                <input
                  type="text" value={preferredService}
                  onChange={e => setPreferredService(e.target.value)}
                  placeholder='Ej. "SDS", "Express"'
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Excluir carriers</p>
            <div className="flex flex-wrap gap-1.5">
              {CARRIERS.filter(c => c.value).map(c => {
                const excluded = excludeCarriers.includes(c.value)
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleExclude(c.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      excluded
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {excluded ? '✗ ' : ''}{c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Prioridad</label>
              <input
                type="number" min={1} step={1} value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Menor número = se evalúa primero</p>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer pb-2">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                Regla activa
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="px-5 py-2 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : null} Guardar regla
          </button>
        </div>
      </div>
    </div>
  )
}
