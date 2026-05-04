import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { Tarifa } from '../../hooks/useTarifarios'
import { CATEGORIAS_SERVICIO, CONCEPTOS_PREDEFINIDOS, UNIDADES_POR_CATEGORIA, UNIT_LABELS } from './tarifarioConstants'
import type { CategoriaServicio } from './tarifarioConstants'

interface Props {
  editing?: Tarifa | null
  onSave: (data: {
    categoria: string
    concepto: string
    unidad: string
    precio: number
    moneda: 'MXN' | 'USD'
    notas: string
  }) => void
  onClose: () => void
}

export function TarifaForm({ editing, onSave, onClose }: Props) {
  const [categoria, setCategoria] = useState<CategoriaServicio>('maniobra')
  const [concepto, setConcepto]   = useState('')
  const [customConcepto, setCustomConcepto] = useState('')
  const [unidad, setUnidad]       = useState('SERVICIO')
  const [precio, setPrecio]       = useState('')
  const [moneda, setMoneda]       = useState<'MXN' | 'USD'>('MXN')
  const [notas, setNotas]         = useState('')

  // Pre-llenar si estamos editando
  useEffect(() => {
    if (editing) {
      setCategoria(editing.categoria as CategoriaServicio)
      const predefinidos = CONCEPTOS_PREDEFINIDOS[editing.categoria as CategoriaServicio] || []
      if (predefinidos.includes(editing.concepto)) {
        setConcepto(editing.concepto)
        setCustomConcepto('')
      } else {
        setConcepto('__custom__')
        setCustomConcepto(editing.concepto)
      }
      setUnidad(editing.unidad)
      setPrecio(String(editing.precio))
      setMoneda(editing.moneda)
      setNotas(editing.notas)
    }
  }, [editing])

  // Al cambiar categoría, resetear concepto y ajustar unidad
  const handleCategoriaChange = (cat: CategoriaServicio) => {
    setCategoria(cat)
    setConcepto('')
    setCustomConcepto('')
    const unidades = UNIDADES_POR_CATEGORIA[cat]
    if (unidades.length > 0) setUnidad(unidades[0])
  }

  const conceptoFinal = concepto === '__custom__' ? customConcepto : concepto
  const canSave = conceptoFinal.trim() && precio && parseFloat(precio) > 0

  const handleSubmit = () => {
    if (!canSave) return
    onSave({
      categoria,
      concepto: conceptoFinal.trim(),
      unidad,
      precio: parseFloat(precio),
      moneda,
      notas,
    })
  }

  const conceptos = CONCEPTOS_PREDEFINIDOS[categoria] || []
  const unidades = UNIDADES_POR_CATEGORIA[categoria] || Object.keys(UNIT_LABELS)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1e3a5f]">
            {editing ? 'Editar Tarifa' : 'Nueva Tarifa'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Categoría */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Categoría</label>
            <select
              value={categoria}
              onChange={e => handleCategoriaChange(e.target.value as CategoriaServicio)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
            >
              {Object.entries(CATEGORIAS_SERVICIO).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Concepto */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Concepto</label>
            <select
              value={concepto}
              onChange={e => { setConcepto(e.target.value); setCustomConcepto('') }}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
            >
              <option value="">Seleccionar concepto...</option>
              {conceptos.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">Otro (personalizado)</option>
            </select>
            {concepto === '__custom__' && (
              <input
                value={customConcepto}
                onChange={e => setCustomConcepto(e.target.value)}
                placeholder="Nombre del concepto"
                className="w-full h-10 px-3 mt-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              />
            )}
          </div>

          {/* Unidad + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Unidad</label>
              <select
                value={unidad}
                onChange={e => setUnidad(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              >
                {unidades.map(u => (
                  <option key={u} value={u}>{UNIT_LABELS[u] || u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Moneda</label>
              <select
                value={moneda}
                onChange={e => setMoneda(e.target.value as 'MXN' | 'USD')}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Precio */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Precio por unidad</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                className="w-full h-10 pl-7 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Notas</label>
            <input
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Opcional"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="w-full h-10 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#16304d] transition-colors disabled:opacity-40"
          >
            <Save size={16} /> Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
