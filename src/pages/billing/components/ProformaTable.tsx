import { useState, useMemo } from 'react'
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react'
import type { ProformaRow } from '../proformaParser'

const fmtMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

interface EditState { id: string; field: 'concepto' | 'importe' | 'cantidad' | 'unitPrice'; value: string }

interface Props {
  rows:      ProformaRow[]
  onChange:  (updated: ProformaRow[]) => void
}

export function ProformaTable({ rows, onChange }: Props) {
  const [edit, setEdit] = useState<EditState | null>(null)

  const subtotal = useMemo(() => rows.reduce((s, r) => s + r.importe, 0), [rows])
  const iva = subtotal * 0.16
  const total = subtotal + iva

  const startEdit = (id: string, field: EditState['field'], current: string) => {
    setEdit({ id, field, value: current })
  }

  const commitEdit = () => {
    if (!edit) return
    const updated = rows.map(r => {
      if (r.id !== edit.id) return r
      if (edit.field === 'cantidad') {
        const qty = parseFloat(edit.value) || 0
        const unitPrice = parseFloat(r.destino) || 0
        return { ...r, origen: String(qty), importe: Math.round(qty * unitPrice * 100) / 100 }
      }
      if (edit.field === 'unitPrice') {
        const unitPrice = parseFloat(edit.value.replace(/[^0-9.-]/g, '')) || 0
        const qty = parseFloat(r.origen) || 0
        return { ...r, destino: String(unitPrice), importe: Math.round(qty * unitPrice * 100) / 100 }
      }
      if (edit.field === 'importe') {
        const num = parseFloat(edit.value.replace(/[^0-9.-]/g, '')) || 0
        return { ...r, importe: num }
      }
      return { ...r, concepto: edit.value }
    })
    onChange(updated)
    setEdit(null)
  }

  const cancelEdit = () => setEdit(null)

  const addRow = () => {
    // Inherit cliente/fecha from first existing row when available so new
    // manual lines stay consistent with the rest of the proforma.
    const ref = rows[0]
    const newRow: ProformaRow = {
      id:         'new-' + Date.now(),
      refInterna: '',
      fecha:      ref?.fecha   ?? new Date().toISOString().split('T')[0],
      cliente:    ref?.cliente ?? '',
      concepto:   'Nuevo concepto',
      origen:     '1',
      destino:    '0',
      importe:    0,
      tipo:       'servicio',
    }
    onChange([...rows, newRow])
    setTimeout(() => setEdit({ id: newRow.id, field: 'concepto', value: newRow.concepto }), 50)
  }

  const deleteRow = (id: string) => {
    onChange(rows.filter(r => r.id !== id))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  commitEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Cantidad', 'Descripción', 'Costo Unitario', 'Costo Total'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Sin datos. Click "Agregar fila" para comenzar manualmente.
                  </td>
                </tr>
              ) : rows.map((row, i) => {
                const qty = parseFloat(row.origen) || 0
                const unitPrice = parseFloat(row.destino) || 0

                return (
                  <tr key={row.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 ? 'bg-gray-50/30' : ''}`}>

                    {/* Cantidad — editable */}
                    <td className="px-4 py-3 w-28">
                      {edit?.id === row.id && edit.field === 'cantidad' ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="number"
                            value={edit.value}
                            onChange={e => setEdit({ ...edit, value: e.target.value })}
                            onKeyDown={onKeyDown}
                            className="border border-[#1e3a5f] rounded px-2 py-1 text-xs w-24 focus:outline-none"
                          />
                          <button onClick={commitEdit} className="text-green-600 hover:text-green-700 shrink-0"><Check size={14} /></button>
                          <button onClick={cancelEdit} className="text-red-400 hover:text-red-500 shrink-0"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className="font-medium text-gray-800">{qty || '—'}</span>
                          <button
                            onClick={() => startEdit(row.id, 'cantidad', String(qty))}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#1e3a5f] transition-all shrink-0"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Descripción — editable */}
                    <td className="px-4 py-3">
                      {edit?.id === row.id && edit.field === 'concepto' ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={edit.value}
                            onChange={e => setEdit({ ...edit, value: e.target.value })}
                            onKeyDown={onKeyDown}
                            className="border border-[#1e3a5f] rounded px-2 py-1 text-xs w-full focus:outline-none"
                          />
                          <button onClick={commitEdit} className="text-green-600 hover:text-green-700 shrink-0"><Check size={14} /></button>
                          <button onClick={cancelEdit} className="text-red-400 hover:text-red-500 shrink-0"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className="text-gray-700">{row.concepto}</span>
                          <button
                            onClick={() => startEdit(row.id, 'concepto', row.concepto)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#1e3a5f] transition-all shrink-0"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Costo Unitario — editable */}
                    <td className="px-4 py-3 w-36">
                      {edit?.id === row.id && edit.field === 'unitPrice' ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            value={edit.value}
                            onChange={e => setEdit({ ...edit, value: e.target.value })}
                            onKeyDown={onKeyDown}
                            className="border border-[#1e3a5f] rounded px-2 py-1 text-xs w-28 focus:outline-none"
                          />
                          <button onClick={commitEdit} className="text-green-600 hover:text-green-700 shrink-0"><Check size={14} /></button>
                          <button onClick={cancelEdit} className="text-red-400 hover:text-red-500 shrink-0"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className="text-gray-600">{unitPrice > 0 ? fmtMXN(unitPrice) : '—'}</span>
                          <button
                            onClick={() => startEdit(row.id, 'unitPrice', String(unitPrice))}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#1e3a5f] transition-all shrink-0"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Costo Total — editable */}
                    <td className="px-4 py-3">
                      {edit?.id === row.id && edit.field === 'importe' ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={edit.value}
                            onChange={e => setEdit({ ...edit, value: e.target.value })}
                            onKeyDown={onKeyDown}
                            className="border border-[#1e3a5f] rounded px-2 py-1 text-xs w-28 focus:outline-none"
                          />
                          <button onClick={commitEdit} className="text-green-600 hover:text-green-700 shrink-0"><Check size={14} /></button>
                          <button onClick={cancelEdit} className="text-red-400 hover:text-red-500 shrink-0"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className={`font-semibold ${row.importe > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {row.importe > 0 ? fmtMXN(row.importe) : '—'}
                          </span>
                          <button
                            onClick={() => startEdit(row.id, 'importe', String(row.importe))}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#1e3a5f] transition-all shrink-0"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Delete button */}
                    <td className="px-2 py-3 text-center">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        title="Eliminar fila"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer totales */}
        {rows.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-end gap-8 px-4 py-2 text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-bold text-gray-800 w-32 text-right">{fmtMXN(subtotal)}</span>
            </div>
            <div className="flex items-center justify-end gap-8 px-4 py-2 text-sm border-t border-gray-100">
              <span className="text-gray-500">IVA (16%):</span>
              <span className="font-bold text-gray-800 w-32 text-right">{fmtMXN(iva)}</span>
            </div>
            <div className="flex items-center justify-end gap-8 px-4 py-3 text-sm border-t border-gray-200">
              <span className="text-gray-700 font-semibold">Total:</span>
              <span className="font-bold text-[#1e3a5f] text-base w-32 text-right">{fmtMXN(total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Add row button */}
      <button
        onClick={addRow}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-600 hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors"
      >
        <Plus size={14} /> Agregar fila
      </button>
    </div>
  )
}
