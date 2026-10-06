import { useState } from 'react'
import { Bot, Play, Sparkles } from 'lucide-react'
import { useSession } from '../auth/SessionContext'
import { ROLE_LABEL, type AppRole } from '../auth/roles'
import { Button } from '../components/Controls'
import { RecordDrawer } from '../components/RecordDrawer'
import { ReportView } from '../components/ReportView'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { callFunction, invokeFunction, saveRow, selectRows } from '../lib/crud'
import { formatDate } from '../lib/format'
import { AGENT_LABEL, FINDING_STATUS_LABEL } from '../lib/reports'
import { useQuery } from '../lib/useQuery'

type Row = Record<string, unknown>

interface RunRow { id: number; agent: string; mode: string; status: string; started_at: string; output: { findings?: number; narrative?: string } | null; error: string | null }

const AGENTS: { key: string; purpose: string }[] = [
  { key: 'supervision', purpose: 'Revisa la calidad y coherencia de la información y señala dónde se concentran los pendientes.' },
  { key: 'comercial', purpose: 'Cotizaciones relevantes sin movimiento, clientes que dejaron de comprar, familias que crecen o caen y vendedores con seguimiento acumulado.' },
  { key: 'marketing', purpose: 'Distingue actividad de resultado: canales que generan contactos sin oportunidades, variaciones y links sin uso.' },
  { key: 'ejecutivo', purpose: 'Lectura breve para dirección: primero lo que exige decisión, después los cambios.' },
]
const smallButton = '!px-3 !py-1.5 !text-xs'
const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }))

