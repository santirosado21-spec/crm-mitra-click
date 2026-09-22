import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, CircleSlash, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useDashboardFilters } from '../commercial/useDashboardFilters'
import { DAYS_WITHOUT_SALE_ALERT, getRepLeaderboard, getRepsNeedingAttention, type RepPerformance } from '../commercial/selectors'
import type { PerformanceStatus } from '../domain'
import { FilterBar } from '../components/FilterBar'
import { Delta, MeterBar, PageHeader, Panel, Semaforo, SourceStamp, UserAvatar } from '../components/Primitives'
import { formatCurrency, formatNumber, formatRatio } from '../utils'
import { repPath } from '../commercial/links'

const STATUS_TILES: { status: PerformanceStatus; label: string; icon: LucideIcon; tone: string }[] = [
  { status: 'cumple', label: 'Cumplen su cuota', icon: CheckCircle2, tone: 'text-mc-success bg-mc-success-soft' },
  { status: 'riesgo', label: 'Van por debajo', icon: AlertTriangle, tone: 'text-mc-warning bg-mc-warning-soft' },
  { status: 'sin-ventas', label: 'Sin ventas', icon: CircleSlash, tone: 'text-mc-danger bg-mc-danger-soft' },
]

function DaysWithoutSale({ days }: { days: number | null }) {
  if (days === null) return <span className="text-mc-muted">Sin historial</span>
  const alert = days >= DAYS_WITHOUT_SALE_ALERT
  return <span className={`whitespace-nowrap ${alert ? 'font-bold text-mc-danger' : 'text-mc-gray-600'}`}>{days === 0 ? 'Vendió hoy' : `${days} ${days === 1 ? 'día' : 'días'}`}</span>
}

