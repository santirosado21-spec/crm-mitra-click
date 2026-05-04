import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'

interface Props {
  onFile: (file: File) => void
  loading: boolean
}

export function ProformaUpload({ onFile, loading }: Props) {
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (file: File) => {
    const valid = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
    if (!valid) return alert('Solo se aceptan archivos .xlsx, .xls o .csv')
    setSelected(file)
    onFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) accept(file)
  }, [])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) accept(file)
  }

  if (selected) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
          <FileSpreadsheet size={20} className="text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{selected.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {(selected.size / 1024).toFixed(1)} KB · {loading ? 'Procesando...' : 'Archivo cargado'}
          </p>
        </div>
        {!loading && (
          <button
            onClick={() => { setSelected(null); if (inputRef.current) inputRef.current.value = '' }}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        )}
        {loading && (
          <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-[#1e3a5f] bg-blue-50'
          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100/60'
      }`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
        dragging ? 'bg-[#1e3a5f]/10' : 'bg-white border border-gray-200'
      }`}>
        <Upload size={24} className={dragging ? 'text-[#1e3a5f]' : 'text-gray-400'} />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700 mb-1">
          {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo de Extensiv aquí'}
        </p>
        <p className="text-xs text-gray-400">o haz clic para seleccionarlo · .xlsx, .xls, .csv</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  )
}
