import { X, Download, FileSpreadsheet } from 'lucide-react'

interface Operation {
  ref: string
  client: string
  date: string
  amount: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  operations: Operation[]
  total: number
}

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

export function ProformaModal({ isOpen, onClose, operations, total }: Props) {
  if (!isOpen) return null

  const iva = total * 0.16
  const totalConIva = total + iva
  const clientName = operations[0]?.client ?? '—'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-bold text-[#1e3a5f]">Proforma</h2>
            <p className="text-xs text-gray-400">{today}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">

          {/* Datos empresa */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <p className="font-bold text-[#1e3a5f]">Supply Chain de México S.A. de C.V.</p>
            <p className="text-gray-500">RFC: SCM020000XXX</p>
            <p className="text-gray-500">Av. Industria #123, Lerma, Estado de México, C.P. 52000</p>
          </div>

          {/* Cliente */}
          <div className="text-sm">
            <p className="text-gray-400 mb-0.5">Facturar a:</p>
            <p className="font-semibold text-gray-800">{clientName}</p>
          </div>

          {/* Tabla operaciones */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }} className="border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Referencia</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Descripción</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-600">Monto</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, i) => (
                  <tr key={op.ref} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-4 py-2 font-mono text-[#1e3a5f] text-xs">{op.ref}</td>
                    <td className="px-4 py-2 text-gray-600">Servicio logístico — {op.date}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800">{fmt(op.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex flex-col items-end gap-1.5 text-sm border-t border-gray-100 pt-3">
            <div className="flex gap-16 text-gray-600">
              <span>Subtotal</span><span>{fmt(total)}</span>
            </div>
            <div className="flex gap-16 text-gray-600">
              <span>IVA 16%</span><span>{fmt(iva)}</span>
            </div>
            <div className="flex gap-16 text-base font-bold text-[#1e3a5f] mt-1">
              <span>Total</span><span>{fmt(totalConIva)}</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={() => alert('PDF generado')}
            className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={15} /> Descargar PDF
          </button>
          <button
            onClick={() => alert('Excel generado')}
            className="flex items-center gap-2 bg-[#28a745] hover:bg-[#218838] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <FileSpreadsheet size={15} /> Descargar Excel
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}
