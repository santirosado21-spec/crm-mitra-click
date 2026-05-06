import { useState, useEffect, useMemo } from 'react'
import { Calendar, AlertTriangle, Plus, X, Mail } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { UNIDADES as UNIDADES_FALLBACK, TIPOS_TRAMITE, type TipoTramite } from '../cotizador/cotizadorConstants'
import { useVehiculos } from '../../hooks/useVehiculos'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Tramite {
  id: number
  unidad: string        // clave de UNIDADES
  tipo: string          // id de TIPOS_TRAMITE
  fechaVencimiento: string  // ISO date string
  notas: string
}

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'sc_tramites'
function loadTramites(): Tramite[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
function saveTramites(t: Tramite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDias(fechaStr: string): number {
  return Math.ceil((new Date(fechaStr).getTime() - Date.now()) / 86_400_000)
}

function getEstadoClase(dias: number): { bg: string; text: string; label: string; border: string } {
  if (dias <= 0) return { bg: 'bg-red-50', text: 'text-red-700', label: dias === 0 ? 'Vence HOY' : `Vencido hace ${Math.abs(dias)}d`, border: 'border-red-400' }
  if (dias <= 7) return { bg: 'bg-amber-50', text: 'text-amber-700', label: `${dias} días`, border: 'border-amber-400' }
  if (dias <= 30) return { bg: 'bg-yellow-50', text: 'text-yellow-700', label: `${dias} días`, border: 'border-yellow-400' }
  return { bg: 'bg-white', text: 'text-gray-700', label: `${dias} días`, border: 'border-gray-200' }
}

function getBadgeClass(dias: number): string {
  if (dias <= 0) return 'bg-red-600 text-white'
  if (dias <= 7) return 'bg-amber-500 text-white'
  if (dias <= 30) return 'bg-yellow-400 text-gray-900'
  return 'bg-gray-100 text-gray-600'
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white focus:ring-1 focus:ring-[#1e3a5f]/20 transition-colors'
const lbl = 'block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5'

// ── Main Page ─────────────────────────────────────────────────────────────────
export function TramitesPage() {
  const { vehiculos: dbVehiculos } = useVehiculos()
  // Use Supabase vehicles if available, fallback to hardcoded UNIDADES
  const UNIDADES = dbVehiculos.length > 0
    ? dbVehiculos.map(v => ({ clave: v.clave, placa: v.placa, modelo: v.modelo, tipo: v.tipo, combustible: v.combustible as 'Diésel' | 'Gasolina', rendimiento: v.rendimiento, depreciacion: v.depreciacion }))
    : [...UNIDADES_FALLBACK]

  const [tramites, setTramites] = useState<Tramite[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  // Form state
  const [fUnidad, setFUnidad] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fFecha, setFFecha] = useState('')
  const [fNotas, setFNotas] = useState('')

  useEffect(() => { setTramites(loadTramites()) }, [])

  // ── Alertas ─────────────────────────────────────────────────────────────────
  const alertas = useMemo(() => {
    return tramites.filter(t => {
      const dias = getDias(t.fechaVencimiento)
      const tipo = TIPOS_TRAMITE.find(x => x.id === t.tipo)
      return dias <= (tipo?.diasAlerta ?? 30)
    }).sort((a, b) => getDias(a.fechaVencimiento) - getDias(b.fechaVencimiento))
  }, [tramites])

  // ── Tramites ordenados para calendario ──────────────────────────────────────
  const tramitesOrdenados = useMemo(() =>
    [...tramites].sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()),
  [tramites])

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const openNew = (unidadClave = '') => {
    setEditId(null)
    setFUnidad(unidadClave); setFTipo(''); setFFecha(''); setFNotas('')
    setModalOpen(true)
  }

  const openEdit = (id: number) => {
    const t = tramites.find(x => x.id === id)
    if (!t) return
    setEditId(t.id)
    setFUnidad(t.unidad); setFTipo(t.tipo); setFFecha(t.fechaVencimiento); setFNotas(t.notas)
    setModalOpen(true)
  }

  const guardar = () => {
    if (!fUnidad || !fTipo || !fFecha) return
    const data: Tramite = { id: editId ?? Date.now(), unidad: fUnidad, tipo: fTipo, fechaVencimiento: fFecha, notas: fNotas }
    const updated = editId
      ? tramites.map(t => t.id === editId ? data : t)
      : [...tramites, data]
    setTramites(updated)
    saveTramites(updated)
    setModalOpen(false)
  }

  const eliminar = () => {
    if (!editId || !confirm('¿Eliminar este trámite?')) return
    const updated = tramites.filter(t => t.id !== editId)
    setTramites(updated)
    saveTramites(updated)
    setModalOpen(false)
  }

  const enviarAlertas = () => {
    const email = prompt('Ingresa email para enviar alertas:')
    if (!email) return
    const msg = alertas.map(t => {
      const u = UNIDADES.find(x => x.clave === t.unidad)
      const tipo = TIPOS_TRAMITE.find(x => x.id === t.tipo)
      return `• ${u?.placa}: ${tipo?.nombre} - ${getDias(t.fechaVencimiento)}d`
    }).join('%0A')
    window.location.href = `mailto:${email}?subject=${encodeURIComponent('⚠️ Alerta Trámites - SupplyChain')}&body=Trámites próximos:%0A%0A${msg}%0A%0A--SupplyChain México`
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Trámites Vehiculares</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Control de vencimientos: tenencia, verificación, seguro, servicios y más
              </p>
            </div>
            <div className="flex gap-2">
              {alertas.length > 0 && (
                <button onClick={enviarAlertas}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:opacity-90 text-white text-sm font-bold rounded-xl transition-opacity">
                  <Mail size={14} /> Enviar alertas ({alertas.length})
                </button>
              )}
              <button onClick={() => openNew()}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:opacity-90 text-white text-sm font-bold rounded-xl transition-opacity">
                <Plus size={14} /> Nuevo trámite
              </button>
            </div>
          </div>

          {/* Alertas */}
          {alertas.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-5">
              <h3 className="text-base font-extrabold text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Próximos a Vencer ({alertas.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {alertas.map(t => {
                  const u = UNIDADES.find(x => x.clave === t.unidad)
                  const tipo = TIPOS_TRAMITE.find(x => x.id === t.tipo)
                  const dias = getDias(t.fechaVencimiento)
                  return (
                    <div key={t.id}
                      className="bg-white rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow"
                      style={{ borderLeft: `4px solid ${tipo?.color ?? '#888'}` }}
                      onClick={() => openEdit(t.id)}>
                      <p className="font-extrabold text-[#1e3a5f] text-sm">{u?.placa}</p>
                      <p className="text-xs text-gray-500">{tipo?.nombre}</p>
                      <p className={`text-sm font-bold mt-1 ${dias <= 0 ? 'text-red-600' : dias <= 7 ? 'text-amber-600' : 'text-yellow-600'}`}>
                        {dias <= 0 ? (dias === 0 ? 'HOY' : `${Math.abs(dias)}d vencido`) : `${dias} días`}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Calendario Visual */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#1e3a5f] mb-4">
              <Calendar size={16} /> Vista de Calendario
            </h2>
            {tramitesOrdenados.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No hay trámites registrados. Agrega trámites para verlos aquí.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {tramitesOrdenados.map(t => {
                  const u = UNIDADES.find(x => x.clave === t.unidad)
                  const tipo = TIPOS_TRAMITE.find(x => x.id === t.tipo)
                  const dias = getDias(t.fechaVencimiento)
                  const est = getEstadoClase(dias)
                  const fecha = new Date(t.fechaVencimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

                  const headerBg = dias <= 0 ? '#dc2626' : dias <= 7 ? '#f59e0b' : dias <= 30 ? '#eab308' : '#1e3a5f'

                  return (
                    <div key={t.id}
                      className={`rounded-xl border-2 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${est.border} ${est.bg}`}
                      onClick={() => openEdit(t.id)}>
                      <div className="px-3 py-2 flex justify-between items-center text-white" style={{ background: headerBg }}>
                        <span className="font-extrabold text-sm">{u?.placa ?? 'N/A'}</span>
                        <span className="text-[10px] opacity-80">{u?.tipo ?? ''}</span>
                      </div>
                      <div className="p-3 text-center">
                        <div className={`text-3xl font-extrabold ${dias <= 0 ? 'text-red-600' : dias <= 7 ? 'text-amber-600' : 'text-[#1e3a5f]'}`}>
                          {dias <= 0 ? (dias === 0 ? 'HOY' : Math.abs(dias)) : dias}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {dias <= 0 ? (dias === 0 ? 'Vence hoy' : 'días vencido') : 'días restantes'}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">{fecha}</div>
                        <div className="flex items-center justify-center gap-1.5 mt-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: tipo?.color ?? '#888' }} />
                          <span className="text-xs font-semibold text-[#1e3a5f]">{tipo?.nombre ?? 'Trámite'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tabla Cruzada: Unidades × Tipos de Trámite */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#1e3a5f]">
                Trámites por Unidad
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 px-3 text-left font-bold text-gray-700">Unidad</th>
                    {TIPOS_TRAMITE.map(tipo => (
                      <th key={tipo.id} className="py-3 px-2 text-center font-bold text-gray-700">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded" style={{ background: tipo.color }} />
                          <span className="text-xs">{tipo.nombre}</span>
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {UNIDADES.map(u => (
                    <tr key={u.clave} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-3">
                        <p className="font-bold text-[#1e3a5f]">{u.placa}</p>
                        <p className="text-[10px] text-gray-400">{u.modelo}</p>
                      </td>
                      {TIPOS_TRAMITE.map((tipo: TipoTramite) => {
                        const tr = tramites.find(t => t.unidad === u.clave && t.tipo === tipo.id)
                        if (!tr) return (
                          <td key={tipo.id} className="py-3 px-2 text-center">
                            <span className="text-gray-300">—</span>
                          </td>
                        )
                        const dias = getDias(tr.fechaVencimiento)
                        const badgeCls = getBadgeClass(dias)
                        let texto: string
                        if (dias <= 0) texto = 'Vencido'
                        else if (dias <= 30) texto = `${dias}d`
                        else texto = new Date(tr.fechaVencimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })

                        return (
                          <td key={tipo.id} className="py-3 px-2 text-center">
                            <button
                              onClick={() => openEdit(tr.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badgeCls} hover:opacity-80 transition-opacity`}
                            >
                              {texto}
                            </button>
                          </td>
                        )
                      })}
                      <td className="py-3 px-2 text-center">
                        <button onClick={() => openNew(u.clave)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 mx-auto">
                          <Plus size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-extrabold text-[#1e3a5f]">
                {editId ? '✏️ Editar Trámite' : '➕ Nuevo Trámite'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={lbl}>Unidad</label>
                <select className={inp} value={fUnidad} onChange={e => setFUnidad(e.target.value)} required>
                  <option value="">Seleccionar...</option>
                  {UNIDADES.map(u => <option key={u.clave} value={u.clave}>{u.placa} - {u.modelo}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Tipo de trámite</label>
                <select className={inp} value={fTipo} onChange={e => setFTipo(e.target.value)} required>
                  <option value="">Seleccionar...</option>
                  {TIPOS_TRAMITE.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Fecha de vencimiento</label>
                <input type="date" className={inp} value={fFecha} onChange={e => setFFecha(e.target.value)} required />
              </div>
              <div>
                <label className={lbl}>Notas</label>
                <textarea className={inp} rows={2} value={fNotas} onChange={e => setFNotas(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors">
                Cancelar
              </button>
              {editId && (
                <button onClick={eliminar}
                  className="py-2.5 px-4 bg-red-600 hover:opacity-90 text-white text-sm font-bold rounded-xl transition-opacity">
                  🗑️
                </button>
              )}
              <button onClick={guardar}
                className="flex-1 py-2.5 bg-[#1e3a5f] hover:opacity-90 text-white text-sm font-bold rounded-xl transition-opacity">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