export function SalesRepsPage() {
  const { commercial, period, setPeriod, params } = useDashboardFilters()
  const rows = useMemo(() => getRepLeaderboard(commercial, period), [commercial, period])
  const attention = useMemo(() => getRepsNeedingAttention(rows), [rows])
  const totals = useMemo(() => {
    const sales = rows.reduce((sum, row) => sum + row.sales, 0)
    const quota = rows.reduce((sum, row) => sum + row.quota, 0)
    return { sales, quota, attainment: quota ? sales / quota : 0 }
  }, [rows])
  const search = params.toString()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Mitra mayorista"
        title="Vendedores"
        description="Quién vende, quién no y quién tiene que vender más. La cuota mensual se prorratea a los días del periodo."
      />
      <FilterBar period={period} onPeriodChange={setPeriod} asOf={commercial.asOf} />

      <section className="grid grid-cols-3 gap-3 xl:grid-cols-4" aria-label="Resumen del equipo">
        <article className="col-span-3 rounded-2xl border border-mc-charcoal bg-mc-charcoal p-4 text-white shadow-mc-card xl:col-span-1" data-testid="team-attainment">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-white/75">Avance del equipo</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-mc-yellow text-mc-ink"><Target size={16} aria-hidden="true" /></span>
          </div>
          <p className="mt-2 text-[26px] font-extrabold leading-tight tabular">{formatRatio(totals.attainment)}</p>
          <p className="mt-1 text-[11px] text-white/75 tabular">{formatCurrency(totals.sales, true)} de {formatCurrency(totals.quota, true)} de cuota</p>
        </article>
        {STATUS_TILES.map(({ status, label, icon: Icon, tone }) => {
          const count = rows.filter((row) => row.status === status).length
          return (
            <article key={status} className="rounded-2xl border border-mc-line bg-mc-surface p-3 shadow-mc-card sm:p-4" data-testid={`team-${status}`}>
              <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
                <p className="text-[11px] font-semibold leading-4 text-mc-muted sm:text-xs">{label}</p>
                <span className={`grid h-7 w-7 place-items-center rounded-lg sm:h-8 sm:w-8 ${tone}`}><Icon size={15} aria-hidden="true" /></span>
              </div>
              <p className="mt-1 text-2xl font-extrabold leading-tight text-mc-ink tabular sm:mt-2 sm:text-[26px]">{count}<span className="ml-1 text-xs font-semibold text-mc-muted sm:text-sm">de {rows.length}</span></p>
            </article>
          )
        })}
      </section>

      {attention.length > 0 && (
        <Panel title="Requieren atención" description={`Fuera de cuota o con ${DAYS_WITHOUT_SALE_ALERT}+ días sin vender, del caso más grave al menos grave`} testId="reps-attention">
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {attention.map((row) => (
              <li key={row.repId}>
                <Link to={repPath(row.repId, search)} className="flex items-center gap-3 rounded-xl border border-mc-line-soft bg-mc-surface-2/60 p-3 hover:border-mc-line hover:bg-mc-surface-2">
                  <UserAvatar name={row.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-mc-ink">{row.name}</span>
                    <span className="block text-[11px] text-mc-muted tabular">
                      {row.status === 'sin-ventas' ? `Última venta hace ${row.daysSinceLastSale ?? '—'} días` : `${formatRatio(row.attainment)} de cuota, faltan ${formatCurrency(row.gapToQuota, true)}`}
                    </span>
                  </span>
                  <Semaforo status={row.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Ranking de vendedores" description={`${period.label}. Variación ${period.comparisonLabel}.`} padding={false} testId="rep-leaderboard">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">Ranking de vendedores por venta del periodo</caption>
            <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
              <tr>
                <th scope="col" className="w-10 px-4 py-3 font-semibold">#</th>
                <th scope="col" className="px-4 py-3 font-semibold">Vendedor</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Venta</th>
                <th scope="col" className="w-56 px-4 py-3 font-semibold">Avance contra cuota</th>
                <th scope="col" className="px-4 py-3 font-semibold">Vs. anterior</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Pedidos</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Clientes</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">Sin vender</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold">Cotizaciones</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mc-line-soft">
              {rows.map((row, index) => <LeaderboardRow key={row.repId} row={row} rank={index + 1} search={search} />)}
            </tbody>
          </table>
        </div>
        <ol className="divide-y divide-mc-line-soft lg:hidden">
          {rows.map((row, index) => (
            <li key={row.repId}>
              <Link to={repPath(row.repId, search)} className="block p-4 hover:bg-mc-surface-2/60">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-mc-muted tabular">{index + 1}</span>
                  <UserAvatar name={row.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-mc-ink">{row.name}</span>
                    <span className="block text-[11px] text-mc-muted">{row.zone}</span>
                  </span>
                  <Semaforo status={row.status} />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-lg font-extrabold text-mc-ink tabular">{formatCurrency(row.sales, true)}</span>
                  <span className="text-xs text-mc-muted tabular">{formatRatio(row.attainment)} de {formatCurrency(row.quota, true)}</span>
                </div>
                <div className="mt-2"><MeterBar value={row.attainment * 100} status={row.status} label={`Avance de ${row.name} contra cuota`} /></div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mc-muted">
                  {row.deltaPct !== null && <Delta value={row.deltaPct} />}
                  <span className="tabular">{row.orders} pedidos</span>
                  <span>Sin vender: <DaysWithoutSale days={row.daysSinceLastSale} /></span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
        <div className="border-t border-mc-line-soft px-5 py-3"><SourceStamp source="Datos simulados de pedidos mayoristas" period={period.label} updatedAt={commercial.generatedAt} /></div>
      </Panel>
    </div>
  )
}

function LeaderboardRow({ row, rank, search }: { row: RepPerformance; rank: number; search: string }) {
  return (
    <tr className="hover:bg-mc-surface-2/60" data-testid={`rep-row-${row.repId}`} data-status={row.status}>
      <td className="px-4 py-3 text-xs font-bold text-mc-muted tabular">{rank}</td>
      <td className="px-4 py-3">
        <Link to={repPath(row.repId, search)} className="group flex items-center gap-3">
          <UserAvatar name={row.name} size="sm" />
          <span className="min-w-0">
            <span className="block whitespace-nowrap font-semibold text-mc-ink group-hover:underline">{row.name}</span>
            <span className="block whitespace-nowrap text-[11px] text-mc-muted">{row.zone}</span>
          </span>
        </Link>
      </td>
      <td className="px-4 py-3 text-right font-bold text-mc-ink tabular">{formatCurrency(row.sales)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1"><MeterBar value={row.attainment * 100} status={row.status} label={`Avance de ${row.name} contra cuota`} /></div>
          <span className="w-12 text-right text-xs font-bold text-mc-ink tabular">{formatRatio(row.attainment)}</span>
        </div>
        <p className="mt-1 text-[11px] text-mc-muted tabular">Cuota {formatCurrency(row.quota, true)}{row.gapToQuota > 0 && `, faltan ${formatCurrency(row.gapToQuota, true)}`}</p>
      </td>
      <td className="px-4 py-3">{row.deltaPct === null ? <span className="text-xs text-mc-muted">Sin base</span> : <Delta value={row.deltaPct} />}</td>
      <td className="px-4 py-3 text-right text-mc-gray-700 tabular">{formatNumber(row.orders)}</td>
      <td className="px-4 py-3 text-right text-mc-gray-700 tabular">{row.activeClients}</td>
      <td className="px-4 py-3 text-xs"><DaysWithoutSale days={row.daysSinceLastSale} /></td>
      <td className="px-4 py-3 text-right text-xs text-mc-gray-700 tabular"><span className="block font-semibold">{row.openQuotes}</span><span className="block text-mc-muted">{formatCurrency(row.openQuotesValue, true)}</span></td>
      <td className="px-4 py-3"><Semaforo status={row.status} /></td>
    </tr>
  )
}
