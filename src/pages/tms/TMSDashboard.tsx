import { Truck, Route, UserCheck, MapPin } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useViajes } from '../../hooks/useViajes'
import { useVehiculos } from '../../hooks/useVehiculos'
import { useOperadores } from '../../hooks/useOperadores'

export function TMSDashboard() {
  const { viajes } = useViajes()
  const { vehiculos } = useVehiculos()
  const { operadores } = useOperadores()

  const activos = viajes.filter(v => v.estado === 'en_transito').length
  const pendientes = viajes.filter(v => v.estado === 'programado').length
  const completados = viajes.filter(v => v.estado === 'completado').length

  const kpis = [
    { label: 'Viajes Activos',     value: activos,            icon: Route,     color: '#1d4ed8', bg: '#eff6ff' },
    { label: 'Pendientes',         value: pendientes,         icon: MapPin,    color: '#b45309', bg: '#fffbeb' },
    { label: 'Completados',        value: completados,        icon: Truck,     color: '#15803d', bg: '#f0fdf4' },
    { label: 'Vehículos',          value: vehiculos.length,   icon: Truck,     color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Operadores',         value: operadores.length,  icon: UserCheck, color: '#0e7490', bg: '#ecfeff' },
  ]

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="animate-fade-up">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--brand-navy)' }}>
              TMS Dashboard
            </h1>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>
              Resumen de transporte
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="animate-fade-up card card-hover p-4 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl" style={{ background: color }} />
                <div className="flex items-start justify-between mb-3 mt-1">
                  <div className="p-2 rounded-xl" style={{ background: bg }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                </div>
                <p className="kpi-number text-[2rem]" style={{ color }}>{value}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Placeholder para mapa GPS de Motive */}
          <div className="card p-8 text-center">
            <MapPin size={32} className="mx-auto mb-3 text-gray-300" />
            <h2 className="text-sm font-bold text-gray-500">Mapa de Flota en Vivo</h2>
            <p className="text-xs text-gray-400 mt-1">
              Conecta tu cuenta de Motive para ver ubicaciones GPS en tiempo real
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
