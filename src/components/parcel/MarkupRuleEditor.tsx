import { Plus, Trash2 } from 'lucide-react'
import type { CreateMarkupRuleData } from '../../types/techship'

interface ClienteOption { id: string; nombre: string }

interface Props {
  rules:    CreateMarkupRuleData[]
  onChange: (rules: CreateMarkupRuleData[]) => void
  clientes: ClienteOption[]
}

const CARRIERS = ['estafeta', 'ups', 'fedex', 'dhl', 'castores']

function blankRule(profileId: string): CreateMarkupRuleData {
  return {
    profile_id: profileId,
    cliente_id: null, carrier: null, service: null,
    markup_pct: 0, min_markup: null, max_markup: null, prioridad: 100,
  }
}

// Editor de la matriz de reglas de un perfil de markup.
// Cada fila es una combinación cliente × carrier × service con su % y caps.
export function MarkupRuleEditor({ rules, onChange, clientes }: Props) {
  const profileId = rules[0]?.profile_id ?? ''

  const update = (idx: number, patch: Partial<CreateMarkupRuleData>) =>
    onChange(rules.map((r, i) => i === idx ? { ...r, ...patch } : r))
  const add = () => onChange([...rules, blankRule(profileId)])
  const remove = (idx: number) => onChange(rules.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500 uppercase text-[10px]">
              <th className="px-2 py-2">Cliente</th>
              <th className="px-2 py-2">Carrier</th>
              <th className="px-2 py-2">Servicio</th>
              <th className="px-2 py-2 text-right">Markup %</th>
              <th className="px-2 py-2 text-right">Mín.</th>
              <th className="px-2 py-2 text-right">Máx.</th>
              <th className="px-2 py-2 text-right">Prioridad</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr><td colSpan={8} className="px-2 py-6 text-center text-gray-400">
                Sin reglas. Agrega una con el botón de abajo.
              </td></tr>
            )}
            {rules.map((r, idx) => (
              <tr key={idx} className="border-b border-gray-50">
                <td className="px-2 py-1.5">
                  <select value={r.cliente_id ?? ''} onChange={e => update(idx, { cliente_id: e.target.value || null })}
                    className="px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white outline-none max-w-[130px]">
                    <option value="">Todos</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select value={r.carrier ?? ''} onChange={e => update(idx, { carrier: e.target.value || null })}
                    className="px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white outline-none">
                    <option value="">Todos</option>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" value={r.service ?? ''} placeholder="Todos"
                    onChange={e => update(idx, { service: e.target.value || null })}
                    className="w-24 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" step="any" value={r.markup_pct}
                    onChange={e => update(idx, { markup_pct: Number(e.target.value) || 0 })}
                    className="w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none text-right tabular-nums" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" step="any" value={r.min_markup ?? ''}
                    onChange={e => update(idx, { min_markup: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none text-right tabular-nums" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" step="any" value={r.max_markup ?? ''}
                    onChange={e => update(idx, { max_markup: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none text-right tabular-nums" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" value={r.prioridad}
                    onChange={e => update(idx, { prioridad: Number(e.target.value) || 100 })}
                    className="w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none text-right tabular-nums" />
                </td>
                <td className="px-2 py-1.5">
                  <button type="button" onClick={() => remove(idx)} className="text-gray-300 hover:text-red-600">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
        <Plus size={13} /> Agregar regla
      </button>
    </div>
  )
}
