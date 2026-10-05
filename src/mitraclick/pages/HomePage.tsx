import { CheckCircle2, CircleDashed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { ROLE_LABEL } from '../auth/roles'
import { PageHeader, Panel } from '../components/Primitives'
import { ALL_MODULES, type Phase } from '../navigation'

const PHASES: { key: Phase; name: string; goal: string }[] = [
  { key: 'A', name: 'Fundación', goal: 'Base de datos operativa, acceso por rol y bitácora de cambios.' },
  { key: 'B', name: 'Catálogo, clientes y proveedores', goal: 'Familias, categorías y productos con reglas de alta e importación desde Shopify (CSV).' },
  { key: 'C', name: 'Inventario y bodega', goal: 'Movimientos, existencias, conteos y etiquetas NFC/QR para el piloto de 10 productos.' },
  { key: 'D', name: 'Ciclo comercial y trazabilidad', goal: 'Cotización → pedido → compra → recepción → envío → remisión → factura → pago.' },
  { key: 'E', name: 'Conector de Shopify', goal: 'Pedidos, productos, clientes e inventario sincronizados al conectar las credenciales.' },
  { key: 'F', name: 'Calidad de datos, pendientes y alertas', goal: 'Reglas de validación y bandeja de pendientes con responsable.' },
  { key: 'G', name: 'KPIs y dashboard ejecutivo', goal: 'Métricas definidas una sola vez y tablero para computadora y teléfono.' },
  { key: 'H', name: 'Agentes y reportes', goal: 'Supervisión, comercial, marketing y ejecutivo, con evidencia; reportes periódicos.' },
  { key: 'I', name: 'Adquisición medible', goal: 'Links NFC/QR con conteo, leads por fuente y seguimiento de prospección.' },
]

export function HomePage() {
  const { profile } = useSession()
  const firstName = profile?.displayName.split(' ')[0] ?? ''

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Mitra Click · Sistema operativo"
        title={firstName ? `Hola, ${firstName}` : 'Inicio'}
        description="Avance de la construcción del sistema. Cada módulo se activa cuando su fase queda terminada y verificada; lo que aún no existe se marca como en construcción."
      />

      <Panel title="Tu acceso" testId="home-access">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs font-semibold text-mc-muted">Usuario</dt><dd className="mt-0.5 font-semibold text-mc-ink">{profile?.displayName}</dd></div>
          <div><dt className="text-xs font-semibold text-mc-muted">Correo</dt><dd className="mt-0.5 break-all text-mc-ink">{profile?.email}</dd></div>
          <div><dt className="text-xs font-semibold text-mc-muted">Roles</dt><dd className="mt-0.5 text-mc-ink">{profile?.roles.map((role) => ROLE_LABEL[role]).join(', ') || 'Sin roles'}</dd></div>
        </dl>
      </Panel>

      <Panel title="Avance por fase" description="Los módulos listos se pueden abrir; los demás muestran qué van a resolver." padding={false} testId="home-phases">
        <ol className="divide-y divide-mc-line-soft">
          {PHASES.map((phase) => {
            const modules = ALL_MODULES.filter((module) => module.phase === phase.key && module.path !== '/')
            const ready = modules.filter((module) => module.ready).length
            return (
              <li key={phase.key} className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" data-testid={`phase-${phase.key}`}>
                <div>
                  <p className="text-xs font-semibold text-mc-yellow-ink">Fase {phase.key}</p>
                  <h3 className="mt-0.5 text-sm font-bold text-mc-ink">{phase.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-mc-muted">{phase.goal}</p>
                  {modules.length > 0 && <p className="mt-2 text-xs font-semibold text-mc-gray-700 tabular">{ready} de {modules.length} módulos listos</p>}
                </div>
                <ul className="flex flex-wrap content-start gap-2">
                  {modules.map((module) => (
                    <li key={module.path}>
                      <Link to={module.path} className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold ${module.ready ? 'border-mc-success/30 bg-mc-success-soft text-mc-ink' : 'border-mc-line bg-white text-mc-muted hover:border-mc-charcoal'}`}>
                        {module.ready ? <CheckCircle2 size={14} className="text-mc-success" aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />}
                        {module.label}
                        <span className="sr-only">{module.ready ? ' (listo)' : ' (en construcción)'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
      </Panel>
    </div>
  )
}
