import type { Report, Tone } from './buildReport'

const toneClass: Record<Tone, string> = {
  good: 'text-mc-success',
  bad: 'text-mc-danger',
  warn: 'text-mc-warning',
  neutral: 'text-mc-ink',
}

/** Tarjeta del reporte con ancho de teléfono; se usa en pantalla y en la vista de captura. */
export function ReportCard({ report }: { report: Report }) {
  return (
    <article className="w-full max-w-[420px] overflow-hidden rounded-3xl border border-mc-line bg-mc-surface shadow-mc-pop" data-testid="report-card" data-report-type={report.type}>
      <header className="bg-mc-charcoal px-5 pb-5 pt-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <img src="/mitraclick-mark.svg" alt="" className="h-7 w-7" aria-hidden="true" />
          {report.source === 'demo' && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">Datos simulados</span>}
        </div>
        <h2 className="mt-3 text-xl font-extrabold">{report.title}</h2>
        <p className="mt-0.5 text-xs text-white/75">{report.periodLabel}</p>
        <p className="mt-3 text-sm font-semibold leading-5 text-mc-yellow" data-testid="report-headline">{report.headline}</p>
      </header>
      <div className="grid grid-cols-2 gap-px bg-mc-line-soft" data-testid="report-kpis">
        {report.kpis.map((kpi) => (
          <div key={kpi.label} className="bg-mc-surface px-4 py-3">
            <p className="text-[11px] font-semibold text-mc-muted">{kpi.label}</p>
            <p className={`text-lg font-extrabold tabular ${toneClass[kpi.tone ?? 'neutral']}`}>{kpi.value}</p>
            {kpi.detail && <p className="text-[11px] text-mc-muted tabular">{kpi.detail}</p>}
          </div>
        ))}
      </div>
      <div className="divide-y divide-mc-line-soft">
        {report.sections.map((section) => (
          <section key={section.heading} className="px-5 py-4">
            <h3 className="text-xs font-bold text-mc-ink">{section.heading}</h3>
            {section.lines.length ? (
              <ul className="mt-2 space-y-1.5">
                {section.lines.map((line) => (
                  <li key={`${line.label}-${line.value}`} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-mc-gray-700" title={line.label}>{line.label}</span>
                    <span className="shrink-0 text-right">
                      <span className={`font-bold tabular ${toneClass[line.tone ?? 'neutral']}`}>{line.value}</span>
                      {line.detail && <span className="block text-[11px] text-mc-muted tabular">{line.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-mc-muted">{section.empty}</p>
            )}
          </section>
        ))}
      </div>
      <footer className="border-t border-mc-line-soft bg-mc-surface-2 px-5 py-3 text-[11px] text-mc-muted">
        MitraClick Intelligence. Datos al {report.asOfLabel}.
      </footer>
    </article>
  )
}
