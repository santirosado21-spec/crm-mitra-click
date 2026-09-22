import { Link } from 'react-router-dom'
import { Bot, CalendarClock, ChevronRight, MessageCircle } from 'lucide-react'
import { REPORT_DEFINITIONS, REPORT_TYPES } from '../reports/buildReport'
import { AGENT_PROFILES } from '../reports/agentProfiles'
import { PageHeader, Panel } from '../components/Primitives'

export function ReportsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dirección comercial"
        title="Reportes"
        description="Reportes cortos para enviar por WhatsApp. Cada uno tiene un link fijo, una vista para el celular y el texto listo para copiar. Los agentes de Grok Bot los envían; la plataforma no manda mensajes."
      />
      <ul className="grid gap-4 md:grid-cols-2" data-testid="report-catalog">
        {REPORT_TYPES.map((type) => {
          const definition = REPORT_DEFINITIONS[type]
          const agent = AGENT_PROFILES[definition.agent]
          return (
            <li key={type}>
              <Link to={`/reportes/${type}`} className="group flex h-full flex-col rounded-2xl border border-mc-line bg-mc-surface p-5 shadow-mc-card hover:border-mc-charcoal" data-testid={`report-link-${type}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-mc-yellow-soft text-mc-charcoal"><MessageCircle size={18} aria-hidden="true" /></span>
                  <ChevronRight size={18} className="text-mc-gray-300 group-hover:text-mc-ink" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-bold text-mc-ink">{definition.title}</h2>
                <p className="mt-1 flex-1 text-sm leading-6 text-mc-muted">{definition.description}</p>
                <dl className="mt-4 grid gap-1.5 border-t border-mc-line-soft pt-3 text-xs text-mc-muted">
                  <div className="flex items-center gap-2"><CalendarClock size={13} aria-hidden="true" /><dt className="sr-only">Envío sugerido</dt><dd>{definition.cadence}</dd></div>
                  <div className="flex items-center gap-2"><Bot size={13} aria-hidden="true" /><dt className="sr-only">Agente responsable</dt><dd>{agent.name}</dd></div>
                  <div className="flex items-center gap-2"><dt className="sr-only">Link</dt><dd><code className="rounded bg-mc-surface-2 px-1.5 py-0.5 text-[11px] text-mc-ink">/reportes/{type}</code></dd></div>
                </dl>
              </Link>
            </li>
          )
        })}
      </ul>
      <Panel title="Cómo los usa Grok Bot" description="Flujo acordado para los agentes de reportes">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-mc-gray-700">
          <li>Entra con la cuenta de Google de agentes y elige su perfil.</li>
          <li>Abre el link fijo del reporte (por ejemplo <code className="rounded bg-mc-surface-2 px-1 text-xs">/reportes/vendedores-semanal</code>).</li>
          <li>Copia el bloque "Texto para WhatsApp" o toma captura de <code className="rounded bg-mc-surface-2 px-1 text-xs">/reportes/&lt;tipo&gt;/captura</code>.</li>
          <li>Lo envía por WhatsApp a dirección. El texto incluye el link al dashboard con el mismo periodo.</li>
        </ol>
        <p className="mt-3 text-xs text-mc-muted">Instrucciones completas por agente en <code>docs/agents/</code>.</p>
      </Panel>
    </div>
  )
}
