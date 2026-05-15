import { useRef, useState } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Trash2, Save } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { parseParcelExcel, type ParsedParcelRow } from '../../lib/parcelExcelParser'
import type { CreateGuiaData, Paqueteria } from '../../types/guias'
import type { OrderTemplate } from '../../types/techship'

interface ClienteOption {
  id:     string
  codigo: string
  nombre: string
}

interface Props {
  open:       boolean
  onClose:    () => void
  onConfirm:  (rows: CreateGuiaData[], fileName: string) => Promise<void>
  clientes:   ClienteOption[]
  templates?: OrderTemplate[]
  creadoPor:  string | null
}

type EditableRow = ParsedParcelRow & { selected: boolean; cliente_id: string | null }

const VALID_CARRIERS: Paqueteria[] = ['estafeta', 'ups', 'fedex', 'dhl', 'castores']

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function ParcelOrderImportModal({ open, onClose, onConfirm, clientes, templates = [], creadoPor }: Props) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing]   = useState(false)
  const [rows, setRows]         = useState<EditableRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [templateId, setTemplateId] = useState('')

  if (!open) return null

  // Resuelve un nombre de cliente del Excel contra el catálogo.
  const resolveCliente = (name: string | null): string | null => {
    if (!name) return null
    const n = normalize(name)
    const match = clientes.find(c => normalize(c.nombre) === n || normalize(c.codigo) === n)
      ?? clientes.find(c => normalize(c.nombre).includes(n) || n.includes(normalize(c.nombre)))
    return match?.id ?? null
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    setParsing(true); setFileName(file.name); setRows([])
    try {
      const result = await parseParcelExcel(file)
      setRows(result.rows.map(r => {
        const cid = resolveCliente(r.cliente)
        const errors = [...r.errors]
        if (!cid && r.cliente) errors.push('Cliente no encontrado en catálogo')
        return { ...r, errors, cliente_id: cid, selected: errors.length === 0 }
      }))
      if (result.totalRows === 0) toast.error('Excel vacío', 'No se detectaron filas con datos.')
      else toast.success(`${result.validRows} OK · ${result.invalidRows} con errores`, `de ${result.totalRows} filas`)
    } catch (e) {
      toast.error('Error al leer el Excel', e instanceof Error ? e.message : 'Formato no reconocido')
      setRows([])
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const applyTemplate = (id: string) => {
    setTemplateId(id)
    const tpl = templates.find(t => t.id === id)
    if (!tpl) return
    const p = tpl.payload
    setRows(prev => prev.map(r => ({
      ...r,
      carrier:   p.carrier ?? r.carrier,
      service:   p.service ?? r.service,
      weight_kg: p.weight_kg ?? r.weight_kg,
      length_cm: p.length_cm ?? r.length_cm,
      width_cm:  p.width_cm ?? r.width_cm,
      height_cm: p.height_cm ?? r.height_cm,
    })))
    toast.info('Plantilla aplicada', tpl.nombre)
  }

  const updateRow = (idx: number, patch: Partial<EditableRow>) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx))
  const toggleSelected = (idx: number) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r))

  const reset = () => { setRows([]); setFileName(''); setTemplateId('') }

  const selectedRows = rows.filter(r => r.selected && r.errors.length === 0)
  const canConfirm = selectedRows.length > 0 && !submitting

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const payload: CreateGuiaData[] = selectedRows.map((r, i) => {
        const carrier = (r.carrier && VALID_CARRIERS.includes(r.carrier as Paqueteria))
          ? r.carrier as Paqueteria : 'estafeta'
        const codigo = clientes.find(c => c.id === r.cliente_id)?.codigo ?? null
        return {
          paqueteria:      carrier,
          tracking_number: `ORD-${Date.now()}-${r.source_row}-${i}`,
          cliente_id:      r.cliente_id!,
          cliente_codigo:  codigo,
          costo:           0,
          precio:          0,
          fecha:           new Date().toISOString().slice(0, 10),
          origen:          'manual',
          extensiv_transaction_type: null,
          extensiv_transaction_id:   null,
          extensiv_customer_id:      null,
          manual_reference: r.order_num ?? `IMPORT-${r.source_row}`,
          notas:            r.destinatario ? `Destinatario: ${r.destinatario}` : '',
          creado_por:       creadoPor,
          from_postal_code: '52000',
          to_postal_code:   r.to_cp,
          to_country:       r.to_country,
          weight_kg:        r.weight_kg,
          length_cm:        r.length_cm,
          width_cm:         r.width_cm,
          height_cm:        r.height_cm,
          provider:         'manual',
          auto_pick_service: r.service,
          tracking_status:  'cotizado',
        }
      })
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
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-5xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-[#1e3a5f] inline-flex items-center gap-2">
            <FileSpreadsheet size={18} /> Importar órdenes de paquetería
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                Archivo Excel
              </label>
              <input
                ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={e => handleFile(e.target.files?.[0] ?? null)} className="hidden"
              />
              <button
                type="button" onClick={() => fileRef.current?.click()} disabled={parsing}
                className="w-full h-10 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#1e3a5f] hover:bg-blue-50/30 text-sm text-gray-600 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {parsing ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                {parsing ? 'Leyendo…' : (fileName || 'Subir Excel (.xlsx, .xls, .csv)')}
              </button>
            </div>
            {templates.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Cargar plantilla
                </label>
                <select
                  value={templateId} onChange={e => applyTemplate(e.target.value)} disabled={rows.length === 0}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none disabled:opacity-50"
                >
                  <option value="">— Sin plantilla —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-900 inline-flex items-start gap-2 w-full">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <div>
                  <b>{rows.filter(r => r.errors.length === 0).length} OK</b>,{' '}
                  <b className="text-rose-600">{rows.filter(r => r.errors.length > 0).length} con errores</b>{' '}
                  de {rows.length} filas. Edita los campos directamente en la tabla.
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-[50vh]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-500 uppercase text-[10px]">
                      <th className="px-2 py-2 w-6"></th>
                      <th className="px-2 py-2">Fila</th>
                      <th className="px-2 py-2">Cliente</th>
                      <th className="px-2 py-2">Orden #</th>
                      <th className="px-2 py-2">CP destino</th>
                      <th className="px-2 py-2">Carrier</th>
                      <th className="px-2 py-2">Peso</th>
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
                            <input type="checkbox" checked={r.selected && !hasErrors} disabled={hasErrors} onChange={() => toggleSelected(idx)} />
                          </td>
                          <td className="px-2 py-1.5 text-gray-400">{r.source_row}</td>
                          <td className="px-2 py-1.5">
                            <select
                              value={r.cliente_id ?? ''}
                              onChange={e => updateRow(idx, {
                                cliente_id: e.target.value || null,
                                errors: r.errors.filter(x => !x.includes('Cliente')),
                              })}
                              className="px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white outline-none max-w-[140px]"
                            >
                              <option value="">— cliente —</option>
                              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={r.order_num ?? ''} onChange={e => updateRow(idx, { order_num: e.target.value || null })}
                              className="w-24 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={r.to_cp ?? ''} onChange={e => updateRow(idx, { to_cp: e.target.value || null, errors: r.errors.filter(x => !x.includes('CP')) })}
                              className="w-20 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none" />
                          </td>
                          <td className="px-2 py-1.5">
                            <select value={r.carrier ?? ''} onChange={e => updateRow(idx, { carrier: e.target.value || null })}
                              className="px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white outline-none">
                              <option value="">auto</option>
                              {VALID_CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" step="any" value={r.weight_kg} onChange={e => updateRow(idx, { weight_kg: Number(e.target.value) || 0, errors: r.errors.filter(x => !x.includes('Peso')) })}
                              className="w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded outline-none text-right tabular-nums" />
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-rose-600">
                            {hasErrors && (
                              <span className="inline-flex items-center gap-1" title={r.errors.join(' · ')}>
                                <AlertCircle size={11} /> {r.errors.length}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <button type="button" onClick={() => removeRow(idx)} className="text-gray-300 hover:text-red-600" title="Quitar fila">
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
              <p className="text-xs text-gray-400">Sube el Excel de órdenes para ver el preview.</p>
              <p className="text-[10px] text-gray-400 mt-1">
                Detecta columnas: Cliente · Orden # · Destinatario · CP · Carrier · Peso · Dimensiones.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400">
            {rows.length > 0 && `${selectedRows.length} de ${rows.length} órdenes se importarán`}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
              Cancelar
            </button>
            <button
              type="button" onClick={handleConfirm} disabled={!canConfirm}
              className="px-5 py-2 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold disabled:opacity-40 inline-flex items-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Confirmar e importar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
