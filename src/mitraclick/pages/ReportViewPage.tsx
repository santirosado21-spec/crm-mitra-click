import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Check, Copy, ExternalLink } from 'lucide-react'
import { useCommercialData } from '../commercial/useDashboardFilters'
import { isPeriodKey } from '../commercial/period'
import { buildReport, formatWhatsApp, isReportType, REPORT_DEFINITIONS, WHATSAPP_MAX_CHARS } from '../reports/buildReport'
import { AGENT_PROFILES } from '../reports/agentProfiles'
import { ReportCard } from '../reports/ReportCard'
import { Segmented } from '../components/FilterBar'
import { PageHeader, Panel } from '../components/Primitives'
import type { PeriodKey } from '../domain'

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: '7 días' },
  { value: 'mes', label: 'Mes' },
]

function useReport() {
  const { tipo } = useParams()
  const [params, setParams] = useSearchParams()
  const commercial = useCommercialData()
  const periodParam = params.get('periodo')
  const type = isReportType(tipo) ? tipo : null
  const periodKey = isPeriodKey(periodParam) ? periodParam : undefined
  const report = useMemo(() => (type ? buildReport(type, commercial, periodKey) : null), [type, commercial, periodKey])
  return { type, report, params, setParams }
}

export function ReportViewPage() {
  const { type, report, params, setParams } = useReport()
  const [copied, setCopied] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const text = useMemo(() => (report ? formatWhatsApp(report, window.location.origin) : ''), [report])

  if (!type || !report) return <Navigate to="/reportes" replace />
  const definition = REPORT_DEFINITIONS[type]
  const search = params.toString()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      textRef.current?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-5">
      <Link to="/reportes" className="inline-flex items-center gap-1.5 text-xs font-semibold text-mc-muted hover:text-mc-ink"><ArrowLeft size={14} aria-hidden="true" /> Todos los reportes</Link>
      <PageHeader
        eyebrow={`${AGENT_PROFILES[definition.agent].name}. ${definition.cadence}`}
        title={report.title}
        description={definition.description}
        actions={
          <Segmented
            label="Periodo del reporte"
            value={report.periodKey}
            options={PERIODS}
            onChange={(value) => setParams((previous) => { const next = new URLSearchParams(previous); if (value === definition.defaultPeriod) next.delete('periodo'); else next.set('periodo', value); return next }, { replace: true })}
            testId="report-period"
          />
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[440px_1fr]">
        <div className="flex justify-center lg:justify-start"><ReportCard report={report} /></div>
        <div className="space-y-4">
          <Panel
            title="Texto para WhatsApp"
            description={`${text.length} de ${WHATSAPP_MAX_CHARS} caracteres. Formato de WhatsApp: *negritas* y _cursivas_.`}
            action={
              <button type="button" onClick={() => { void copy() }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-mc-charcoal px-4 text-sm font-semibold text-white hover:bg-mc-ink" data-testid="copy-whatsapp">
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? 'Copiado' : 'Copiar texto'}
              </button>
            }
            testId="whatsapp-panel"
          >
            <label htmlFor="whatsapp-text" className="sr-only">Texto del reporte para WhatsApp</label>
            <textarea id="whatsapp-text" ref={textRef} readOnly value={text} rows={Math.min(28, text.split('\n').length + 1)} className="w-full resize-y rounded-xl border border-mc-line bg-mc-surface-2 p-3 text-xs leading-5 text-mc-ink" data-testid="whatsapp-text" />
            <p className="mt-2 text-xs text-mc-muted" role="status" aria-live="polite">{copied ? 'Texto copiado al portapapeles.' : ''}</p>
          </Panel>
          <Panel title="Links del reporte" description="Estables: el mismo link siempre muestra el reporte del día">
            <ul className="space-y-2 text-sm">
              <li><Link to={report.dashboardPath} className="inline-flex items-center gap-2 font-semibold text-mc-ink hover:underline" data-testid="report-dashboard-link"><ExternalLink size={14} aria-hidden="true" />Abrir el dashboard con el mismo periodo</Link></li>
              <li><Link to={`/reportes/${type}/captura${search ? `?${search}` : ''}`} className="inline-flex items-center gap-2 font-semibold text-mc-ink hover:underline" data-testid="report-capture-link"><Camera size={14} aria-hidden="true" />Vista limpia para captura de pantalla</Link></li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}

/** Vista sin menú ni encabezados, sólo la tarjeta: para que un agente la capture como imagen. */
export function ReportCapturePage() {
  const { type, report } = useReport()
  if (!type || !report) return <Navigate to="/reportes" replace />
  return (
    <main className="flex min-h-dvh items-start justify-center bg-mc-bg p-4">
      <h1 className="sr-only">{report.title}</h1>
      <ReportCard report={report} />
    </main>
  )
}
