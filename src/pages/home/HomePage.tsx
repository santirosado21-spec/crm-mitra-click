import { useNavigate } from 'react-router-dom'
import { Package, Truck, Warehouse, ArrowRight, ClipboardList, Sparkles } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { useAuthContext } from '../../context/AuthContext'
import { canAccessModule, type AppModule } from '../../config/permissions'

interface ModuleCard {
  id: AppModule
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
  const { user } = useAuthContext()

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
    {
      id: 'parcel',
      title: 'TMS de Guías de Paquetería',
      subtitle: 'Rate shopping · Auto-pick · Etiquetas',
      description: 'Cotiza con Estafeta, UPS, FedEx, DHL y Castores en un solo paso. El sistema elige automáticamente el carrier más conveniente por costo, distancia y tiempo.',
      icon: Sparkles,
      color: '#0ea5e9',
      accentColor: '#f0f9ff',
      onClick: () => navigate('/tms/guias-paqueteria'),
      tools: ['Cotizar y comprar', 'Auto-pick por código postal', 'Reglas de routing', 'Configurar carriers'],
    },
  ]

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg, #f5f7fa)' }}>
      <Header />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Welcome — logo HD centrado */}
          <div className="mb-10 text-center flex flex-col items-center">
            <img
              src="/hd-logo.png"
              alt="Supply Chain MX"
              className="h-20 sm:h-28 w-auto object-contain mb-3"
            />
            <p className="text-sm text-gray-500">
              Selecciona el módulo al que deseas acceder
            </p>
          </div>

          {/* Module cards — 5 columnas en desktop para que todas quepan en una hilera */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-3">
            {modules.filter(m => canAccessModule(user?.role, m.id)).map(m => {
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
