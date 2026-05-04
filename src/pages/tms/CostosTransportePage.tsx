import { useMemo } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useViajes } from '../../hooks/useViajes'
import { TrendingUp, DollarSign, Truck, Target } from 'lucide-react'

const fmtMoney = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const PIE_COLORS = ['#1e3a5f', '#c41e3a', '#f59e0b', '#10b981']

export function CostosTransportePage() {
  const { viajes, stats } = useViajes()

  const completados = viajes.filter(v => v.estado === 'completado')

  // Cost breakdown pie
  const costBreakdown = useMemo(() => {
    const totals = completados.reduce((acc, v) => ({
      combustible: acc.combustible + (v.costo_combustible || 0),
      casetas: acc.casetas + (v.costo_casetas || 0),
      viaticos: acc.viaticos + (v.costo_viaticos || 0),
      proveedor: acc.proveedor + (v.costo_proveedor || 0),
    }), { combustible: 0, casetas: 0, viaticos: 0, proveedor: 0 })

    return [
      { name: 'Combustible', value: totals.combustible },
      { name: 'Casetas', value: totals.casetas },
      { name: 'Viáticos', value: totals.viaticos },
      { name: 'Proveedores', value: totals.proveedor },
    ].filter(d => d.value > 0)
  }, [completados])

  // Ingreso vs Costo bar chart
  const monthlyData = useMemo(() => {
    const months: Record<string, { mes: string; costo: number; ingreso: number }> = {}
    viajes.forEach(v => {
      const date = v.fecha_programada || v.created_at
      if (!date) return
      const key = date.slice(0, 7) // YYYY-MM
      if (!months[key]) months[key] = { mes: key.slice(5) + '/' + key.slice(2, 4), costo: 0, ingreso: 0 }
      months[key].costo += v.costo_total || 0
      months[key].ingreso += v.ingreso_cliente || 0
    })
    return Object.values(months).sort((a, b) => a.mes.localeCompare(b.mes))
  }, [viajes])

  // Provider performance
  const provPerformance = useMemo(() => {
    const map: Record<string, { nombre: string; viajes: number; costoTotal: number }> = {}
    completados.filter(v => v.proveedor_nombre).forEach(v => {
      const key = v.proveedor_nombre!
      if (!map[key]) map[key] = { nombre: key, viajes: 0, costoTotal: 0 }
      map[key].viajes++
      map[key].costoTotal += v.costo_proveedor || 0
    })
    return Object.values(map).sort((a, b) => b.viajes - a.viajes)
  }, [completados])

  const costoPromKm = completados.reduce((s, v) => s + (v.km_reales || v.km_estimados || 0), 0)
  const costoXKm = costoPromKm > 0 ? stats.costoTotal / costoPromKm : 0

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#1e3a5f]">Costos de Transporte</h1>
            <p className="text-xs text-gray-400 mt-0.5">Análisis de costos, márgenes y rendimiento por proveedor</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <DollarSign size={18} className="text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1e3a5f]" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmtMoney(stats.costoTotal)}</p>
                  <p className="text-[10px] text-gray-400">Costo total</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp size={18} className="text-green-600" />
                </div>
                <div>
                  <p className={`text-lg font-bold ${stats.margenTotal >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {fmtMoney(stats.margenTotal)}
                  </p>
                  <p className="text-[10px] text-gray-400">Margen total</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Target size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmtMoney(costoXKm)}</p>
                  <p className="text-[10px] text-gray-400">Costo/km</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Truck size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{stats.completados}</p>
                  <p className="text-[10px] text-gray-400">Viajes completados</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Bar: Costo vs Ingreso */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Costo vs Ingreso por Mes</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="costo" name="Costo" fill="#c41e3a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ingreso" name="Ingreso" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Sin datos aún</div>
              )}
            </div>

            {/* Pie: Desglose de costos */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Desglose de Costos</h3>
              {costBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {costBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Sin datos aún</div>
              )}
            </div>
          </div>

          {/* Provider performance table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">Rendimiento por Proveedor</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Proveedor</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Viajes</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Costo Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Costo Promedio</th>
                </tr>
              </thead>
              <tbody>
                {provPerformance.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">Sin viajes completados con proveedores</td></tr>
                ) : provPerformance.map(p => (
                  <tr key={p.nombre} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.viajes}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtMoney(p.costoTotal)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtMoney(p.viajes > 0 ? p.costoTotal / p.viajes : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
