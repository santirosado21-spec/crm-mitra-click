import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit3, Wrench } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { useServiciosAdicionales, type ServicioAdicional } from '../../hooks/useServiciosAdicionales'
import { ServicioForm, type ServicioFormData } from './ServicioForm'
import { CATEGORIAS_SERVICIO, UNIT_LABELS, CATEGORIA_COLORS } from '../tarifarios/tarifarioConstants'
import type { CategoriaServicio } from '../tarifarios/tarifarioConstants'

const fmtMoney = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// Primer y último día del mes actual
const now = new Date()
const mesInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

export function ServiciosPage() {
  const { clientes } = useClientCatalog()

  const [clienteF, setClienteF] = useState('')
  const [fechaDesde, setFechaDesde] = useState(mesInicio)
  const [fechaHasta, setFechaHasta] = useState(mesFin)
  const [categoriaF, setCategoriaF] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<ServicioAdicional | null>(null)

  const { servicios, loading, stats, fetchServicios, createServicio, updateServicio, deleteServicio } =
    useServiciosAdicionales({
      clienteCodigo: clienteF || undefined,
      fechaDesde,
      fechaHasta,
      categoria: categoriaF || undefined,
    })

  useEffect(() => { fetchServicios() }, [fetchServicios])

  // Búsqueda local
  const filtered = busqueda
    ? servicios.filter(s => {
        const q = busqueda.toLowerCase()
        return s.referencia.toLowerCase().includes(q)
          || s.cliente_nombre.toLowerCase().includes(q)
          || s.concepto.toLowerCase().includes(q)
      })
    : servicios

  const handleSave = async (data: ServicioFormData) => {
    try {
      if (editTarget) {
        await updateServicio(editTarget.id, data)
      } else {
        await createServicio(data)
      }
      setShowForm(false)
      setEditTarget(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al registrar')
    }
  }

  const openEdit = (svc: ServicioAdicional) => {
    setEditTarget(svc)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este servicio?')) return
    try { await deleteServicio(id) } catch { /* silenciar */ }
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y p-6">

          {/* Título */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Servicios Adicionales</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Maniobras, reempaque, reetiquetado y servicios extra — cobro automático por tarifa
              </p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="h-10 px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#16304d] transition-colors">
              <Plus size={16} /> Registrar Servicio
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {stats.total}
              </p>
              <p className="text-xs text-gray-400 mt-1">Servicios registrados</p>
            </div>
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {fmtMoney(stats.totalMXN)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Total del periodo</p>
            </div>
            <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(stats.porCategoria).map(([cat, total]) => {
                  const colors = CATEGORIA_COLORS[cat as CategoriaServicio]
                  return (
                    <span key={cat} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${colors?.bg} ${colors?.text}`}>
                      {CATEGORIAS_SERVICIO[cat as CategoriaServicio]}: {fmtMoney(total)}
                    </span>
                  )
                })}
                {Object.keys(stats.porCategoria).length === 0 && (
                  <p className="text-xs text-gray-400">Sin datos</p>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Por categoría</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-3 mb-4 flex-wrap items-end">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Cliente</label>
              <select value={clienteF} onChange={e => setClienteF(e.target.value)}
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 w-56">
                <option value="">Todos</option>
                {clientes.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Categoría</label>
              <select value={categoriaF} onChange={e => setCategoriaF(e.target.value)}
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20">
                <option value="">Todas</option>
                {Object.entries(CATEGORIAS_SERVICIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 w-48" />
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ref.</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Concepto</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Cant.</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Unidad</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">P.Unit</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Subtotal</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">
                    <Wrench size={32} className="text-gray-200 mx-auto mb-2" />
                    No hay servicios en este periodo
                  </td></tr>
                ) : filtered.map(s => {
                  const colors = CATEGORIA_COLORS[s.categoria as CategoriaServicio]
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(s.fecha_servicio)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1e3a5f]">{s.referencia}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{s.cliente_nombre}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-800 text-xs">{s.concepto}</span>
                        <span className={`ml-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${colors?.bg} ${colors?.text}`}>
                          {CATEGORIAS_SERVICIO[s.categoria as CategoriaServicio]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{s.cantidad}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{UNIT_LABELS[s.unidad] || s.unidad}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtMoney(s.precio_unitario)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1e3a5f]">{fmtMoney(s.subtotal)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(s)}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-[#1e3a5f] transition-colors" title="Editar">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(s.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
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

          {showForm && (
            <ServicioForm
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditTarget(null) }}
              editData={editTarget ? {
                id: editTarget.id,
                operacion_id: editTarget.operacion_id,
                cliente_codigo: editTarget.cliente_codigo,
                categoria: editTarget.categoria,
                concepto: editTarget.concepto,
                cantidad: editTarget.cantidad,
                fecha_servicio: editTarget.fecha_servicio,
                notas: editTarget.notas,
              } : null}
            />
          )}
        </main>
      </div>
    </div>
  )
}
