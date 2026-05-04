import { X } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { useOperations } from '../../hooks/useOperations'
import { OperacionForm } from '../../pages/operations/components/OperacionForm'
import type { OperacionFormValues } from '../../pages/operations/components/OperacionForm'
import type { Operation } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  // If provided, modal is in "edit" mode
  editTarget?: Operation
}

export function OperationModal({ isOpen, onClose, onSuccess, editTarget }: Props) {
  const { user } = useAuthContext()
  const { createOperation, updateOperation } = useOperations()

  if (!isOpen) return null

  const isEdit = Boolean(editTarget)

  const handleSubmit = async (values: OperacionFormValues) => {
    try {
      if (isEdit && editTarget) {
        await updateOperation(editTarget.id, values)
      } else {
        await createOperation({
          ...values,
          creado_por: user?.name ?? user?.email ?? 'Sistema',
        })
      }
      onSuccess?.()
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar la operación')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Editar operación' : 'Nueva operación'}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEdit ? 'Editar Operación' : 'Nueva Operación'}
            </h2>
            {isEdit && editTarget && (
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{editTarget.referencia}</p>
            )}
            {!isEdit && (
              <p className="text-xs text-gray-400 mt-0.5">
                La referencia se generará automáticamente al guardar
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <OperacionForm
            defaultValues={editTarget}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel={isEdit ? 'Guardar cambios' : 'Crear operación'}
          />
        </div>

      </div>
    </div>
  )
}
