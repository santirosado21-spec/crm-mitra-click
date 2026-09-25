import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, Database, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMitraClick } from '../MitraClickContext'
import { useSession } from '../auth/SessionContext'
import { isSupabaseConfigured } from '../data/supabase/client'
import type { SyncRunSummary } from '../domain'
import { formatDayLabel } from '../commercial/dates'
import { PageHeader, Panel } from '../components/Primitives'
import { formatDate, formatNumber } from '../utils'

/** Qué entidades se esperan de cada fuente (docs/DATABASE.md). */
const EXPECTED: { source: string; label: string; entities: string[] }[] = [
  { source: 'erp', label: 'ERP / sistema interno de Mitra', entities: ['vendedores', 'cuotas', 'productos', 'existencias', 'clientes', 'pedidos', 'cotizaciones'] },
  { source: 'shopify', label: 'Shopify (Mitra Click)', entities: ['productos', 'existencias', 'ordenes'] },
  { source: 'ga4', label: 'Google Analytics 4', entities: ['trafico'] },
  { source: 'manual', label: 'Carga manual', entities: ['metas', 'cuotas'] },
]

const STATUS: Record<SyncRunSummary['status'], { label: string; icon: LucideIcon; tone: string }> = {
  exitoso: { label: 'Exitosa', icon: CheckCircle2, tone: 'text-mc-success' },
  parcial: { label: 'Parcial', icon: AlertTriangle, tone: 'text-mc-warning' },
  fallido: { label: 'Fallida', icon: XCircle, tone: 'text-mc-danger' },
  en_curso: { label: 'En curso', icon: Clock3, tone: 'text-mc-muted' },
}

