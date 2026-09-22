import { Link } from 'react-router-dom'
import { Bot, CalendarClock, FileText, KeyRound, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react'
import { REPORT_DEFINITIONS, REPORT_TYPES, type AgentProfile } from '../reports/buildReport'
import { AGENT_PROFILES } from '../reports/agentProfiles'
import { IntegrationBadge, PageHeader, Panel } from '../components/Primitives'

const PROFILE_ORDER: AgentProfile[] = ['ejecutivo', 'vendedores', 'productos']

const RULES = [
  'Solo lectura: no modifican datos, no aprueban y no borran.',
  'Envían el texto que genera la plataforma, sin cifras propias.',
  'Con datos simulados, envían solo al grupo de pruebas.',
  'El envío por WhatsApp lo hace Grok Bot; la plataforma no manda mensajes.',
]

export function AgentsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sistema"
        title="Agentes de Grok Bot"
        description="Los agentes de IA operan desde Grok Bot con una cuenta de Google compartida y un perfil propio. Arman los reportes de esta plataforma y los envían por WhatsApp a dirección."
        actions={<IntegrationBadge label="Inicio de sesión con Google pendiente" />}
      />

      <ul className="grid gap-4 lg:grid-cols-3" data-testid="agent-profiles">
        {PROFILE_ORDER.map((profile) => {
          const agent = AGENT_PROFILES[profile]
          const reports = REPORT_TYPES.filter((type) => REPORT_DEFINITIONS[type].agent === profile)
          return (
            <li key={profile} className="flex flex-col rounded-2xl border border-mc-line bg-mc-surface p-5 shadow-mc-card" data-testid={`agent-${profile}`}>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mc-charcoal text-mc-yellow"><Bot size={18} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-mc-ink">{agent.name}</h2>
                  <p className="text-xs text-mc-muted">Perfil <code className="text-mc-ink">{profile}</code></p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-mc-gray-700">{agent.job}</p>
              <p className="mt-4 text-xs font-semibold text-mc-muted">Reportes a su cargo</p>
              <ul className="mt-2 space-y-2">
                {reports.map((type) => (
                  <li key={type}>
                    <Link to={`/reportes/${type}`} className="flex items-center justify-between gap-3 rounded-xl border border-mc-line-soft p-3 text-sm hover:border-mc-line hover:bg-mc-surface-2/60">
                      <span className="flex min-w-0 items-center gap-2 font-semibold text-mc-ink"><MessageCircle size={15} className="shrink-0 text-mc-muted" aria-hidden="true" /><span className="truncate">{REPORT_DEFINITIONS[type].title}</span></span>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-mc-muted"><CalendarClock size={12} aria-hidden="true" />{REPORT_DEFINITIONS[type].cadence}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-2 border-t border-mc-line-soft pt-3 text-xs text-mc-muted"><FileText size={13} aria-hidden="true" />Instrucciones: <code className="text-mc-ink">{agent.guide}</code></p>
            </li>
          )
        })}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Reglas de operación" description="Aplican a todos los agentes">
          <ul className="space-y-2">
            {RULES.map((rule) => <li key={rule} className="flex gap-2 text-sm text-mc-gray-700"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-mc-success" aria-hidden="true" />{rule}</li>)}
          </ul>
        </Panel>
        <Panel title="Acceso" description="Lo que falta para que los agentes entren con su perfil">
          <ul className="space-y-2 text-sm text-mc-gray-700">
            <li className="flex gap-2"><KeyRound size={16} className="mt-0.5 shrink-0 text-mc-muted" aria-hidden="true" />Inicio de sesión con Google y lista de correos autorizados.</li>
            <li className="flex gap-2"><Bot size={16} className="mt-0.5 shrink-0 text-mc-muted" aria-hidden="true" />Selección de perfil al entrar con la cuenta de agentes.</li>
            <li className="flex gap-2"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-mc-muted" aria-hidden="true" />Bitácora de lo que consulta y publica cada perfil.</li>
          </ul>
          <p className="mt-3 text-xs text-mc-muted">Mientras tanto, la demo no pide sesión y los agentes pueden usar los links de reportes directamente.</p>
        </Panel>
      </div>
    </div>
  )
}
