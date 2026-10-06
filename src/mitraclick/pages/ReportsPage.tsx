import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useSession } from '../auth/SessionContext'
import { Button } from '../components/Controls'
import { RecordDrawer } from '../components/RecordDrawer'
import { ReportView } from '../components/ReportView'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { callFunction, invokeFunction } from '../lib/crud'
import { formatDate } from '../lib/format'
import { FREQUENCY_LABEL, REPORT_KIND_LABEL } from '../lib/reports'
import { useQuery } from '../lib/useQuery'

type Row = Record<string, unknown>

const smallButton = '!px-3 !py-1.5 !text-xs'
const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }))
const reportName = (row: Row) => `${REPORT_KIND_LABEL[String(row.kind)] ?? String(row.kind)} · ${FREQUENCY_LABEL[String(row.frequency)] ?? String(row.frequency)}`
const period = (row: Row) => `${formatDate(String(row.period_start))} al ${formatDate(String(row.period_end))}`

export function ReportsPage() {
  const { can } = useSession()
  const admin = can(['direccion', 'admin'])
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [open, setOpen] = useState<Row | null>(null)
  const ai = useQuery(`ai-status|${admin}`, async () => (admin ? invokeFunction<{ ia: boolean }>('agent-narrate', { tipo: 'estado' }).catch(() => ({ ia: false })) : { ia: false }))

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

  const narrate = (row: Row) =>
    act(`ia-${String(row.id)}`, async () => {
      const result = await invokeFunction<{ narrativa: string }>('agent-narrate', { tipo: 'reporte', id: row.id })
      setOpen((current) => (current && current.id === row.id ? { ...current, narrative: result.narrativa, generated_by: 'ia' } : current))
    })

  const config: ResourceConfig = {
    table: 'reports',
    noun: 'reporte',
    title: 'Reportes',
    eyebrow: 'Dirección',
    description: 'Reportes periódicos, breves y comparables entre periodos. Se generan solos: semanal los lunes, quincenal el 1 y el 16, y mensual el día 1. Usan las mismas métricas que el dashboard.',
    select: 'id,kind,frequency,period_start,period_end,content,narrative,generated_by,generated_at',
    searchColumns: ['narrative'],
    searchPlaceholder: 'Buscar en el texto…',
    orderBy: { column: 'period_start', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: reportName,
    filters: [
      { param: 'tipo', column: 'kind', label: 'Reporte', options: options(REPORT_KIND_LABEL) },
      { param: 'frecuencia', column: 'frequency', label: 'Frecuencia', options: options(FREQUENCY_LABEL) },
    ],
    rowActions: (row) => <Button className={smallButton} onClick={() => setOpen(row)} aria-label={`Abrir el reporte ${reportName(row)} del ${period(row)}`}>Abrir</Button>,
    columns: [
      { key: 'kind', label: 'Reporte', render: (row) => REPORT_KIND_LABEL[String(row.kind)] ?? String(row.kind) },
      { key: 'frequency', label: 'Frecuencia', render: (row) => FREQUENCY_LABEL[String(row.frequency)] ?? String(row.frequency) },
      { key: 'period', label: 'Periodo', render: period },
      { key: 'generated_by', label: 'Redacción', render: (row) => (row.narrative ? (row.generated_by === 'ia' ? 'Con IA' : 'Por reglas') : 'Solo datos') },
      { key: 'generated_at', label: 'Generado', render: (row) => formatDate(String(row.generated_at), true) },
    ],
  }

  return (
    <>
      <ResourcePage
        key={version}
        config={config}
        headerActions={admin ? (
          <>
            {Object.entries(FREQUENCY_LABEL).map(([key, label]) => (
              <Button key={key} variant="outline" disabled={busy !== null} onClick={() => { void act(key, async () => { await callFunction('generate_reports', { p_frequency: key }); return `Reportes del último periodo ${label.toLowerCase()} generados.` }) }} data-testid={`generate-${key}`}>{busy === key ? 'Generando…' : `Generar ${label.toLowerCase()}`}</Button>
            ))}
          </>
        ) : undefined}
        toolbar={notice ? <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === 'error' ? 'border-mc-danger/25 bg-mc-danger-soft text-mc-danger' : 'border-mc-success/30 bg-mc-success-soft text-mc-ink'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : undefined}
      />
      {open && (
        <RecordDrawer
          open
          title={reportName(open)}
          subtitle={period(open)}
          onClose={() => setOpen(null)}
          footer={admin && ai.data?.ia ? <div className="flex justify-end"><Button variant="outline" disabled={busy !== null} onClick={() => { void narrate(open) }}><Sparkles size={15} aria-hidden="true" />{busy === `ia-${String(open.id)}` ? 'Redactando…' : 'Redactar con IA'}</Button></div> : undefined}
        >
          {Boolean(open.narrative) && (
            <div className="mb-5 rounded-xl bg-mc-yellow-wash p-4" data-testid="report-narrative">
              <p className="text-xs font-bold text-mc-yellow-ink">{open.generated_by === 'ia' ? 'Lectura redactada con IA sobre estos datos' : 'Lectura por reglas'}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-mc-ink">{String(open.narrative)}</p>
            </div>
          )}
          <ReportView content={(open.content as Record<string, unknown> | null) ?? {}} />
        </RecordDrawer>
      )}
    </>
  )
}
