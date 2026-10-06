import { formatReportValue, labelFor, reportSections } from '../lib/reports'

/** Muestra el contenido de un reporte o la evidencia de un hallazgo: listas de indicadores y tablas. */
export function ReportView({ content }: { content: Record<string, unknown> }) {
  const sections = reportSections(content)
  if (!sections.length) return <p className="text-sm text-mc-muted">Sin datos.</p>
  return (
    <div className="space-y-5" data-testid="report-view">
      {sections.map((section) => (
        <section key={section.key}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-muted">{section.key === 'resumen' ? 'Resumen' : labelFor(section.key)}</h3>
          {section.type === 'values' ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {section.items.map((item) => (
                <div key={item.key} className="min-w-0">
                  <dt className="truncate text-xs text-mc-muted">{labelFor(item.key)}</dt>
                  <dd className="font-semibold tabular text-mc-ink">{formatReportValue(item.key, item.value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-mc-line-soft">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">{labelFor(section.key)}</caption>
                <thead className="bg-mc-surface-2 text-mc-muted">
                  <tr>{section.columns.map((column) => <th key={column} scope="col" className="px-3 py-2 font-semibold">{labelFor(column)}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-mc-line-soft">
                  {section.rows.map((row, index) => (
                    <tr key={index}>{section.columns.map((column) => <td key={column} className="px-3 py-2 text-mc-gray-700">{formatReportValue(column, row[column])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
