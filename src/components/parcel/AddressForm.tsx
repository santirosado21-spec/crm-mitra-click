import { useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import type { CreateParcelAddressData, ParcelAddress, AddressTipo } from '../../types/techship'

interface Props {
  open:     boolean
  initial?: ParcelAddress | null
  onClose:  () => void
  onSave:   (data: CreateParcelAddressData) => Promise<void>
}

const EMPTY: CreateParcelAddressData = {
  alias: '', tipo: 'recipient', nombre: '', empresa: '', calle1: '', calle2: '',
  ciudad: '', estado: '', codigo_postal: '', pais: 'MX', telefono: '', email: '',
  referencia: '', cliente_id: null, es_default: false,
}

// Modal de alta/edición de una dirección de la libreta.
export function AddressForm({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<CreateParcelAddressData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  // Sincroniza el formulario cuando cambia el registro a editar.
  const key = initial?.id ?? 'new'
  if (open && loadedFor !== key) {
    setForm(initial ? { ...EMPTY, ...initial } : EMPTY)
    setLoadedFor(key)
  }
  if (!open && loadedFor !== null) setLoadedFor(null)

  if (!open) return null

  const set = (patch: Partial<CreateParcelAddressData>) => setForm(f => ({ ...f, ...patch }))
  const valid = form.alias.trim() && form.nombre.trim() && form.calle1.trim()
    && form.ciudad.trim() && form.estado.trim() && form.codigo_postal.trim()

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, value: string, onChange: (v: string) => void, required = false) => (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
        {label}{required && ' *'}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1e3a5f]">
            {initial ? 'Editar dirección' : 'Nueva dirección'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('Alias', form.alias, v => set({ alias: v }), true)}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Tipo</label>
            <select value={form.tipo} onChange={e => set({ tipo: e.target.value as AddressTipo })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none">
              <option value="sender">Remitente</option>
              <option value="recipient">Destinatario</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
          {field('Nombre / contacto', form.nombre, v => set({ nombre: v }), true)}
          {field('Empresa', form.empresa, v => set({ empresa: v }))}
          {field('Calle y número', form.calle1, v => set({ calle1: v }), true)}
          {field('Calle 2 / interior', form.calle2, v => set({ calle2: v }))}
          {field('Ciudad', form.ciudad, v => set({ ciudad: v }), true)}
          {field('Estado', form.estado, v => set({ estado: v }), true)}
          {field('Código postal', form.codigo_postal, v => set({ codigo_postal: v }), true)}
          {field('País', form.pais, v => set({ pais: v }))}
          {field('Teléfono', form.telefono, v => set({ telefono: v }))}
          {field('Email', form.email, v => set({ email: v }))}
          <div className="sm:col-span-2">
            {field('Referencia', form.referencia, v => set({ referencia: v }))}
          </div>
          <label className="text-xs text-gray-600 inline-flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={form.es_default}
              onChange={e => set({ es_default: e.target.checked })} />
            Marcar como dirección predeterminada
          </label>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!valid || saving}
            className="px-5 py-2 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold disabled:opacity-40 inline-flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
