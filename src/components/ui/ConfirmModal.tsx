interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  variant?: 'danger' | 'warning'
}

const confirmStyle = {
  danger:  'bg-[#dc3545] hover:bg-[#c82333] text-white',
  warning: 'bg-[#ffc107] hover:bg-[#e0a800] text-black',
}

export function ConfirmModal({
  isOpen, onClose, onConfirm, title, message,
  confirmText = 'Confirmar', variant = 'danger',
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${confirmStyle[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
