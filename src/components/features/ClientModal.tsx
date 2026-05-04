import { useState } from 'react'
import { X } from 'lucide-react'
import { Spinner } from '../ui/Spinner'
import { useClients, type CreateClientData } from '../../hooks/useClients'

interface Props {
  isOpen:  boolean
  onClose: () => void
  onCreated?: () => void
}

export function ClientModal({ isOpen, onClose, onCreated }: Props) {
  const { createClient } = useClients()
  const [form, setForm] = useState<CreateClientData>({
    name:          '',
    contact_name:  '',
    contact_email: '',
    contact_phone: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const set = <K extends keyof CreateClientData>(k: K, v: CreateClientData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const reset = () => {
    setForm({ name: '', contact_name: '', contact_email: '', contact_phone: '' })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setLoading(true)
    try {
      await createClient(form)
      reset()
      onCreated?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cliente')
    } finally {
      setLoading(false)
    }
  }

  const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(5,5,10,0.75)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#1e3a5f]">Nuevo Cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input className={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Razón social / nombre comercial" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contacto</label>
            <input className={input} value={form.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} placeholder="Nombre del contacto" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" className={input} value={form.contact_email ?? ''} onChange={e => set('contact_email', e.target.value)} placeholder="correo@cliente.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
              <input className={input} value={form.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value)} placeholder="+52 ..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-[#1e3a5f] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Spinner size={14} />}
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
