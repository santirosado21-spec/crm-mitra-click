import { useState, useEffect } from 'react'
import { Plus, CheckCircle, X, Save, Search, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { CLIENTES_BITACORA } from '../../types'

// ── Types ────────────────────────────────────────────────────────────────────
interface CargoExtra {
  id: string
  referencia: string
  cliente: string
  description: string
  amount: number
  approved: boolean
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
}

const LS_KEY = 'sc_cargos_extra'

function loadExtras(): CargoExtra[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveExtras(e: CargoExtra[]) { localStorage.setItem(LS_KEY, JSON.stringify(e)) }

const fmtMoney = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ── Component ────────────────────────────────────────────────────────────────
export function CargosExtraPage() {
  const [all, setAll] = useState<CargoExtra[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'aprobados'>('todos')
  const [showModal, setShowModal] = useState(false)

  // form
  const [referencia, setReferencia] = useState('')
  const [clienteCode, setClienteCode] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => { setAll(loadExtras()) }, [])

  const extras = all.filter(e => {
    if (filtro === 'pendientes' && e.approved) return false
    if (filtro === 'aprobados' && !e.approved) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return e.referencia.toLowerCase().includes(q) || e.cliente.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    }
    return true
  })

  const totalPendiente = all.filter(e => !e.approved).reduce((s, e) => s + e.amount, 0)
  const totalAprobado  = all.filter(e => e.approved).reduce((s, e) => s + e.amount, 0)

  function handleAdd() {
    if (!referencia || !description || !amount || !clienteCode) return
    const clienteObj = CLIENTES_BITACORA.find(c => c.codigo === clienteCode)
    const nuevo: CargoExtra = {
      id: crypto.randomUUID(),
      referencia,
      cliente: clienteObj?.nombre || clienteCode,
      description,
      amount: parseFloat(amount),
      approved: false,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
    }
    const updated = [...all, nuevo]
    setAll(updated)
    saveExtras(updated)
    setShowModal(false)
    setReferencia(''); setClienteCode(''); setDescription(''); setAmount('')
  }

  function handleApprove(id: string) {
    const updated = all.map(e => e.id === id
      ? { ...e, approved: true, approvedBy: 'Admin', approvedAt: new Date().toISOString() }
      : e
    )
    setAll(updated)
    saveExtras(updated)
  }

  function handleDelete(id: string) {
    const updated = all.filter(e => e.id !== id)
    setAll(updated)
    saveExtras(updated)
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">

          {/* Title */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Cargos Extra</h1>
              <p className="text-xs text-gray-400 mt-0.5">Cargos adicionales por operación — workflow de aprobación</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="h-10 px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#16304d] transition-colors"
            >
              <Plus size={16} /> Nuevo Cargo
            </button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-[#1e3a5f]" style={{ fontFamily: 'Nunito, sans-serif' }}>{all.length}</p>
              <p className="text-xs text-gray-400 mt-1">Total cargos</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-amber-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmtMoney(totalPendiente)}</p>
              <p className="text-xs text-gray-400 mt-1">Pendientes</p>
            </div>
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmtMoney(totalAprobado)}</p>
              <p className="text-xs text-gray-400 mt-1">Aprobados</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar referencia, cliente..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 w-64"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['todos', 'pendientes', 'aprobados'] as const).map(f => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filtro === f ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Referencia</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Descripción</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Aprobado por</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {extras.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">No hay cargos extra</td>
                  </tr>
                ) : extras.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1e3a5f]">{e.referencia}</td>
                    <td className="px-4 py-3 text-gray-700">{e.cliente}</td>
                    <td className="px-4 py-3 text-gray-600">{e.description}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtMoney(e.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        e.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {e.approved ? 'Aprobado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.approvedBy || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!e.approved && (
                          <button onClick={() => handleApprove(e.id)}
                            className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                            title="Aprobar">
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Modal Nuevo Cargo ── */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowModal(false)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-[#1e3a5f]">Nuevo Cargo Extra</h2>
                  <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Referencia de operación</label>
                    <input value={referencia} onChange={e => setReferencia(e.target.value)}
                      placeholder="SCFFL00042"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Cliente</label>
                    <select value={clienteCode} onChange={e => setClienteCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20">
                      <option value="">Seleccionar...</option>
                      {CLIENTES_BITACORA.map(c => (
                        <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Descripción del cargo</label>
                    <input value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Maniobra adicional, almacenaje extra..."
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Monto (MXN)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
                  </div>

                  <button
                    onClick={handleAdd}
                    disabled={!referencia || !clienteCode || !description || !amount}
                    className="w-full h-10 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#16304d] transition-colors disabled:opacity-40"
                  >
                    <Save size={16} /> Agregar Cargo
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
