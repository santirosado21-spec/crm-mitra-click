import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, Truck, UserCheck, Route, PieChart, Calculator, CalendarClock, ArrowRight } from 'lucide-react'
import { Header } from '../../components/layout/Header'

interface Tool {
  to: string
  title: string
  description: string
  icon: typeof Truck
  category: 'ops' | 'tms' | 'com'
}

const tools: Tool[] = [
  { to: '/tms/dashboard', title: 'Dashboard',  description: 'KPIs de flota, viajes activos y métricas operativas.', icon: LayoutDashboard, category: 'ops' },
  { to: '/tms/vehiculos', title: 'Vehículos',  description: 'Inventario de flota, mantenimientos y servicios.',     icon: Truck,           category: 'tms' },
  { to: '/tms/operadores',title: 'Operadores', description: 'Directorio de operadores, licencias y documentos.',   icon: UserCheck,       category: 'tms' },
  { to: '/tms/viajes',    title: 'Viajes',     description: 'Registro de viajes, asignaciones y estatus.',          icon: Route,           category: 'tms' },
  { to: '/tms/costos',    title: 'Costos',     description: 'Análisis de costos de transporte por viaje/ruta.',     icon: PieChart,        category: 'tms' },
  { to: '/cotizador',     title: 'Cotizador',  description: 'Cotizador de fletes locales y foráneos.',              icon: Calculator,      category: 'com' },
  { to: '/tramites',      title: 'Trámites',   description: 'Vencimientos, verificaciones y trámites pendientes.',  icon: CalendarClock,   category: 'com' },
]

const categories = [
  { key: 'ops', label: 'Operaciones', color: '#1e3a5f' },
  { key: 'tms', label: 'Transporte',  color: '#c8373c' },
  { key: 'com', label: 'Comercial',   color: '#059669' },
] as const

export function TMSHome() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg, #f5f7fa)' }}>
      <Header />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1e3a5f] mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Volver al inicio
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1e3a5f]">TMS Transportes</h1>
            <p className="text-sm text-gray-500 mt-1">Transport Management System · Flotas, viajes y cotizaciones</p>
          </div>

          {categories.map(cat => {
            const catTools = tools.filter(t => t.category === cat.key)
            return (
              <div key={cat.key} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 rounded-full" style={{ background: cat.color }} />
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{cat.label}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {catTools.map(tool => {
                    const Icon = tool.icon
                    return (
                      <button
                        key={tool.to}
                        onClick={() => navigate(tool.to)}
                        className="group text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cat.color + '10' }}>
                            <Icon size={20} style={{ color: cat.color }} />
                          </div>
                          <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">{tool.title}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{tool.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