export function AgentsPage() {
  const { can } = useSession()
  const admin = can(['direccion', 'admin'])
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [evidence, setEvidence] = useState<Row | null>(null)

  const runs = useQuery(`agent-runs|${version}`, () => selectRows<RunRow>('agent_runs', 'id,agent,mode,status,started_at,output,error', { orderBy: { column: 'started_at', ascending: false }, limit: 40 }))
  const ai = useQuery(`ai-status|${admin}`, async () => (admin ? invokeFunction<{ ia: boolean }>('agent-narrate', { tipo: 'estado' }).catch(() => ({ ia: false })) : { ia: false }))
  const lastRun = (agent: string) => (runs.data ?? []).find((run) => run.agent === agent)

  const act = async (key: string, action: () => Promise<string | void>) => {
    setBusy(key)
    setNotice(null)
    try {
      const text = await action()
      if (text) setNotice({ tone: 'ok', text })
      setVersion((value) => value + 1)
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }

  const config: ResourceConfig = {
    table: 'agent_findings',
    noun: 'hallazgo',
    title: 'Agentes',
    eyebrow: 'Dirección',
    description: 'Cuatro agentes revisan el sistema todos los días a las 7:00. Proponen y asignan con evidencia; nunca modifican datos del negocio. Cada hallazgo se acepta, se descarta o se convierte en un pendiente con responsable.',
    select: 'id,agent,title,detail,evidence,suggested_action,assigned_role,status,created_at,issue_id',
    searchColumns: ['title', 'detail'],
    searchPlaceholder: 'Buscar en hallazgos…',
    orderBy: { column: 'created_at', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: (row) => String(row.title),
    filters: [
      { param: 'agente', column: 'agent', label: 'Agente', options: options(AGENT_LABEL) },
      { param: 'estado', column: 'status', label: 'Estado', options: options(FINDING_STATUS_LABEL) },
    ],
    rowActions: (row) => (
      <>
        <Button variant="outline" className={smallButton} onClick={() => setEvidence(row)} aria-label={`Ver la evidencia de: ${String(row.title)}`}>Evidencia</Button>
        {admin && row.status === 'nuevo' && <Button variant="outline" className={smallButton} onClick={() => { void act(`f${String(row.id)}`, async () => { await saveRow('agent_findings', String(row.id), { status: 'descartado' }) }) }} aria-label={`Descartar: ${String(row.title)}`}>Descartar</Button>}
        {admin && ['nuevo', 'aceptado'].includes(String(row.status)) && <Button className={smallButton} onClick={() => { void act(`f${String(row.id)}`, async () => { await callFunction('convert_finding_to_issue', { p_id: row.id }); return 'Hallazgo convertido en pendiente.' }) }} aria-label={`Convertir en pendiente: ${String(row.title)}`}>A pendiente</Button>}
      </>
    ),
    columns: [
      { key: 'title', label: 'Hallazgo', render: (row) => (
        <span>
          <span className="block font-semibold text-mc-ink">{String(row.title)}</span>
          <span className="block whitespace-pre-line text-xs font-normal text-mc-muted">{String(row.detail ?? '')}</span>
          {Boolean(row.suggested_action) && <span className="mt-1 block text-xs font-normal text-mc-gray-700">Acción sugerida: {String(row.suggested_action)}</span>}
        </span>
      ) },
      { key: 'agent', label: 'Agente', render: (row) => AGENT_LABEL[String(row.agent)] ?? String(row.agent) },
      { key: 'assigned_role', label: 'Área', render: (row) => (row.assigned_role ? ROLE_LABEL[row.assigned_role as AppRole] : '—') },
      { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={FINDING_STATUS_LABEL[String(row.status)] ?? String(row.status)} /> },
      { key: 'created_at', label: 'Fecha', render: (row) => formatDate(String(row.created_at)) },
    ],
  }

  const toolbar = (
    <div className="space-y-3">
      <p className="rounded-xl border border-mc-line bg-mc-surface px-4 py-3 text-xs leading-5 text-mc-muted" data-testid="ai-status">
        <Sparkles size={14} className="mr-1.5 inline text-mc-yellow-ink" aria-hidden="true" />
        {ai.data?.ia ? 'Redacción con IA activa: puedes pedir un resumen redactado de cada corrida. Los números siempre salen de las reglas del sistema.' : 'Los agentes trabajan por reglas. La redacción con IA es una integración pendiente: se activa al configurar la llave del servicio en el servidor.'}
      </p>
      {notice && <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === 'error' ? 'border-mc-danger/25 bg-mc-danger-soft text-mc-danger' : 'border-mc-success/30 bg-mc-success-soft text-mc-ink'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {AGENTS.map((agent) => {
          const run = lastRun(agent.key)
          return (
            <li key={agent.key} className="flex flex-col rounded-2xl border border-mc-line bg-mc-surface p-4 shadow-mc-card" data-testid={`agent-${agent.key}`}>
              <p className="flex items-center gap-2 text-sm font-extrabold text-mc-ink"><Bot size={16} aria-hidden="true" />{AGENT_LABEL[agent.key]}</p>
              <p className="mt-1 flex-1 text-xs leading-5 text-mc-muted">{agent.purpose}</p>
              <p className="mt-3 text-xs text-mc-gray-700">
                {run ? `Última corrida: ${formatDate(run.started_at, true)} · ${run.status === 'exitoso' ? `${run.output?.findings ?? 0} hallazgos` : run.status === 'fallido' ? 'falló' : 'en curso'} · ${run.mode === 'ia' ? 'redactado con IA' : 'por reglas'}` : 'Todavía no ha corrido.'}
              </p>
              {run?.error && <p className="mt-1 text-xs text-mc-danger">{run.error}</p>}
              {run?.output?.narrative && <p className="mt-2 whitespace-pre-line rounded-xl bg-mc-surface-2 p-3 text-xs leading-5 text-mc-ink">{run.output.narrative}</p>}
              {admin && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" className={smallButton} disabled={busy !== null} onClick={() => { void act(agent.key, async () => { await callFunction('run_agent', { p_agent: agent.key }); return `Agente de ${AGENT_LABEL[agent.key].toLowerCase()} ejecutado.` }) }} data-testid={`run-${agent.key}`}><Play size={13} aria-hidden="true" />{busy === agent.key ? 'Ejecutando…' : 'Ejecutar ahora'}</Button>
                  {ai.data?.ia && run?.status === 'exitoso' && (run.output?.findings ?? 0) > 0 && <Button variant="outline" className={smallButton} disabled={busy !== null} onClick={() => { void act(`ia-${agent.key}`, async () => { await invokeFunction('agent-narrate', { tipo: 'agente', id: run.id }) }) }}><Sparkles size={13} aria-hidden="true" />{busy === `ia-${agent.key}` ? 'Redactando…' : 'Redactar con IA'}</Button>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <>
      <ResourcePage key={version} config={config} toolbar={toolbar} />
      {evidence && (
        <RecordDrawer open title={String(evidence.title)} subtitle="Evidencia del hallazgo: los datos del sistema que lo sustentan" onClose={() => setEvidence(null)}>
          <p className="mb-4 whitespace-pre-line text-sm text-mc-ink">{String(evidence.detail ?? '')}</p>
          <ReportView content={(evidence.evidence as Record<string, unknown> | null) ?? {}} />
        </RecordDrawer>
      )}
    </>
  )
}
