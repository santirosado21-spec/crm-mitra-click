import { useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import type { AppRole } from '../auth/roles'
import { Button, Field, Select, TextInput } from '../components/Controls'
import { ActionDrawer, ReasonField } from '../components/DocumentParts'
import { EmptyState, PageHeader, Panel, StatusBadge } from '../components/Primitives'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { ViewTabs } from '../components/ViewTabs'
import { ACTIVITY_LABEL, LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, clickRate, mapSearchConsoleCsv, type SeoImport } from '../lib/acquisition'
import { callFunction, saveRow, selectRows } from '../lib/crud'
import { parseCsv } from '../lib/csv'
import { localTodayKey } from '../lib/dates'
import { formatDate, formatNumber, formatRatio } from '../lib/format'
import { PERIOD_OPTIONS, isPeriodKey, resolvePeriod, type PeriodKey } from '../lib/period'
import { useQuery } from '../lib/useQuery'
import { useView } from '../lib/useView'

type Row = Record<string, unknown>

const WRITE_ROLES: AppRole[] = ['direccion', 'admin', 'marketing', 'ventas']
const VIEWS: { key: 'leads' | 'embudo' | 'seo'; label: string }[] = [
  { key: 'leads', label: 'Leads' },
  { key: 'embudo', label: 'Embudo por canal' },
  { key: 'seo', label: 'SEO' },
]
const TITLE = 'Leads y prospección'
const smallButton = '!px-3 !py-1.5 !text-xs'
const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }))
const tabs = (view: string) => <ViewTabs options={VIEWS} current={view} label="Vista de adquisición" />

interface ActivityRow { id: number; kind: string; notes: string | null; occurred_at: string; user: { display_name: string } | null }

