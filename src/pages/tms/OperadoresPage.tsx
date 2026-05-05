import { useState } from 'react'
import { Plus, Search, Edit3, Trash2, UserCheck, Zap } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useOperadores } from '../../hooks/useOperadores'
import { OperadorForm, type OperadorFormData } from './components/OperadorForm'
import type { Operador } from '../../types/tms'

const fmtMoney = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export function OperadoresPage() {
  const { operadores, loading, createOperador, updateOperador, deleteOperador } = useOperadores()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Operador | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'propio' | 'externo'>('todos')

  const filtered = operadores
    .filter(o => {
      if (filtroTipo === 'propio') return o.es_propio
      if (filtroTipo === 'externo') return !o.es_propio
      return true
    })
    .filter(o => {
      if (!busqueda) return true
      const q = busqueda.toLowerCase()
      return o.nombre.toLowerCase().includes(q) || o.telefono?.includes(q)
    })

  const handleSave = async (data: OperadorFormData) => {
    try {
      if (editTarget) {
        await updateOperador(editTarget.id, data)
      } else {
        await createOperador(data)
      }
      setShowForm(false)
      setEditTarget(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Desactivar este operador?')) return
    try { await deleteOperador(id) } catch { /* silent */ }
  }

  const propios = operadores.filter(o => o.es_propio).length
  const externos = operadores.filter(o => !o.es_propio).length

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Operadores</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {propios} propios · {externos} externos · {operadores.length} total
              </p>
            </div>
            <button onClick={() => { setEditTarget(null); setShowForm(true) }}
              className="h-10 px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#16304d] transition-colors">
              <Plus size={16} /> Nuevo Operador
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
              <input type="text" placeholder="Buscar nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 w-48" />
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Licencia</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Sueldo/día</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Motive</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                    <UserCheck size={32} className="text-gray-200 mx-auto mb-2" />
                    No hay operadores registrados
                  </td></tr>
                ) : filtered.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{o.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.telefono || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-700">{o.licencia_tipo || '—'}</div>
                      {o.licencia_numero && <div className="text-[10px] text-gray-400">{o.licencia_numero}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${o.es_propio ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                        {o.es_propio ? 'Propio' : 'Externo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{o.es_propio ? fmtMoney(o.sueldo_diario) : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {o.motive_user_id ? (
                        <Zap size={14} className="text-green-500 mx-auto" title="Sincronizado con Motive" />
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditTarget(o); setShowForm(true) }}
                          className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-[#1e3a5f] transition-colors" title="Editar">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(o.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Desactivar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showForm && (
            <OperadorForm
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
