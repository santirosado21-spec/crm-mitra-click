import { useState } from 'react'
import { Printer, X, Check, Trash2, Loader2 } from 'lucide-react'
import { usePrintQueue } from '../../hooks/usePrintQueue'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { mergeLabels } from '../../lib/carriers/mergeLabels'

// Badge de cola de impresión para el Header del módulo paquetería.
// Muestra el conteo de etiquetas pendientes y un dropdown para imprimirlas
// en lote (combina los PDFs reales de las etiquetas en uno solo).
export function PrintQueueBadge() {
  const { user } = useAuthContext()
  const toast = useToast()
  const { items, pendingCount, markPrinted, remove, clearPrinted } = usePrintQueue(user?.email)
  const [open, setOpen] = useState(false)
  const [printing, setPrinting] = useState(false)

  const pending = items.filter(i => i.status === 'pendiente')

  // Descarga las etiquetas reales de los carriers, las combina en un PDF y lo
  // abre para imprimir. Solo marca como impresas las que sí se descargaron.
  const handlePrintAll = async () => {
    if (pending.length === 0 || printing) return
    // La pestaña se abre ANTES del await — si se abre después, el bloqueador
    // de popups la mata (ya no está en el stack del gesto del usuario).
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Permite las ventanas emergentes para imprimir las etiquetas')
      return
    }
    setPrinting(true)
    try {
      const result = await mergeLabels(pending.map(i => ({
        id: i.id, label_url: i.label_url,
        tracking_number: i.tracking_number, carrier: i.carrier,
      })))
      if (!result.blob) {
        win.close()
        toast.error('No se pudo descargar ninguna etiqueta',
          result.failed.slice(0, 3).map(f => f.item.tracking_number ?? f.item.id).join(' · '))
        return
      }
      const url = URL.createObjectURL(result.blob)
      win.location.href = url
      // Revocar tras un margen — que la pestaña termine de cargar el blob.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)

      try {
        await markPrinted(result.succeeded.map(s => s.id))
      } catch (e) {
        toast.error('Etiquetas abiertas, pero no se pudieron marcar impresas',
          e instanceof Error ? e.message : '')
      }
      toast.success(`${result.succeeded.length} etiquetas enviadas a impresión`)
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} etiqueta(s) no se pudieron imprimir`,
          result.failed.slice(0, 3).map(f => f.item.tracking_number ?? f.item.id).join(' · '))
      }
    } catch (e) {
      win.close()
      toast.error('Error al imprimir', e instanceof Error ? e.message : '')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-500"
        aria-label="Cola de impresión"
        title="Cola de impresión"
      >
        <Printer size={18} />
        {pendingCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: '#c8373c' }}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-100 shadow-xl z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <p className="text-sm font-bold text-[#1e3a5f]">Cola de impresión</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-gray-400">Sin etiquetas en cola.</p>
              )}
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-4 py-2 border-b border-gray-50 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'pendiente' ? 'bg-amber-400' : item.status === 'impreso' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-700 truncate">{item.tracking_number ?? 'Sin tracking'}</p>
                    <p className="text-gray-400">{item.carrier ?? '—'}</p>
                  </div>
                  <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-600" title="Quitar">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 p-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handlePrintAll}
                disabled={pending.length === 0 || printing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                style={{ background: 'var(--brand-navy)' }}
              >
                {printing
                  ? <><Loader2 size={13} className="animate-spin" /> Preparando...</>
                  : <><Printer size={13} /> Imprimir {pending.length > 0 ? `(${pending.length})` : ''}</>}
              </button>
              <button
                type="button"
                onClick={() => clearPrinted()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100"
              >
                <Check size={13} /> Limpiar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
