import { useMemo, useState } from 'react'
import { X, Save, Loader2, ClipboardList } from 'lucide-react'
import type { GuiaPaqueteria } from '../../types/guias'

interface Props {
  open:        boolean
  onClose:     () => void
  guias:       GuiaPaqueteria[]          // guías compradas, sin manifestar
  manifestedGuiaIds: Set<string>
  onCreate:    (carrier: string, provider: string, guiaIds: string[]) => Promise<void>
}

const CARRIERS = ['estafeta', 'ups', 'fedex', 'dhl', 'castores']

// provider efectivo según carrier (Skydropx agrega, FedEx será directo).
function providerFor(carrier: string): string {
  if (carrier === 'fedex') return 'direct_fedex'
  return 'skydropx'
}

export function CreateManifestModal({ open, onClose, guias, manifestedGuiaIds, onCreate }: Props) {
  const [carrier, setCarrier] = useState('estafeta')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Guías compradas del carrier elegido que aún no están en un manifiesto.
  const eligible = useMemo(
    () => guias.filter(g => g.paqueteria === carrier && !manifestedGuiaIds.has(g.id)),
    [guias, carrier, manifestedGuiaIds],
  )

  if (!open) return null

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const toggleAll = () =>
    setSelected(prev => prev.size === eligible.length ? new Set() : new Set(eligible.map(g => g.id)))

  const handleCreate = async () => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      await onCreate(carrier, providerFor(carrier), [...selected])
      setSelected(new Set())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1e3a5f] inline-flex items-center gap-2">
            <ClipboardList size={18} /> Nuevo manifiesto
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Carrier</label>
            <select value={carrier} onChange={e => { setCarrier(e.target.value); setSelected(new Set()) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none">
              {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Guías compradas ({eligible.length})
            </p>
            <button onClick={toggleAll} className="text-[11px] font-semibold text-[#1e3a5f] hover:underline">
              {selected.size === eligible.length && eligible.length > 0 ? 'Deseleccionar' : 'Seleccionar todas'}
            </button>
          </div>

          <div className="border border-gray-100 rounded-lg max-h-[45vh] overflow-y-auto">
            {eligible.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                Sin guías compradas pendientes de manifestar para {carrier}.
              </p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {eligible.map(g => (
                    <tr key={g.id} className="border-b border-gray-50">
                      <td className="px-3 py-2 w-8">
                        <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)} />
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600">{g.tracking_number}</td>
                      <td className="px-3 py-2 text-gray-500">{g.to_postal_code ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{g.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{selected.size} guías seleccionadas</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={selected.size === 0 || saving}
              className="px-5 py-2 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold disabled:opacity-40 inline-flex items-center gap-2">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Crear manifiesto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
