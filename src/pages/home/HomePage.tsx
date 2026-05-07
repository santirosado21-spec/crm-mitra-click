import type { ComponentType, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Truck, Warehouse, ArrowRight, ClipboardList } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { PackingPerson } from '../../components/icons/PackingPerson'
import { useAuthContext } from '../../context/AuthContext'
import { canAccessModule, type AppModule } from '../../config/permissions'

type ModuleIcon = ComponentType<{ size?: number; style?: CSSProperties }>

interface ModuleCard {
  id: AppModule
  title: string
  subtitle: string
  description: string
  icon: ModuleIcon
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
      tools: ['Validador de SKUs', 'Generador Receipt', 'Generador de RC', 'Proformas y clientes'],
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
      icon: PackingPerson,
      color: '#0ea5e9',
      accentColor: '#f0f9ff',
      onClick: () => navigate('/tms/guias-paqueteria'),
      tools: ['Cotizar y comprar', 'Auto-pick por CP', 'Reglas de routing', 'Configurar carriers'],
    },
  ]

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg, #f5f7fa)' }}>
      <Header />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Welcome — logo HD centrado, mix-blend-mode multiply hace que el
               fondo blanco del PNG se funda con el background de la página */}
          <div className="mb-10 text-center flex flex-col items-center">
            <img
              src="/hd-logo.png"
              alt="Supply Chain MX"
              className="h-20 sm:h-32 w-auto object-contain mb-3"
              style={{ mixBlendMode: 'multiply' }}
            />
            <p className="text-sm text-gray-500">
              Selecciona el módulo al que deseas acceder
            </p>
          </div>

          {/* Module cards — todas las tiles del mismo tamaño exacto vía auto-rows-fr + h-full + flex column */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-3 auto-rows-fr">
            {modules.filter(m => canAccessModule(user?.role, m.id)).map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={m.onClick}
                  className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden h-full flex flex-col"
                >
                  {/* Header strip */}
                  <div
                    className="h-1.5 w-full shrink-0"
                    style={{ background: m.color }}
                  />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Icon */}
                    <div className="flex items-start mb-3 shrink-0">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: m.accentColor }}
                      >
                        <Icon size={28} style={{ color: m.color }} />
                      </div>
                    </div>

                    {/* Title — min-h fija para que 1-línea y 2-líneas ocupen el mismo espacio */}
                    <h2 className="text-base font-bold text-gray-900 mb-1 leading-tight min-h-[2.6rem] line-clamp-2">
                      {m.title}
                    </h2>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 min-h-[1rem] truncate" style={{ color: m.color }}>
                      {m.subtitle}
                    </p>

                    {/* Description — min-h fija (4 líneas) para que todas las descripciones ocupen el mismo bloque */}
                    <p className="text-[13px] text-gray-500 leading-relaxed mb-4 flex-1 min-h-[4.5rem]">
                      {m.description}
                    </p>

                    {/* Tools list — alturas fijas (header + 4 items × 18px = ~90px) idénticas en todas las tiles */}
                    <div className="border-t border-gray-100 pt-3 mb-4 shrink-0 min-h-[6.5rem]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 h-3 leading-3">
                        Incluye
                      </p>
                      <ul className="space-y-1">
                        {m.tools.map(tool => (
                          <li key={tool} className="flex items-center gap-2 text-[11px] text-gray-600 h-4 leading-4">
                            <span
                              className="w-1 h-1 rounded-full shrink-0"
                              style={{ background: m.color }}
                            />
                            <span className="truncate">{tool}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA — al fondo de la tile gracias al flex column */}
                    <div
                      className="flex items-center justify-between text-sm font-semibold shrink-0"
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
