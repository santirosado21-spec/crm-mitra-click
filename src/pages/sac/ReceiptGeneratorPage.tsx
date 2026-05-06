import { useCallback, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, Download, Trash2, XCircle, AlertTriangle, Loader2, FileInput, Plus } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { extractReceiptItemsFromPT, type PTLineItem } from '../../lib/ptParser'
import { generateReceiptExcel } from './receiptExport'

export function ReceiptGeneratorPage() {
  const [ptFile, setPtFile] = useState<File | null>(null)
  const [ref, setRef] = useState('')
  const [items, setItems] = useState<PTLineItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const ptRef = useRef<HTMLInputElement>(null)

  const handleExtract = useCallback(async (file: File) => {
    setProcessing(true)
    setError('')
    setItems([])
    setRef('')
    try {
      const { ref: detectedRef, items: extracted } = await extractReceiptItemsFromPT(file)
      setRef(detectedRef ?? '')
      setItems(extracted)
      if (extracted.length === 0) {
        setError('No se encontraron items en el PT. Verifica que tenga columnas SKU y Cantidad identificables.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar PT')
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleFileChange = (file: File) => {
    setPtFile(file)
    handleExtract(file)
  }

  const handleReset = () => {
    setPtFile(null)
    setRef('')
    setItems([])
    setError('')
    if (ptRef.current) ptRef.current.value = ''
  }

  const updateItem = (idx: number, field: keyof PTLineItem, value: string | number | null) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  const deleteItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const addEmptyItem = () => {
    setItems(prev => [...prev, { sku: '', qty: 1, serialNumber: null }])
  }

  const handleDownload = () => {
    const cleaned = items
      .map(i => ({ ...i, sku: i.sku.trim().toUpperCase(), qty: Number(i.qty) || 0 }))
      .filter(i => i.sku && i.qty > 0)
    if (cleaned.length === 0) {
      setError('No hay items válidos para exportar')
      return
    }
    generateReceiptExcel(ref.trim() || 'PT', cleaned)
  }

  const canExport = !!ref.trim() && items.some(i => i.sku && Number(i.qty) > 0)

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y p-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#1e3a5f]">Generador Receipt Import</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Sube un PT (PDF o Excel) y genera el archivo Receipt_Import_Template.xlsx listo para subir a Extensiv.
            </p>
          </div>

          {/* Upload */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-3 block">Pick Ticket (PDF o Excel)</label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                ptFile ? 'border-green-300 bg-green-50/50' : 'border-gray-200 hover:border-[#1e3a5f]/30 hover:bg-gray-50'
              }`}
              onClick={() => ptRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0])
              }}
            >
              <input
                ref={ptRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]) }}
              />
              {ptFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">{ptFile.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleReset() }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Arrastra o haz clic para subir el Pick Ticket</p>
                  <p className="text-[10px] text-gray-300 mt-1">PDF, XLS, XLSX, CSV</p>
                </>
              )}
            </div>
          </div>

          {/* Loading */}
          {processing && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-blue-600">
              <Loader2 size={16} className="animate-spin" /> Procesando PT...
            </div>
          )}

          {/* Error */}
          {error && !processing && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {/* Extracted data */}
          {!processing && ptFile && items.length > 0 && (
            <>
              {/* Ref input */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  Ref # <span className="text-red-500">*</span>
                  <span className="text-[10px] font-normal text-gray-400 ml-2">
                    (detectado automáticamente — puedes corregirlo si es necesario)
                  </span>
                </label>
                <input
                  type="text"
                  value={ref}
                  onChange={e => setRef(e.target.value)}
                  placeholder="Ej: SO2554"
                  className={`w-full max-w-xs h-10 px-3 rounded-lg border text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 ${
                    ref.trim() ? 'border-green-300 bg-green-50/30' : 'border-amber-300 bg-amber-50/30'
                  }`}
                />
                {!ref.trim() && (
                  <p className="text-[10px] text-amber-700 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={10} /> No se pudo detectar el Ref# automáticamente. Escríbelo manualmente.
                  </p>
                )}
              </div>

              {/* Items table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
                  <p className="text-xs font-semibold text-gray-600">
                    Items extraídos ({items.length})
                  </p>
                  <button
                    onClick={addEmptyItem}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#1e3a5f] hover:underline"
                  >
                    <Plus size={12} /> Agregar línea
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">SKU</th>
                      <th className="text-right px-4 py-2 font-semibold text-gray-500 text-[11px] uppercase tracking-wider w-24">Cantidad</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-500 text-[11px] uppercase tracking-wider">Serial #</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/40">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.sku}
                            onChange={e => updateItem(idx, 'sku', e.target.value)}
                            className="w-full h-8 px-2 rounded border border-transparent hover:border-gray-200 focus:border-[#1e3a5f] focus:outline-none font-mono text-xs font-semibold text-gray-800"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                            className="w-full h-8 px-2 rounded border border-transparent hover:border-gray-200 focus:border-[#1e3a5f] focus:outline-none text-right text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.serialNumber ?? ''}
                            onChange={e => updateItem(idx, 'serialNumber', e.target.value || null)}
                            placeholder="(opcional)"
                            className="w-full h-8 px-2 rounded border border-transparent hover:border-gray-200 focus:border-[#1e3a5f] focus:outline-none font-mono text-xs text-gray-700"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => deleteItem(idx)}
                            className="text-gray-300 hover:text-red-500 p-1"
                            title="Eliminar línea"
                          >
                            <XCircle size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  disabled={!canExport}
                  className="h-10 px-6 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#16304d] transition-colors disabled:opacity-40"
                >
                  <Download size={16} />
                  Descargar Receipt_Import.xlsx
                </button>
                <button
                  onClick={handleReset}
                  className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <Trash2 size={16} /> Limpiar
                </button>
              </div>

              <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
                <FileInput size={10} />
                El archivo se exporta sin colores, listo para importar a Extensiv.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
