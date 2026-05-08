import { useRef, useState } from 'react'
import {
  X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Trash2, Save,
} from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { parseSekoExcel, type ParsedSekoRow } from '../../lib/sekoExcelParser'
import type { CreateSekoMovementData, SekoTipo } from '../../types/seko'

interface ClienteOption {
  id:     string
  codigo: string
  nombre: string
}

interface Props {
  open:        boolean
  onClose:     () => void
  onConfirm:   (rows: CreateSekoMovementData[], fileName: string) => Promise<void>
  clientes:    ClienteOption[]   // solo los 4 Seko (BSF / KST / BB / LUL)
  importedBy:  string | null
}

type EditableRow = ParsedSekoRow & { selected: boolean }

export function SekoImportModal({ open, onClose, onConfirm, clientes, importedBy }: Props) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string>('')
  const [parsing, setParsing]   = useState(false)
  const [rows, setRows]         = useState<EditableRow[]>([])
  const [clienteId, setClienteId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const handleFile = async (file: File | null) => {
    if (!file) return
    setParsing(true); setFileName(file.name); setRows([])
    try {
      const result = await parseSekoExcel(file)
      setRows(result.rows.map(r => ({ ...r, selected: r.errors.length === 0 })))
      if (result.totalRows === 0) {
        toast.error('Excel vacío', 'No se detectaron filas con datos.')
      } else {
        toast.success(
          `${result.validRows} filas OK, ${result.invalidRows} con errores`,
          `de ${result.totalRows} totales en ${result.fileName}`,
        )
      }
    } catch (e) {
      toast.error('Error al leer el Excel', e instanceof Error ? e.message : 'Formato no reconocido')
      setRows([])
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const reset = () => {
    setRows([]); setFileName(''); setClienteId('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const updateRow = (idx: number, patch: Partial<ParsedSekoRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleSelected = (idx: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r))
  }
  const toggleAll = (val: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected: val && r.errors.length === 0 })))
  }

  const cliente = clientes.find(c => c.id === clienteId) ?? null
  const selectedRows = rows.filter(r => r.selected && r.errors.length === 0)
  const canConfirm = !!cliente && selectedRows.length > 0 && !submitting

  const handleConfirm = async () => {
    if (!cliente) return
    setSubmitting(true)
    try {
      const payload: CreateSekoMovementData[] = selectedRows.map(r => ({
        cliente_id:      cliente.id,
        cliente_codigo:  cliente.codigo,
        fecha:           r.fecha!,           // ya validado
        tipo:            r.tipo!,            // ya validado
        referencia:      r.referencia,
        sku:             r.sku,
        cantidad:        r.cantidad,
        imported_by:     importedBy,
        source_file:     fileName,
        source_row:      r.source_row,
        billed:          false,
        billed_at:       null,
        notas:           '',
        raw:             r.raw,
      }))
      await onConfirm(payload, fileName)
      reset()
      onClose()
    } catch (e) {
      toast.error('Error al guardar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-5xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-[#1e3a5f] inline-flex items-center gap-2">
            <FileSpreadsheet size={18} /> Importar Excel de Seko 365
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Cliente + file picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                Cliente Seko *
              </label>
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
              >
                <option value="">— Selecciona cliente —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} · {c.codigo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                Archivo Excel
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
                className="w-full h-10 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#1e3a5f] hover:bg-blue-50/30 text-sm text-gray-600 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {parsing ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                {parsing ? 'Leyendo…' : (fileName || 'Subir Excel (.xlsx, .xls, .csv)')}
              </button>
            </div>
          </div>

          {/* Preview de filas */}
          {rows.length > 0 && (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-900 inline-flex items-start gap-2 w-full">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <div>
                  <b>{rows.filter(r => r.errors.length === 0).length} OK</b>,{' '}
                  <b className="text-rose-600">{rows.filter(r => r.errors.length > 0).length} con errores</b>{' '}
                  de {rows.length} filas. Edita los campos directamente en la tabla;
                  marca/desmarca cada fila para incluirla o no en el guardado.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => toggleAll(true)} className="text-[11px] font-semibold text-[#1e3a5f] hover:underline">
                  Seleccionar todas las OK
                </button>
                <button type="button" onClick={() => toggleAll(false)} className="text-[11px] font-semibold text-gray-500 hover:underline">
                  Deseleccionar todas
                </button>
                <span className="text-[11px] text-gray-400 ml-auto">
                  Seleccionadas: <b>{selectedRows.length}</b>
                </span>
              </div>

              <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-[50vh]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-500 uppercase text-[10px]">
                      <th className="px-2 py-2 w-6"></th>
                      <th className="px-2 py-2">Fila</th>
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Referencia</th>
                      <th className="px-2 py-2">SKU</th>
                      <th className="px-2 py-2">Cantidad</th>
                      <th className="px-2 py-2">Errores</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const hasErrors = r.errors.length > 0
                      return (
                        <tr key={idx} className={`border-b border-gray-100 ${hasErrors ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={r.selected && !hasErrors}
                              disabled={hasErrors}
                              onChange={() => toggleSelected(idx)}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-gray-400">{r.source_row}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="date"
                              value={r.fecha ?? ''}
                              onChange={e => updateRow(idx, { fecha: e.target.value || null, errors: r.errors.filter(x => !x.includes('Fecha')) })}
                              className="w-32 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={r.tipo ?? ''}
                              onChange={e => updateRow(idx, { tipo: (e.target.value || null) as SekoTipo | null, errors: r.errors.filter(x => !x.includes('Tipo')) })}
                              className="px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white outline-none"
                            >
                              <option value="">—</option>
                              <option value="entrada">Entrada</option>
                              <option value="salida">Salida</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={r.referencia ?? ''}
                              onChange={e => updateRow(idx, { referencia: e.target.value || null })}
                              className="w-28 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={r.sku ?? ''}
                              onChange={e => updateRow(idx, { sku: e.target.value || null })}
                              className="w-32 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none font-mono"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="any"
                              value={r.cantidad}
                              onChange={e => updateRow(idx, { cantidad: Number(e.target.value) || 0 })}
                              className="w-20 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none text-right tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-rose-600">
                            {hasErrors && (
                              <span className="inline-flex items-center gap-1" title={r.errors.join(' · ')}>
                                <AlertCircle size={11} />
                                {r.errors.length} error{r.errors.length === 1 ? '' : 'es'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="text-gray-300 hover:text-red-600"
                              title="Quitar fila"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {rows.length === 0 && !parsing && (
            <div className="border border-dashed border-gray-200 rounded-lg py-10 text-center">
              <FileSpreadsheet size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Selecciona un cliente Seko y sube el Excel para ver el preview.</p>
              <p className="text-[10px] text-gray-400 mt-1">
                El parser detecta columnas: Fecha · Tipo (entrada/salida) · Referencia · SKU · Cantidad.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400">
            {rows.length > 0 && `${selectedRows.length} de ${rows.length} filas se guardarán`}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-5 py-2 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold disabled:opacity-40 inline-flex items-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Confirmar e importar
            </button>
          </div>
        </div>
      </div>

      {parsing && rows.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Spinner size={28} />
        </div>
      )}
    </div>
  )
}
