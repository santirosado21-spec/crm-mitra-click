import { Link } from 'react-router-dom'
import { Bot, ExternalLink, FileText, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { IntegrationBadge, PageHeader, Panel } from '../components/Primitives'

interface AgentProfile {
  id: string
  name: string
  focus: string
  screens: { label: string; path: string }[]
}

/** Perfiles de Grok Bot. Los reportes y automatizaciones viven en Grok Bot; aquí sólo leen datos. */
const PROFILES: AgentProfile[] = [
  {
    id: 'ejecutivo',
    name: 'Agente Ejecutivo',
    focus: 'Venta del día y del mes contra meta, Mitra mayorista y Mitra Click.',
    screens: [
      { label: 'Resumen', path: '/?periodo=hoy' },
      { label: 'Mitra mayorista', path: '/mitra' },
      { label: 'Mitra Click', path: '/mitra-click' },
    ],
  },
  {
    id: 'vendedores',
    name: 'Agente de Vendedores',
    focus: 'Quién vende, quién no y quién tiene que vender más.',
    screens: [
      { label: 'Ranking semanal', path: '/vendedores?periodo=semana' },
      { label: 'Ranking del mes', path: '/vendedores?periodo=mes' },
    ],
  },
  {
    id: 'productos',
    name: 'Agente de Productos',
    focus: 'Material más y menos vendido, agotados con demanda y sin movimiento.',
    screens: [
      { label: 'Productos de la semana', path: '/productos?periodo=semana' },
      { label: 'Sin movimiento a 60 días', path: '/productos?sin-movimiento=60' },
    ],
  },
]

const RULES = [
  'Solo lectura: no modifican datos, no aprueban y no borran.',
  'Usan las cifras que muestra la plataforma, sin cálculos propios.',
  'Reportes, envíos por WhatsApp y automatizaciones se hacen en Grok Bot; esta app no envía mensajes.',
]

const SELECTORS = [
  { what: 'Filtros y periodo', selector: 'filter-bar, filter-period, filter-unit' },
  { what: 'KPIs del Resumen', selector: 'kpi-mitra, kpi-mitraclick, kpi-orders, goal-progress' },
  { what: 'Ranking de vendedores', selector: 'rep-leaderboard, rep-row-<id> (data-status)' },
  { what: 'Productos', selector: 'table-products-top, table-products-bottom, products-stockouts-list' },
  { what: 'Estado de los datos', selector: 'data-mode, source-stamp' },
]

export function AgentsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sistema"
        title="Agentes de Grok Bot"
        description="Los agentes de IA operan desde Grok Bot con una cuenta de Google compartida y un perfil propio. Consultan estas pantallas; los reportes, envíos y automatizaciones los resuelve Grok Bot."
        actions={<IntegrationBadge label="Inicio de sesión con Google pendiente" />}
      />

      <ul className="grid gap-4 lg:grid-cols-3" data-testid="agent-profiles">
        {PROFILES.map((agent) => (
          <li key={agent.id} className="flex flex-col rounded-2xl border border-mc-line bg-mc-surface p-5 shadow-mc-card" data-testid={`agent-${agent.id}`}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-mc-charcoal text-mc-yellow"><Bot size={18} aria-hidden="true" /></span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-mc-ink">{agent.name}</h2>
                <p className="text-xs text-mc-muted">Perfil <code className="text-mc-ink">{agent.id}</code></p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-mc-gray-700">{agent.focus}</p>
            <p className="mt-4 text-xs font-semibold text-mc-muted">Pantallas que consulta</p>
            <ul className="mt-2 space-y-2">
              {agent.screens.map((screen) => (
                <li key={screen.path}>
                  <Link to={screen.path} className="flex items-center justify-between gap-3 rounded-xl border border-mc-line-soft p-3 text-sm hover:border-mc-line hover:bg-mc-surface-2/60">
                    <span className="font-semibold text-mc-ink">{screen.label}</span>
                    <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-mc-muted"><ExternalLink size={12} className="shrink-0" aria-hidden="true" /><code className="truncate">{screen.path}</code></span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 border-t border-mc-line-soft pt-3 text-xs text-mc-muted"><FileText size={13} aria-hidden="true" />Guía: <code className="text-mc-ink">docs/agents/{agent.id}.md</code></p>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Reglas de operación" description="Aplican a todos los agentes">
          <ul className="space-y-2">
            {RULES.map((rule) => <li key={rule} className="flex gap-2 text-sm text-mc-gray-700"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-mc-success" aria-hidden="true" />{rule}</li>)}
          </ul>
        </Panel>
        <Panel title="Qué pueden leer" description="Selectores data-testid estables para los agentes" padding={false}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Selectores estables por tipo de dato</caption>
            <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
              <tr><th scope="col" className="px-5 py-2.5 font-semibold">Dato</th><th scope="col" className="px-5 py-2.5 font-semibold">data-testid</th></tr>
            </thead>
            <tbody className="divide-y divide-mc-line-soft">
              {SELECTORS.map((row) => <tr key={row.what}><td className="px-5 py-2.5 text-mc-gray-700">{row.what}</td><td className="px-5 py-2.5"><code className="text-xs text-mc-ink">{row.selector}</code></td></tr>)}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Acceso" description="Lo que falta para que los agentes entren con su perfil">
        <ul className="grid gap-2 text-sm text-mc-gray-700 md:grid-cols-3">
          <li className="flex gap-2"><KeyRound size={16} className="mt-0.5 shrink-0 text-mc-muted" aria-hidden="true" />Inicio de sesión con Google y lista de correos autorizados.</li>
          <li className="flex gap-2"><Bot size={16} className="mt-0.5 shrink-0 text-mc-muted" aria-hidden="true" />Selección de perfil al entrar con la cuenta de agentes.</li>
          <li className="flex gap-2"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-mc-muted" aria-hidden="true" />Bitácora de lo que consulta cada perfil.</li>
        </ul>
      </Panel>
    </div>
  )
}
