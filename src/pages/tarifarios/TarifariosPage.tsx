import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, DollarSign, AlertCircle } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { useTarifarios } from '../../hooks/useTarifarios'
import type { Tarifa } from '../../hooks/useTarifarios'
import { TarifaForm } from './TarifaForm'
import { CATEGORIAS_SERVICIO, UNIT_LABELS, CATEGORIA_COLORS } from './tarifarioConstants'
import type { CategoriaServicio } from './tarifarioConstants'

const fmt = (n: number, cur: string) =>
  `${cur === 'USD' ? 'US' : ''}$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const TABS = Object.entries(CATEGORIAS_SERVICIO) as [CategoriaServicio, string][]

export function TarifariosPage() {
  const { clientes } = useClientCatalog()
  const { tarifas, loading, getTarifasByCliente, createTarifa, updateTarifa, deleteTarifa } = useTarifarios()

  const [cliente, setCliente] = useState('')
  const [tab, setTab] = useState<CategoriaServicio>('almacenaje')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Tarifa | null>(null)

  useEffect(() => {
    if (cliente) getTarifasByCliente(cliente)
  }, [cliente, getTarifasByCliente])

  const filtered = tarifas.filter(t => t.categoria === tab)
  const clienteObj = clientes.find(c => c.codigo === cliente)

  const handleSave = async (data: {
    categoria: string; concepto: string; unidad: string
    precio: number; moneda: 'MXN' | 'USD'; notas: string
  }) => {
    try {
      if (editing) {
        await updateTarifa(editing.id, data)
      } else {
        await createTarifa({
          cliente_id: clienteObj?.id || null,
          cliente_codigo: cliente,
          ...data,
        })
      }
      setShowForm(false)
      setEditing(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const handleEdit = (t: Tarifa) => { setEditing(t); setShowForm(true) }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta tarifa?')) return
    try { await deleteTarifa(id) } catch { /* silenciar */ }
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Tarifarios</h1>
              <p className="text-xs text-gray-400 mt-0.5">Rate cards por cliente — precios por servicio logístico</p>
            </div>
          </div>

          <div className="flex gap-3 items-end mb-6 flex-wrap">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Cliente</label>
              <select value={cliente} onChange={e => setCliente(e.target.value)}
                className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 w-72">
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
            </div>
            {cliente && (
              <button onClick={() => { setEditing(null); setShowForm(true) }}
                className="h-10 px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#16304d] transition-colors">
                <Plus size={16} /> Nueva Tarifa
              </button>
            )}
          </div>

          {!cliente ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <DollarSign size={48} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Selecciona un cliente para ver sus tarifas</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-5 flex-wrap">
                {TABS.map(([key, label]) => {
                  const count = tarifas.filter(t => t.categoria === key).length
                  return (
                    <button key={key} onClick={() => setTab(key)}
                      className={`px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        tab === key ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {label}
                      {count > 0 && (
                        <span className="bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {tarifas.length === 0 && !loading && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                  <AlertCircle size={16} className="shrink-0" />
                  Este cliente no tiene tarifas configuradas. Agrega tarifas para habilitar el cobro automático.
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Concepto</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Unidad</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Moneda</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Notas</th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400">Cargando...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                        No hay tarifas en {CATEGORIAS_SERVICIO[tab]}
                      </td></tr>
                    ) : filtered.map(t => {
                      const colors = CATEGORIA_COLORS[t.categoria as CategoriaServicio]
                      return (
                        <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800">{t.concepto}</span>
                            <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors?.bg} ${colors?.text}`}>
                              {CATEGORIAS_SERVICIO[t.categoria as CategoriaServicio]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{UNIT_LABELS[t.unidad] || t.unidad}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#1e3a5f]">{fmt(t.precio, t.moneda)}</td>
                          <td className="px-4 py-3 text-gray-500">{t.moneda}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{t.notas || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => handleEdit(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#1e3a5f] transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {showForm && (
            <TarifaForm editing={editing} onSave={handleSave}
              onClose={() => { setShowForm(false); setEditing(null) }} />
          )}
        </main>
      </div>
    </div>
  )
}