/** Historial de contacto de un lead y captura de la siguiente actividad. */
function ActivityDrawer({ lead, canWrite, onClose, onSaved }: { lead: Row; canWrite: boolean; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState('mensaje')
  const [notes, setNotes] = useState('')
  const history = useQuery(`lead-activities|${String(lead.id)}`, () => selectRows<ActivityRow>('lead_activities', 'id,kind,notes,occurred_at,user:app_users(display_name)', { filters: { lead_id: String(lead.id) }, orderBy: { column: 'occurred_at', ascending: false }, limit: 100 }))

  const submit = async () => {
    if (!canWrite) throw new Error('Tu rol no puede registrar actividad.')
    await saveRow('lead_activities', null, { lead_id: lead.id, kind, notes: notes.trim() || null })
    onSaved()
  }

  return (
    <ActionDrawer title={String(lead.name)} subtitle={`Seguimiento · ${LEAD_SOURCE_LABEL[String(lead.source)] ?? String(lead.source)}`} submitLabel="Registrar actividad" onClose={onClose} onSubmit={submit}>
      <Field id="activity-kind" label="Qué pasó" required hint="Registrar un mensaje o una respuesta actualiza solo el estado del lead.">
        <Select id="activity-kind" value={kind} onChange={(event) => setKind(event.target.value)} disabled={!canWrite}>
          {options(ACTIVITY_LABEL).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
      </Field>
      <ReasonField id="activity-notes" label="Notas" required={false} value={notes} onChange={setNotes} />
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-muted">Historial</h3>
        {(history.data ?? []).length === 0 ? <p className="text-sm text-mc-muted">{history.loading ? 'Cargando…' : 'Sin actividad registrada.'}</p> : (
          <ol className="space-y-2" data-testid="lead-history">
            {history.data!.map((item) => (
              <li key={item.id} className="rounded-xl border border-mc-line-soft bg-mc-surface-2/60 p-3 text-sm">
                <p className="font-semibold text-mc-ink">{ACTIVITY_LABEL[item.kind] ?? item.kind}</p>
                {item.notes && <p className="mt-0.5 whitespace-pre-line text-mc-gray-700">{item.notes}</p>}
                <p className="mt-1 text-xs text-mc-muted">{item.user?.display_name ?? 'Sistema'} · {formatDate(item.occurred_at, true)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ActionDrawer>
  )
}

interface FunnelRow { source: string; prospects: number; contacted: number; replies: number; conversations: number; opportunities: number; won: number; pending_follow_up: number }

function FunnelView() {
  const [params, setParams] = useSearchParams()
  const periodKey: PeriodKey = isPeriodKey(params.get('periodo')) ? (params.get('periodo') as PeriodKey) : '90d'
  const period = resolvePeriod(periodKey, localTodayKey())
  const query = useQuery(`funnel|${period.start}|${period.end}`, () => callFunction<FunnelRow[]>('kpi_acquisition', { p_start: period.start, p_end: period.end }))
  const rows = query.data ?? []
  const columns: { key: keyof FunnelRow; label: string }[] = [
    { key: 'prospects', label: 'Prospectos' }, { key: 'contacted', label: 'Contactados' }, { key: 'replies', label: 'Respuestas' },
    { key: 'conversations', label: 'Conversaciones' }, { key: 'opportunities', label: 'Oportunidades' }, { key: 'won', label: 'Ganados' }, { key: 'pending_follow_up', label: 'Seguimiento pendiente' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Marketing"
        title={TITLE}
        description={`Actividad contra resultado por canal, para leads creados en: ${period.label.toLowerCase()}. Un canal con muchos prospectos y ninguna oportunidad genera atención, no negocio.`}
        actions={
          <Select aria-label="Periodo" className="!w-auto" value={periodKey} onChange={(event) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('periodo', event.target.value); return next }, { replace: true })}>
            {PERIOD_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </Select>
        }
      />
      {tabs('embudo')}
      <Panel padding={false} testId="acquisition-funnel">
        {query.error ? <p className="p-5 text-sm text-mc-danger" role="alert">{query.error}</p> : rows.length === 0 ? <EmptyState title={query.loading ? 'Cargando…' : 'Sin leads en el periodo'} description="Cuando se registren leads, aquí se verá en qué etapa quedó cada canal." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Embudo de adquisición por canal</caption>
              <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
                <tr><th scope="col" className="px-4 py-2.5 font-semibold">Canal</th>{columns.map((column) => <th key={column.key} scope="col" className="px-4 py-2.5 text-right font-semibold">{column.label}</th>)}<th scope="col" className="px-4 py-2.5 text-right font-semibold">Prospecto → oportunidad</th></tr>
              </thead>
              <tbody className="divide-y divide-mc-line-soft">
                {rows.map((row) => (
                  <tr key={row.source} data-testid={`funnel-${row.source}`}>
                    <th scope="row" className="px-4 py-2.5 font-semibold text-mc-ink">{LEAD_SOURCE_LABEL[row.source] ?? row.source}</th>
                    {columns.map((column) => <td key={column.key} className={`px-4 py-2.5 text-right tabular ${column.key === 'pending_follow_up' && Number(row[column.key]) > 0 ? 'font-bold text-mc-danger' : 'text-mc-gray-700'}`}>{formatNumber(Number(row[column.key]))}</td>)}
                    <td className="px-4 py-2.5 text-right font-semibold tabular text-mc-ink">{Number(row.prospects) ? formatRatio(Number(row.opportunities) / Number(row.prospects)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

/** Carga del CSV de Search Console: se revisa en el navegador y se guarda por periodo. */
function SeoImportDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: (count: number) => void }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [parsed, setParsed] = useState<SeoImport | null>(null)
  const [fileName, setFileName] = useState('')

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParsed(mapSearchConsoleCsv(parseCsv(await file.text())))
  }

  const submit = async () => {
    if (!start || !end) throw new Error('Indica el periodo que cubre el archivo (el mismo rango que elegiste en Search Console).')
    if (end < start) throw new Error('La fecha final no puede ser anterior a la inicial.')
    if (!parsed?.dimension || !parsed.rows.length) throw new Error('Elige un archivo de Search Console con consultas o páginas.')
    const count = await callFunction<number>('import_seo_metrics', { p_start: start, p_end: end, p_dimension: parsed.dimension, p_rows: parsed.rows })
    onSaved(count)
  }

  return (
    <ActionDrawer title="Cargar métricas de SEO" subtitle="En Search Console: Rendimiento → Exportar → CSV. Sube Consultas.csv o Páginas.csv." submitLabel="Guardar métricas" onClose={onClose} onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="seo-start" label="Periodo: desde" required><TextInput id="seo-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
        <Field id="seo-end" label="Periodo: hasta" required><TextInput id="seo-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
      </div>
      <Field id="seo-file" label="Archivo CSV" required>
        <input id="seo-file" type="file" accept=".csv,text/csv" onChange={(event) => { void onFile(event) }} className="block w-full text-sm text-mc-ink file:mr-3 file:rounded-lg file:border-0 file:bg-mc-surface-2 file:px-3 file:py-2 file:text-sm file:font-semibold" />
      </Field>
      {parsed && (
        <div className="rounded-xl bg-mc-surface-2 p-3 text-sm" role="status" data-testid="seo-preview">
          {parsed.dimension ? <p className="text-mc-ink"><strong>{fileName}</strong>: {formatNumber(parsed.rows.length)} {parsed.dimension === 'consulta' ? 'consultas' : 'páginas'} por guardar.</p> : null}
          {parsed.errors.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs text-mc-danger">{parsed.errors.slice(0, 8).map((error) => <li key={`${error.line}-${error.message}`}>Fila {error.line}: {error.message}</li>)}</ul>}
        </div>
      )}
      <p className="text-xs leading-5 text-mc-muted">Volver a subir el mismo periodo reemplaza sus cifras; no las duplica.</p>
    </ActionDrawer>
  )
}

export function LeadsPage() {
  const { can } = useSession()
  const view = useView(VIEWS)
  const canWrite = can(WRITE_ROLES)
  const [activity, setActivity] = useState<Row | null>(null)
  const [importing, setImporting] = useState(false)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const refresh = () => setVersion((value) => value + 1)

  if (view === 'embudo') return <FunnelView />

  const convert = async (row: Row) => {
    setNotice(null)
    try {
      await callFunction('convert_lead_to_customer', { p_id: row.id })
      setNotice({ tone: 'ok', text: `${String(row.name)} ya es cliente. Puedes cotizarle desde Ventas → Cotizaciones.` })
      refresh()
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) })
    }
  }

  const leads: ResourceConfig = {
    table: 'leads',
    noun: 'lead',
    title: TITLE,
    eyebrow: 'Marketing',
    description: 'Prospectos por canal, incluido el flujo de LinkedIn B2B: a quién se contactó, quién respondió y qué se volvió oportunidad. Cada contacto se registra como actividad.',
    select: 'id,name,company,email,phone,source,status,rep_id,tracked_link_id,customer_id,last_contact_at,notes,created_at,rep:sales_reps(name)',
    searchColumns: ['name', 'company', 'email'],
    searchPlaceholder: 'Buscar por nombre, empresa o correo…',
    orderBy: { column: 'created_at', ascending: false },
    writeRoles: WRITE_ROLES,
    rowTitle: (row) => String(row.name),
    filters: [
      { param: 'fuente', column: 'source', label: 'Fuente', options: options(LEAD_SOURCE_LABEL) },
      { param: 'estado', column: 'status', label: 'Estado', options: options(LEAD_STATUS_LABEL) },
      { param: 'vendedor', column: 'rep_id', label: 'Vendedor', relation: { table: 'sales_reps', labelColumn: 'name' } },
    ],
    rowActions: (row) => (
      <>
        <Button variant="outline" className={smallButton} onClick={() => setActivity(row)} aria-label={`Seguimiento de ${String(row.name)}`}>Seguimiento</Button>
        {canWrite && !row.customer_id && <Button variant="outline" className={smallButton} onClick={() => { void convert(row) }} aria-label={`Convertir a ${String(row.name)} en cliente`}>A cliente</Button>}
      </>
    ),
    columns: [
      { key: 'name', label: 'Prospecto', render: (row) => <span><span className="block font-semibold text-mc-ink">{String(row.name)}</span><span className="block text-xs font-normal text-mc-muted">{String(row.company ?? row.email ?? '')}</span></span> },
      { key: 'source', label: 'Fuente', render: (row) => LEAD_SOURCE_LABEL[String(row.source)] ?? String(row.source) },
      { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={LEAD_STATUS_LABEL[String(row.status)] ?? String(row.status)} /> },
      { key: 'rep', label: 'Vendedor', render: (row) => (row.rep as { name?: string } | null)?.name ?? 'Sin asignar' },
      { key: 'last_contact_at', label: 'Último contacto', render: (row) => (row.last_contact_at ? formatDate(String(row.last_contact_at)) : 'Sin contacto') },
      { key: 'customer_id', label: 'Cliente', render: (row) => (row.customer_id ? 'Sí' : '—') },
    ],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'company', label: 'Empresa', type: 'text' },
      { name: 'email', label: 'Correo', type: 'email', transform: 'lower' },
      { name: 'phone', label: 'Teléfono', type: 'tel' },
      { name: 'source', label: 'Fuente', type: 'select', required: true, options: options(LEAD_SOURCE_LABEL) },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: options(LEAD_STATUS_LABEL) },
      { name: 'rep_id', label: 'Vendedor', type: 'select', relation: { table: 'sales_reps', labelColumn: 'name' } },
      { name: 'tracked_link_id', label: 'Llegó por el link', type: 'select', relation: { table: 'tracked_links', labelColumn: 'label' } },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    defaults: { source: 'linkedin', status: 'nuevo' },
  }

  const seo: ResourceConfig = {
    table: 'seo_metrics',
    noun: 'métrica',
    title: TITLE,
    eyebrow: 'Marketing',
    description: 'Consultas y páginas con más interés en Google, cargadas desde Search Console por periodo. Sirve para ver qué productos o categorías atraen demanda.',
    select: 'id,period_start,period_end,dimension,term,clicks,impressions,position',
    searchColumns: ['term'],
    searchPlaceholder: 'Buscar consulta o página…',
    orderBy: { column: 'clicks', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: (row) => String(row.term),
    filters: [{ param: 'tipo', column: 'dimension', label: 'Tipo', options: [{ value: 'consulta', label: 'Consultas' }, { value: 'pagina', label: 'Páginas' }] }],
    columns: [
      { key: 'term', label: 'Consulta o página', render: (row) => <span className="break-all">{String(row.term)}</span> },
      { key: 'dimension', label: 'Tipo', render: (row) => (row.dimension === 'consulta' ? 'Consulta' : 'Página') },
      { key: 'clicks', label: 'Clics', align: 'right', render: (row) => formatNumber(Number(row.clicks)) },
      { key: 'impressions', label: 'Impresiones', align: 'right', render: (row) => formatNumber(Number(row.impressions)) },
      { key: 'ctr', label: 'CTR', align: 'right', render: (row) => { const rate = clickRate(Number(row.clicks), Number(row.impressions)); return rate === null ? '—' : formatRatio(rate, 1) } },
      { key: 'position', label: 'Posición', align: 'right', render: (row) => (row.position === null ? '—' : String(row.position)) },
      { key: 'period', label: 'Periodo', render: (row) => `${formatDate(String(row.period_start))} al ${formatDate(String(row.period_end))}` },
    ],
  }

  return (
    <>
      <ResourcePage
        key={`${view}-${version}`}
        config={view === 'seo' ? seo : leads}
        headerActions={view === 'seo' && can(['direccion', 'admin', 'marketing']) ? <Button variant="outline" onClick={() => setImporting(true)} data-testid="seo-import"><Upload size={16} aria-hidden="true" />Cargar CSV</Button> : undefined}
        toolbar={
          <div className="space-y-3">
            {tabs(view)}
            {notice && <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === 'error' ? 'border-mc-danger/25 bg-mc-danger-soft text-mc-danger' : 'border-mc-success/30 bg-mc-success-soft text-mc-ink'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
          </div>
        }
      />
      {activity && <ActivityDrawer lead={activity} canWrite={canWrite} onClose={() => setActivity(null)} onSaved={() => { setActivity(null); refresh() }} />}
      {importing && <SeoImportDrawer onClose={() => setImporting(false)} onSaved={(count) => { setImporting(false); setNotice({ tone: 'ok', text: `${formatNumber(count)} filas de SEO guardadas.` }); refresh() }} />}
    </>
  )
}
