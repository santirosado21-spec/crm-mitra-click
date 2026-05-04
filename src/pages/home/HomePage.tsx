import { useNavigate } from 'react-router-dom'
import { Package, Truck, Warehouse, ArrowRight, ClipboardList } from 'lucide-react'
import { Header } from '../../components/layout/Header'

interface ModuleCard {
  id: string
  title: string
  subtitle: string
  description: string
  icon: typeof Package
  color: string
  accentColor: string
  onClick: () => void
  tools: string[]
}

export function HomePage() {
  const navigate = useNavigate()

  const modules: ModuleCard[] = [
    {
      id: 'wms',
      title: 'Herramientas de WMS',
      subtitle: 'Warehouse Management',
      description: 'Herramientas de SAC para la operación del almacén: validación de SKUs, generación de RC y proformas.',
      icon: Package,
      color: '#1e3a5f',
      accentColor: '#eff6ff',
      onClick: () => navigate('/wms'),
      tools: ['Validador de SKUs', 'Generador Receipt', 'Generador de RC', 'Generador de Proformas', 'Clientes'],
    },
    {
      id: 'tms',
      title: 'Transportes',
      subtitle: 'Transport Management System',
      description: 'Cotizador de fletes, dashboards de flotas, servicios de unidades y operaciones de transporte.',
      icon: Truck,
      color: '#c8373c',
      accentColor: '#fef2f2',
      onClick: () => navigate('/tms'),
      tools: ['Cotizador de fletes', 'Dashboard flotas', 'Servicios unidades', 'Bitácora operaciones'],
    },
    {
      id: 'almacen',
      title: 'Almacén',
      subtitle: 'CEDIS Lerma · Bodega 1',
      description: 'Visualización en tiempo real del layout del CEDIS: ocupación, elevaciones y estado de posiciones.',
      icon: Warehouse,
      color: '#059669',
      accentColor: '#ecfdf5',
      onClick: () => navigate('/almacen'),
      tools: ['Planta', 'Elevaciones', 'Ocupación', 'Tabla de posiciones'],
    },
    {
      id: 'tasks',
      title: 'Task Tracker',
      subtitle: 'Coordinación · Tiempo · Costos',
      description: 'Asigna tareas entre SAC, Almacén y Transportes con disponibilidad tipo Calendly. Mide tiempo real para asignar costos por cliente.',
      icon: ClipboardList,
      color: '#7c3aed',
      accentColor: '#f5f3ff',
      onClick: () => navigate('/tasks'),
      tools: ['Bandeja de tareas', 'Calendario semanal', 'Plantillas recurrentes', 'Equipo y horarios'],
    },
  ]

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--page-bg, #f5f7fa)' }}>
      <Header />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Welcome */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">
              Supply Chain MX
            </h1>
            <p className="text-sm text-gray-500">
              Selecciona el módulo al que deseas acceder
            </p>
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={m.onClick}
                  className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                >
                  {/* Header strip */}
                  <div
                    className="h-1.5 w-full"
                    style={{ background: m.color }}
                  />

                  <div className="p-6">
                    {/* Icon */}
                    <div className="flex items-start mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: m.accentColor }}
                      >
                        <Icon size={28} style={{ color: m.color }} />
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-bold text-gray-900 mb-1">
                      {m.title}
                    </h2>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: m.color }}>
                      {m.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-gray-500 leading-relaxed mb-5">
                      {m.description}
                    </p>

                    {/* Tools list */}
                    <div className="border-t border-gray-100 pt-4 mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Incluye
                      </p>
                      <ul className="space-y-1">
                        {m.tools.map(tool => (
                          <li key={tool} className="flex items-center gap-2 text-xs text-gray-600">
                            <span
                              className="w-1 h-1 rounded-full shrink-0"
                              style={{ background: m.color }}
                            />
                            {tool}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <div
                      className="flex items-center justify-between text-sm font-semibold"
                      style={{ color: m.color }}
                    >
                      <span>Entrar al módulo</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-[11px] text-gray-400">
              Supply Chain MX · v2.0
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
