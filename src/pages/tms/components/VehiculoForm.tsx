import { useState } from 'react'
import { X, Save } from 'lucide-react'
import type { Vehiculo } from '../../../types/tms'

const TIPOS = ['Rabon', 'Trailer', 'Van', 'Van ligera', 'Auto chico', 'Torton', 'Plataforma']
const COMBUSTIBLES = ['Diesel', 'Gasolina'] as const

export interface VehiculoFormData {
  clave: string
  placa: string
  modelo: string
  tipo: string
  combustible: 'Diesel' | 'Gasolina'
  rendimiento: number
  depreciacion: number
  es_propio: boolean
  proveedor_nombre: string | null
  capacidad_kg: number
  color: string
  vin: string | null
  año: number | null
  notas: string
  activo: boolean
  motive_vehicle_id: string | null
}

interface Props {
  onSave: (data: VehiculoFormData) => void
  onClose: () => void
  editData?: Vehiculo | null
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20'
const labelCls = 'text-xs font-semibold text-gray-500 mb-1 block'

export function VehiculoForm({ onSave, onClose, editData }: Props) {
  const [placa, setPlaca] = useState(editData?.placa ?? '')
  const [modelo, setModelo] = useState(editData?.modelo ?? '')
  const [tipo, setTipo] = useState(editData?.tipo ?? 'Rabon')
  const [combustible, setCombustible] = useState<'Diesel' | 'Gasolina'>(editData?.combustible ?? 'Diesel')
  const [rendimiento, setRendimiento] = useState(String(editData?.rendimiento ?? '3'))
  const [depreciacion, setDepreciacion] = useState(String(editData?.depreciacion ?? '0'))
  const [esPropio, setEsPropio] = useState(editData?.es_propio ?? true)
  const [proveedorNombre, setProveedorNombre] = useState(editData?.proveedor_nombre ?? '')
  const [capacidadKg, setCapacidadKg] = useState(String(editData?.capacidad_kg ?? '0'))
  const [color, setColor] = useState(editData?.color ?? '')
  const [vin, setVin] = useState(editData?.vin ?? '')
  const [año, setAño] = useState(String(editData?.año ?? ''))
  const [notas, setNotas] = useState(editData?.notas ?? '')

  const clave = editData?.clave ?? `${tipo.slice(0, 3).toUpperCase()}_${placa.replace(/\s/g, '').toUpperCase()}`
  const canSave = placa.trim().length > 0 && modelo.trim().length > 0

  const handleSubmit = () => {
    if (!canSave) return
    onSave({
      clave,
      placa: placa.trim().toUpperCase(),
      modelo: modelo.trim(),
      tipo,
      combustible,
      rendimiento: parseFloat(rendimiento) || 0,
      depreciacion: parseFloat(depreciacion) || 0,
      es_propio: esPropio,
      proveedor_nombre: esPropio ? null : (proveedorNombre.trim() || null),
      capacidad_kg: parseFloat(capacidadKg) || 0,
      color,
      vin: vin || null,
      año: año ? parseInt(año) : null,
      notas,
      activo: true,
      motive_vehicle_id: editData?.motive_vehicle_id ?? null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1e3a5f]">{editData ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Placa *</label>
              <input value={placa} onChange={e => setPlaca(e.target.value)} placeholder="54AK8K" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Modelo *</label>
              <input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="ISUZU Forward" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Combustible</label>
              <select value={combustible} onChange={e => setCombustible(e.target.value as 'Diesel' | 'Gasolina')} className={inputCls}>
                {COMBUSTIBLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Año</label>
              <input type="number" value={año} onChange={e => setAño(e.target.value)} placeholder="2024" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Rendimiento (km/L)</label>
              <input type="number" min={0} step={0.1} value={rendimiento} onChange={e => setRendimiento(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Depreciación (MXN/día)</label>
              <input type="number" min={0} step={1} value={depreciacion} onChange={e => setDepreciacion(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Capacidad (kg)</label>
              <input type="number" min={0} value={capacidadKg} onChange={e => setCapacidadKg(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Propio / Externo toggle */}
          <div>
            <label className={labelCls}>Tipo de Flota</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Color</label>
              <input value={color} onChange={e => setColor(e.target.value)} placeholder="Blanco" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>VIN</label>
              <input value={vin} onChange={e => setVin(e.target.value)} placeholder="Número de serie" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones (opcional)" className={inputCls} />
          </div>

          <button onClick={handleSubmit} disabled={!canSave}
            className="w-full h-10 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#16304d] transition-colors disabled:opacity-40">
            <Save size={16} /> {editData ? 'Guardar Cambios' : 'Crear Vehículo'}
          </button>
        </div>
      </div>
    </div>
  )
}
