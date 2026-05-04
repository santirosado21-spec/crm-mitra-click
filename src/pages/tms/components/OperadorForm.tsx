import { useState } from 'react'
import { X, Save } from 'lucide-react'
import type { Operador } from '../../../types/tms'

const LICENCIA_TIPOS = ['Federal', 'Estatal', 'Particular']

export interface OperadorFormData {
  nombre: string
  telefono: string
  email: string
  licencia_tipo: string
  licencia_numero: string
  licencia_vigencia: string | null
  es_propio: boolean
  proveedor_nombre: string | null
  motive_user_id: string | null
  sueldo_diario: number
  notas: string
  activo: boolean
}

interface Props {
  onSave: (data: OperadorFormData) => void
  onClose: () => void
  editData?: Operador | null
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20'
const labelCls = 'text-xs font-semibold text-gray-500 mb-1 block'

export function OperadorForm({ onSave, onClose, editData }: Props) {
  const [nombre, setNombre] = useState(editData?.nombre ?? '')
  const [telefono, setTelefono] = useState(editData?.telefono ?? '')
  const [email, setEmail] = useState(editData?.email ?? '')
  const [licenciaTipo, setLicenciaTipo] = useState(editData?.licencia_tipo ?? '')
  const [licenciaNumero, setLicenciaNumero] = useState(editData?.licencia_numero ?? '')
  const [licenciaVigencia, setLicenciaVigencia] = useState(editData?.licencia_vigencia ?? '')
  const [esPropio, setEsPropio] = useState(editData?.es_propio ?? true)
  const [proveedorNombre, setProveedorNombre] = useState(editData?.proveedor_nombre ?? '')
  const [sueldoDiario, setSueldoDiario] = useState(String(editData?.sueldo_diario ?? '420'))
  const [notas, setNotas] = useState(editData?.notas ?? '')

  const canSave = nombre.trim().length > 0

  const handleSubmit = () => {
    if (!canSave) return
    onSave({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      licencia_tipo: licenciaTipo,
      licencia_numero: licenciaNumero.trim(),
      licencia_vigencia: licenciaVigencia || null,
      es_propio: esPropio,
      proveedor_nombre: esPropio ? null : (proveedorNombre.trim() || null),
      motive_user_id: editData?.motive_user_id ?? null,
      sueldo_diario: parseFloat(sueldoDiario) || 0,
      notas,
      activo: true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1e3a5f]">{editData ? 'Editar Operador' : 'Nuevo Operador'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan Pérez García" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="55 1234 5678" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operador@email.com" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tipo Licencia</label>
              <select value={licenciaTipo} onChange={e => setLicenciaTipo(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {LICENCIA_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>No. Licencia</label>
              <input value={licenciaNumero} onChange={e => setLicenciaNumero(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vigencia</label>
              <input type="date" value={licenciaVigencia} onChange={e => setLicenciaVigencia(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Propio / Externo */}
          <div>
            <label className={labelCls}>Tipo</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEsPropio(true)}
                className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-colors ${esPropio ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-600 border-gray-200'}`}>
                Propio
              </button>
              <button type="button" onClick={() => setEsPropio(false)}
                className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-colors ${!esPropio ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                Externo
              </button>
            </div>
          </div>

          {!esPropio && (
            <div>
              <label className={labelCls}>Proveedor</label>
              <input
                value={proveedorNombre}
                onChange={e => setProveedorNombre(e.target.value)}
                placeholder="Nombre del proveedor"
                className={inputCls}
              />
            </div>
          )}

          {esPropio && (
            <div>
              <label className={labelCls}>Sueldo diario (MXN)</label>
              <input type="number" min={0} value={sueldoDiario} onChange={e => setSueldoDiario(e.target.value)} className={inputCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>Notas</label>
            <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones (opcional)" className={inputCls} />
          </div>

          <button onClick={handleSubmit} disabled={!canSave}
            className="w-full h-10 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#16304d] transition-colors disabled:opacity-40">
            <Save size={16} /> {editData ? 'Guardar Cambios' : 'Crear Operador'}
          </button>
        </div>
      </div>
    </div>
  )
}
