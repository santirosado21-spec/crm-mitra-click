import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { useTarifarios } from '../../hooks/useTarifarios'
import type { Tarifa } from '../../hooks/useTarifarios'
import { useOperations } from '../../hooks/useOperations'
import { CATEGORIAS_SERVICIO, UNIT_LABELS } from '../tarifarios/tarifarioConstants'
import type { CategoriaServicio } from '../tarifarios/tarifarioConstants'

export interface ServicioFormData {
  operacion_id: string | null
  referencia: string
  cliente_codigo: string
  cliente_nombre: string
  categoria: string
  concepto: string
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  subtotal: number
  moneda: string
  tarifa_id: string | null
  registrado_por: string
  fecha_servicio: string
  notas: string
}

interface Props {
  onSave: (data: ServicioFormData) => void
  onClose: () => void
  editData?: {
    id: string
    operacion_id: string | null
    cliente_codigo: string
    categoria: string
    concepto: string
    cantidad: number
    fecha_servicio: string
    notas: string
  } | null
}

const today = new Date().toISOString().split('T')[0]
const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20'
const labelCls = 'text-xs font-semibold text-gray-500 mb-1 block'

export function ServicioForm({ onSave, onClose, editData }: Props) {
  const { clientes } = useClientCatalog()
  const { tarifas, getTarifasByCliente } = useTarifarios()
  const { allOps } = useOperations()

  const [operacionId, setOperacionId] = useState<string | null>(editData?.operacion_id ?? null)
  const [clienteCodigo, setClienteCodigo] = useState(editData?.cliente_codigo ?? '')
  const [categoria, setCategoria] = useState<CategoriaServicio>((editData?.categoria as CategoriaServicio) ?? 'maniobra')
  const [concepto, setConcepto] = useState(editData?.concepto ?? '')
  const [cantidad, setCantidad] = useState(String(editData?.cantidad ?? '1'))
  const [fechaServicio, setFechaServicio] = useState(editData?.fecha_servicio ?? today)
  const [notas, setNotas] = useState(editData?.notas ?? '')

  // Tarifa seleccionada auto
  const [tarifaMatch, setTarifaMatch] = useState<Tarifa | null>(null)
  const [sinTarifa, setSinTarifa] = useState(false)

  // Cargar tarifas al cambiar cliente
  useEffect(() => {
    if (clienteCodigo) getTarifasByCliente(clienteCodigo)
  }, [clienteCodigo, getTarifasByCliente])

  // Buscar tarifa cuando cambia concepto
  useEffect(() => {
    if (!concepto || !clienteCodigo) { setTarifaMatch(null); setSinTarifa(false); return }
    const match = tarifas.find(t => t.concepto === concepto && t.categoria === categoria)
    setTarifaMatch(match || null)
    setSinTarifa(!match)
  }, [concepto, categoria, tarifas, clienteCodigo])

  // Al seleccionar operación, auto-llenar cliente
  const handleOperacionChange = (opId: string) => {
    if (!opId) { setOperacionId(null); return }
    setOperacionId(opId)
    const op = allOps.find(o => o.id === opId)
    if (op) setClienteCodigo(op.cliente_codigo)
  }

  // Filtrar operaciones por cliente
  const opsFiltered = clienteCodigo
    ? allOps.filter(o => o.cliente_codigo === clienteCodigo && o.estado !== 'cancelada')
    : allOps.filter(o => o.estado !== 'cancelada')

  // Conceptos disponibles del tarifario del cliente en la categoría actual
  const conceptosDisponibles = tarifas
    .filter(t => t.categoria === categoria)
    .map(t => t.concepto)

  const precioUnitario = tarifaMatch?.precio || 0
  const subtotal = parseFloat(cantidad || '0') * precioUnitario

  const clienteObj = clientes.find(c => c.codigo === clienteCodigo)
  const operacionObj = operacionId ? allOps.find(o => o.id === operacionId) : null
  const referencia = operacionObj?.referencia || 'SIN-REF'

  const canSave = clienteCodigo && concepto && parseFloat(cantidad || '0') > 0 && precioUnitario > 0

  const handleSubmit = () => {
    if (!canSave) return
    onSave({
      operacion_id: operacionId,
      referencia,
      cliente_codigo: clienteCodigo,
      cliente_nombre: clienteObj?.nombre || clienteCodigo,
      categoria,
      concepto,
      descripcion: notas,
      cantidad: parseFloat(cantidad),
      unidad: tarifaMatch?.unidad || 'SERVICIO',
      precio_unitario: precioUnitario,
      subtotal,
      moneda: tarifaMatch?.moneda || 'MXN',
      tarifa_id: tarifaMatch?.id || null,
      registrado_por: 'Admin',
      fecha_servicio: fechaServicio,
      notas,
    })
  }

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1e3a5f]">{editData ? 'Editar Servicio' : 'Registrar Servicio'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Cliente */}
          <div>
            <label className={labelCls}>Cliente *</label>
            <select value={clienteCodigo} onChange={e => { setClienteCodigo(e.target.value); setOperacionId(null) }} className={inputCls}>
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}</option>)}
            </select>
          </div>

          {/* Operación (opcional) */}
          <div>
            <label className={labelCls}>Operación (opcional)</label>
            <select value={operacionId || ''} onChange={e => handleOperacionChange(e.target.value)} className={inputCls}>
              <option value="">Sin operación asociada</option>
              {opsFiltered.slice(0, 50).map(o => (
                <option key={o.id} value={o.id}>{o.referencia} — {o.asunto_cliente || o.tipo_operacion}</option>
              ))}
            </select>
          </div>

          {/* Categoría + Concepto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoría *</label>
              <select value={categoria} onChange={e => { setCategoria(e.target.value as CategoriaServicio); setConcepto('') }} className={inputCls}>
                {Object.entries(CATEGORIAS_SERVICIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input type="date" value={fechaServicio} onChange={e => setFechaServicio(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Concepto *</label>
            {conceptosDisponibles.length > 0 ? (
              <select value={concepto} onChange={e => setConcepto(e.target.value)} className={inputCls}>
                <option value="">Seleccionar del tarifario...</option>
                {conceptosDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input value={concepto} onChange={e => setConcepto(e.target.value)}
                placeholder="No hay tarifas en esta categoría — escribe concepto"
                className={inputCls} />
            )}
          </div>

          {/* Alerta sin tarifa */}
          {sinTarifa && clienteCodigo && concepto && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="shrink-0" />
              No hay tarifa configurada para "{concepto}" en este cliente. Configúrala en Tarifarios primero.
            </div>
          )}

          {/* Cantidad + Auto-cálculo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Cantidad *</label>
              <input type="number" min={0.01} step={0.01} value={cantidad} onChange={e => setCantidad(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>P. Unitario</label>
              <div className="h-10 px-3 rounded-lg border border-gray-100 bg-gray-50 text-sm flex items-center font-semibold text-[#1e3a5f]">
                {fmt(precioUnitario)} / {UNIT_LABELS[tarifaMatch?.unidad || ''] || 'und'}
              </div>
            </div>
            <div>
              <label className={labelCls}>Subtotal</label>
              <div className="h-10 px-3 rounded-lg border border-green-100 bg-green-50 text-sm flex items-center font-bold text-green-700">
                {fmt(subtotal)}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas / Descripción</label>
            <input value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Detalle del servicio (opcional)" className={inputCls} />
          </div>

          <button onClick={handleSubmit} disabled={!canSave}
            className="w-full h-10 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#16304d] transition-colors disabled:opacity-40">
            <Save size={16} /> {editData ? 'Guardar Cambios' : 'Registrar Servicio'} — {fmt(subtotal)}
          </button>
        </div>
      </div>
    </div>
  )
}
