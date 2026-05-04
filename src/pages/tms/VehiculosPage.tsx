import { useState, useMemo } from 'react'
import { Plus, Search, Edit3, Trash2, Truck, Zap } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useVehiculos } from '../../hooks/useVehiculos'
import { VehiculoForm, type VehiculoFormData } from './components/VehiculoForm'
import type { Vehiculo } from '../../types/tms'
import { UNIDADES } from '../cotizador/cotizadorConstants'

// Convert cotizador UNIDADES into Vehiculo objects (read-only fleet baseline)
const COTIZADOR_VEHICULOS: Vehiculo[] = UNIDADES.map(u => ({
  id:                'cotizador:' + u.clave,
  clave:             u.clave,
  placa:             u.placa,
  modelo:            u.modelo,
  tipo:              u.tipo,
  combustible:       (u.combustible === 'Diésel' ? 'Diesel' : 'Gasolina') as Vehiculo['combustible'],
  rendimiento:       u.rendimiento,
  depreciacion:      u.depreciacion,
  es_propio:         true,
  proveedor_nombre:  null,
  motive_vehicle_id: null,
  año:               null,
  vin:               null,
  color:             '',
  capacidad_kg:      0,
  activo:            true,
  notas:             'Flota Supply Chain (Cotizador)',
  created_at:        '',
  updated_at:        '',
}))

export function VehiculosPage() {
  const { vehiculos, loading, createVehiculo, updateVehiculo, deleteVehiculo } = useVehiculos()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Vehiculo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'propio' | 'externo'>('todos')

  // Merge: DB vehicles take precedence; cotizador fills any clave that isn't in DB
  const merged = useMemo<Vehiculo[]>(() => {
    const dbClaves = new Set(vehiculos.map(v => v.clave))
    const fallback = COTIZADOR_VEHICULOS.filter(v => !dbClaves.has(v.clave))
    return [...vehiculos, ...fallback]
  }, [vehiculos])

  const filtered = merged
    .filter(v => {
      if (filtroTipo === 'propio') return v.es_propio
      if (filtroTipo === 'externo') return !v.es_propio
      return true
    })
    .filter(v => {
      if (!busqueda) return true
      const q = busqueda.toLowerCase()
      return v.placa.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q) || v.tipo.toLowerCase().includes(q)
    })

  const handleSave = async (data: VehiculoFormData) => {
    try {
      if (editTarget) {
        await updateVehiculo(editTarget.id, data)
      } else {
        await createVehiculo(data)
      }
      setShowForm(false)
      setEditTarget(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Desactivar este vehículo?')) return
    try { await deleteVehiculo(id) } catch { /* silent */ }
  }

  const propios = merged.filter(v => v.es_propio).length
  const externos = merged.filter(v => !v.es_propio).length

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Vehículos</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {propios} propios · {externos} externos · {merged.length} total
              </p>
            </div>
            <button onClick={() => { setEditTarget(null); setShowForm(true) }}
              className="h-10 px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#16304d] transition-colors">
              <Plus size={16} /> Nuevo Vehículo
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-3 mb-4 items-end">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['todos', 'propio', 'externo'] as const).map(tab => (
                <button key={tab} onClick={() => setFiltroTipo(tab)}
                  className={`px-4 h-9 text-sm font-medium transition-colors ${filtroTipo === tab ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {tab === 'todos' ? 'Todos' : tab === 'propio' ? 'Propios' : 'Externos'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar placa/modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 w-48" />
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Placa</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Modelo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Comb.</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">km/L</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Depr./día</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Flota</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Motive</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">
                    <Truck size={32} className="text-gray-200 mx-auto mb-2" />
                    No hay vehículos
                  </td></tr>
                ) : filtered.map(v => {
                  const fromCotizador = v.id.startsWith('cotizador:')
                  return (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-[#1e3a5f]">{v.placa}</td>
                    <td className="px-4 py-3 text-gray-700">{v.modelo}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-600">{v.tipo}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{v.combustible}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{v.rendimiento}</td>
                    <td className="px-4 py-3 text-right text-gray-600">${v.depreciacion.toFixed(0)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${v.es_propio ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                        {v.es_propio ? 'Propio' : 'Externo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {fromCotizador ? (
                        <span className="text-[9px] font-semibold text-amber-600 px-1.5 py-0.5 rounded bg-amber-50" title="Definido en código del Cotizador">Cotizador</span>
                      ) : v.motive_vehicle_id ? (
                        <Zap size={14} className="text-green-500 mx-auto" title="Sincronizado con Motive" />
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {fromCotizador ? (
                        <span className="text-[10px] text-gray-300">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditTarget(v); setShowForm(true) }}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-[#1e3a5f] transition-colors" title="Editar">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(v.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Desactivar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          {showForm && (
            <VehiculoForm
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditTarget(null) }}
              editData={editTarget}
            />
          )}
        </main>
      </div>
    </div>
  )
}
