import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart3 } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { Sidebar } from '../../../components/layout/Sidebar'
import { Spinner } from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'

interface UserStats {
  user_email:    string
  user_name:     string | null
  open_tasks:    number
  finished:      number
  rejected:      number
  cancelled:     number
  overdue:       number
  total_minutes: number
}

const fmtH = (m: number) => {
  const h = Math.floor((m ?? 0) / 60), min = Math.round((m ?? 0) % 60)
  return `${h}h ${min}m`
}

export function Reports() {
  const [rows, setRows] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true); setError(null)
    try {
      const [{ data: stats, error: e1 }, { data: members }] = await Promise.all([
        supabase.from('v_task_user_stats').select('*'),
        supabase.from('team_members').select('user_email, user_name'),
      ])
      if (e1) throw e1
      const nameMap = new Map<string, string | null>()
      for (const m of (members ?? []) as { user_email: string; user_name: string | null }[]) {
        nameMap.set(m.user_email, m.user_name)
      }
      const out: UserStats[] = ((stats ?? []) as UserStats[]).map(r => ({
        ...r,
        user_name: nameMap.get(r.user_email) ?? null,
      }))
      out.sort((a,b) => Number(b.total_minutes) - Number(a.total_minutes))
      setRows(out)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { reload() }, [])

  // Totales
  const tot = {
    open:      rows.reduce((s,r) => s + Number(r.open_tasks ?? 0), 0),
    finished:  rows.reduce((s,r) => s + Number(r.finished ?? 0), 0),
    rejected:  rows.reduce((s,r) => s + Number(r.rejected ?? 0), 0),
    overdue:   rows.reduce((s,r) => s + Number(r.overdue ?? 0), 0),
    minutes:   rows.reduce((s,r) => s + Number(r.total_minutes ?? 0), 0),
  }
  const totalDecisions = tot.finished + tot.rejected
  const acceptanceRate = totalDecisions > 0 ? Math.round((tot.finished / totalDecisions) * 100) : 0
  const maxMinutes     = Math.max(...rows.map(r => Number(r.total_minutes) || 0), 1)

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
              <BarChart3 size={20} /> Reportes operativos
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Solo administradores · Estadísticas por persona</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KPI title="Tiempo total trackeado"  value={fmtH(tot.minutes)} color="#1e3a5f" />
            <KPI title="Tareas abiertas"         value={String(tot.open)}    color="#28a745" />
            <KPI title="Vencidas"                value={String(tot.overdue)} color="#dc3545" icon={<AlertTriangle size={14} />} />
            <KPI title="Tasa de aceptación"      value={`${acceptanceRate}%`} color="#7c3aed" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando reportes...
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <p className="text-sm text-gray-400">Sin datos todavía. Asigna tareas y trackea tiempo para ver estadísticas.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 lg:hidden">
                {rows.map(r => (
                  <div key={r.user_email} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.user_name ?? r.user_email}</p>
                        {r.user_name && <p className="text-[11px] text-gray-500 truncate">{r.user_email}</p>}
                      </div>
                      <p className="text-sm font-bold text-[#1e3a5f] shrink-0">{fmtH(Number(r.total_minutes))}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${(Number(r.total_minutes) / maxMinutes) * 100}%`,
                          background: 'var(--brand-navy)',
                        }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                      <Stat label="Abiertas" value={r.open_tasks}/>
                      <Stat label="Finalizadas" value={r.finished} color="#28a745"/>
                      <Stat label="Rechazadas" value={r.rejected}/>
                      <Stat label="Vencidas" value={r.overdue} color="#dc3545"/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empleado</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tiempo</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Abiertas</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Finalizadas</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rechazadas</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vencidas</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[200px]">Carga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const pct = (Number(r.total_minutes) / maxMinutes) * 100
                      return (
                        <tr key={r.user_email} className="border-b border-gray-100 hover:bg-blue-50/30">
                          <td className="px-4 py-3 font-semibold text-[#1e3a5f]">
                            {r.user_name ?? r.user_email}
                            {r.user_name && <p className="text-[10px] text-gray-400 font-normal">{r.user_email}</p>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtH(Number(r.total_minutes))}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{r.open_tasks}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-semibold">{r.finished}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-500">{r.rejected}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-rose-600 font-semibold">{r.overdue}</td>
                          <td className="px-4 py-3">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--brand-navy)' }} />
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
        </main>
      </div>
    </div>
  )
}

function KPI({ title, value, color, icon }: { title: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 inline-flex items-center gap-1">
        {icon} {title}
      </p>
      <p className="kpi-number text-2xl mt-1" style={{ color }}>{value}</p>
    </div>
  )
}

function Stat({ label, value, color = '#64748b' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}

// re-export useful icon for KPIs file
export { Activity }