function RunStatus({ run }: { run?: SyncRunSummary }) {
  if (!run) return <span className="inline-flex items-center gap-1.5 text-xs text-mc-muted"><CircleDashed size={14} aria-hidden="true" />Sin cargas todavía</span>
  const status = STATUS[run.status]
  const Icon = status.icon
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${status.tone}`}><Icon size={14} aria-hidden="true" />{status.label}</span>
}

export function DataStatusPage() {
  const { data } = useMitraClick()
  const { enabled, session } = useSession()
  if (!data) return null
  const { commercial } = data
  const runs = commercial.syncRuns ?? []
  const latest = (source: string, entity: string) => runs.find((run) => run.source === source && run.entity === entity)
  const mode = import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'demo'
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Sistema" title="Estado de datos" description="De dónde vienen los números que ves, cuándo se actualizaron y cómo va cada carga desde el ERP, Shopify y GA4." />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Fuente activa" data-testid="data-status">
        <article className={`rounded-2xl border p-4 shadow-mc-card ${commercial.source === 'erp' ? 'border-mc-success/30 bg-mc-success-soft' : 'border-mc-yellow-strong/40 bg-mc-yellow-wash'}`}>
          <p className="text-xs font-semibold text-mc-muted">Datos que se muestran</p>
          <p className="mt-2 flex items-center gap-2 text-xl font-extrabold text-mc-ink"><Database size={18} aria-hidden="true" />{commercial.source === 'erp' ? 'Reales' : 'Simulados'}</p>
          <p className="mt-1 text-[11px] text-mc-muted">Corte al {formatDayLabel(commercial.asOf, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </article>
        <article className="rounded-2xl border border-mc-line bg-mc-surface p-4 shadow-mc-card">
          <p className="text-xs font-semibold text-mc-muted">Modo configurado</p>
          <p className="mt-2 text-xl font-extrabold text-mc-ink">{mode === 'supabase' ? 'Supabase' : 'Demo'}</p>
          <p className="mt-1 text-[11px] text-mc-muted">VITE_DATA_SOURCE = {mode}</p>
        </article>
        <article className="rounded-2xl border border-mc-line bg-mc-surface p-4 shadow-mc-card">
          <p className="text-xs font-semibold text-mc-muted">Base de datos</p>
          <p className="mt-2 text-xl font-extrabold text-mc-ink">{isSupabaseConfigured() ? 'Configurada' : 'Sin configurar'}</p>
          <p className="mt-1 truncate text-[11px] text-mc-muted">{supabaseUrl ?? 'Faltan VITE_SUPABASE_URL y la publishable key'}</p>
        </article>
        <article className="rounded-2xl border border-mc-line bg-mc-surface p-4 shadow-mc-card">
          <p className="text-xs font-semibold text-mc-muted">Sesión</p>
          <p className="mt-2 text-xl font-extrabold text-mc-ink">{!enabled ? 'No aplica' : session ? 'Iniciada' : 'Sin sesión'}</p>
          <p className="mt-1 truncate text-[11px] text-mc-muted">{session?.user.email ?? (enabled ? <Link to="/entrar" className="font-semibold underline">Iniciar sesión</Link> : 'El modo demo no pide sesión')}</p>
        </article>
      </section>

      {commercial.notice && (
        <p className="rounded-2xl border border-mc-warning/25 bg-mc-warning-soft px-4 py-3 text-sm font-semibold text-mc-warning" role="status">{commercial.notice}</p>
      )}

      <Panel title="Fuentes esperadas" description="Última carga por fuente y entidad" padding={false} testId="expected-sources">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Estado de la última carga por fuente y entidad</caption>
            <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Fuente</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Entidad</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Estado</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Última carga</th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold">Filas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mc-line-soft">
              {EXPECTED.flatMap((group) =>
                group.entities.map((entity, index) => {
                  const run = latest(group.source, entity)
                  return (
                    <tr key={`${group.source}-${entity}`} data-testid={`source-${group.source}-${entity}`}>
                      <td className="px-5 py-2.5 font-semibold text-mc-ink">{index === 0 ? group.label : ''}</td>
                      <td className="px-3 py-2.5 text-mc-gray-700">{entity.replace('_', ' ')}</td>
                      <td className="px-3 py-2.5"><RunStatus run={run} /></td>
                      <td className="px-3 py-2.5 text-xs text-mc-muted">{run ? formatDate(run.finishedAt ?? run.startedAt, true) : 'Integración pendiente'}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-mc-gray-700 tabular">{run ? `${formatNumber(run.rowsUpserted)} / ${formatNumber(run.rowsReceived)}` : ''}</td>
                    </tr>
                  )
                }),
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Cargas recientes" description="Últimas 20 corridas registradas en la base" padding={false}>
          {runs.length ? (
            <ul className="divide-y divide-mc-line-soft">
              {runs.slice(0, 20).map((run) => (
                <li key={run.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold text-mc-ink">{run.source} · {run.entity}</span>
                    <span className="block text-[11px] text-mc-muted">{formatDate(run.startedAt, true)}{run.error ? `. ${run.error}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-right"><RunStatus run={run} /><span className="block text-[11px] text-mc-muted tabular">{run.rowsUpserted}/{run.rowsReceived} filas</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-mc-muted">{mode === 'supabase' ? 'Todavía no hay cargas registradas.' : 'En modo demo no hay cargas: los datos se generan en el navegador.'}</p>
          )}
        </Panel>
        <Panel title="Cómo llegan los datos" description="Cualquier formato termina en la misma carga idempotente">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-mc-gray-700">
            <li><strong>API o webhook</strong> del ERP o Shopify: <code className="text-xs">POST {supabaseUrl ?? '<proyecto>'}/functions/v1/ingest</code> con la llave de carga.</li>
            <li><strong>Excel o CSV</strong> exportado: <code className="text-xs">npm run data:ingest -- --entidad pedidos --archivo pedidos.csv</code>. Hay plantillas en <code className="text-xs">docs/plantillas/</code>.</li>
            <li><strong>Prueba completa</strong> con datos simulados: <code className="text-xs">npm run data:seed-demo</code>, y se borran con <code className="text-xs">npm run data:purge-demo</code>.</li>
          </ol>
          <p className="mt-3 text-xs text-mc-muted">Detalle en <code>docs/DATABASE.md</code>.</p>
        </Panel>
      </div>
    </div>
  )
}
