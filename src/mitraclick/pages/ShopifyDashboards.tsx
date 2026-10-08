import type { ReactNode } from 'react'
import { ArrowUpRight, Banknote, BarChart3, Globe, Megaphone, Search, ShoppingBag, Sparkles, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Select } from '../components/Controls'
import { EmptyState, IntegrationBadge, KpiCard, PageHeader, Panel } from '../components/Primitives'
import { callFunction, selectRows } from '../lib/crud'
import { LEAD_SOURCE_LABEL } from '../lib/acquisition'
import { formatDayLabel as formatDate, localTodayKey } from '../lib/dates'
import { formatCurrency, formatNumber, formatRatio } from '../lib/format'
import { changePct, type CommercialKpis } from '../lib/kpis'
import { isPeriodKey, PERIOD_OPTIONS, resolvePeriod, type ResolvedPeriod } from '../lib/period'
import { useQuery, type QueryState } from '../lib/useQuery'

const VIEWS = [
  { key: 'ventas', label: 'Ventas', icon: ShoppingBag },
  { key: 'marketing', label: 'Canales de marketing', icon: BarChart3 },
  { key: 'paid', label: 'Paid Ads', icon: Megaphone },
  { key: 'google', label: 'Google Ads', icon: Search },
  { key: 'seo', label: 'SEO', icon: Globe },
  { key: 'aeo', label: 'AEO', icon: Sparkles },
  { key: 'linkedin', label: 'LinkedIn outreach', icon: Users },
  { key: 'integracion', label: 'Integración', icon: ArrowUpRight },
]

const actionClass = 'mc-press inline-flex min-h-11 items-center gap-2 rounded-xl border border-mc-line bg-mc-surface px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-yellow-strong'

function QueryNotice<T>({ query }: { query: QueryState<T> }) {
  if (query.error) return <div role="alert" className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft p-4 text-sm text-mc-danger"><p>{query.error}</p><Button variant="outline" className="mt-3" onClick={query.reload}>Reintentar</Button></div>
  if (query.loading) return <p role="status" className="py-8 text-center text-sm text-mc-muted">Consultando indicadores…</p>
  return null
}

function SalesDashboard({ period }: { period: ResolvedPeriod }) {
  const query = useQuery(`shopify-sales|${period.start}|${period.end}`, async () => {
    const [current, previous] = await Promise.all([
      callFunction<CommercialKpis>('kpi_commercial', { p_start: period.start, p_end: period.end }),
      callFunction<CommercialKpis>('kpi_commercial', { p_start: period.previousStart, p_end: period.previousEnd }),
    ])
    return { current, previous }
  })
  if (query.loading || query.error || !query.data) return <QueryNotice query={query} />
  const { current, previous } = query.data
  return <div className="space-y-5" data-testid="shopify-dashboard-ventas">
    <div className="grid gap-3 sm:grid-cols-3">
      <KpiCard label="Ventas Shopify" value={formatCurrency(Number(current.sales_shopify))} delta={changePct(Number(current.sales_shopify), Number(previous.sales_shopify))} icon={ShoppingBag} source="Pedidos · canal Shopify" period={period.label} helper="Antes de IVA y envío; excluye cancelados." />
      <KpiCard label="Shopify · periodo anterior" value={formatCurrency(Number(previous.sales_shopify))} icon={Banknote} helper={`${formatDate(period.previousStart)} al ${formatDate(period.previousEnd)}`} />
      <KpiCard label="Ventas directas · referencia" value={formatCurrency(Number(current.sales_direct))} icon={BarChart3} helper="Canal directo, separado de Shopify." />
    </div>
    <Panel title="Ventas de la tienda" description="Las cifras provienen de los pedidos registrados en el sistema; pueden incluir los pedidos de prueba sembrados en la base.">
      {Number(current.sales_shopify) === 0 && <EmptyState title="Sin ventas Shopify registradas en este periodo" description="Revisa el periodo o sincroniza la tienda desde Integración." />}
      <div className="flex flex-wrap gap-3"><Link to="/pedidos?canal=shopify" className={actionClass}>Ver pedidos Shopify <ArrowUpRight size={16} /></Link><Link to="?vista=integracion" className={actionClass}>Revisar sincronización</Link></div>
      <p className="mt-4 text-xs leading-5 text-mc-muted">Sesiones, conversión de la tienda y atribución publicitaria: integración pendiente. Estas ventas no se asignan automáticamente a Google Ads, SEO ni LinkedIn.</p>
    </Panel>
  </div>
}

interface FunnelRow { source: string; prospects: number; contacted: number; replies: number; conversations: number; opportunities: number; won: number; pending_follow_up: number }
const FUNNEL_COLUMNS: { key: Exclude<keyof FunnelRow, 'source'>; label: string }[] = [
  { key: 'prospects', label: 'Prospectos' }, { key: 'contacted', label: 'Contactados' },
  { key: 'replies', label: 'Respuestas' }, { key: 'conversations', label: 'Conversaciones' },
  { key: 'opportunities', label: 'Oportunidades' }, { key: 'won', label: 'Ganados' },
  { key: 'pending_follow_up', label: 'Seguimiento pendiente' },
]

function AcquisitionDashboard({ period, linkedin = false }: { period: ResolvedPeriod; linkedin?: boolean }) {
  const query = useQuery(`shopify-acquisition|${period.start}|${period.end}`, () => callFunction<FunnelRow[]>('kpi_acquisition', { p_start: period.start, p_end: period.end }))
  const rows = (query.data ?? []).filter((row) => !linkedin || row.source === 'linkedin')
  return <div className="space-y-5" data-testid={`shopify-dashboard-${linkedin ? 'linkedin' : 'marketing'}`}>
    <Panel title={linkedin ? 'LinkedIn outreach · embudo comercial' : 'Adquisición por canal'} description={`Leads creados del ${formatDate(period.start)} al ${formatDate(period.end)}. Contactos y respuestas registrados hasta hoy; cada persona cuenta una vez por etapa.`}>
      <QueryNotice query={query} />
      {!query.loading && !query.error && (rows.length ? <>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full text-left text-sm"><caption className="sr-only">Embudo por fuente del prospecto</caption><thead><tr><th scope="col" className="p-3">Canal</th>{FUNNEL_COLUMNS.map((column) => <th key={column.key} scope="col" className="p-3 text-right text-xs text-mc-muted">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.source} className="border-t border-mc-line-soft"><th scope="row" className="p-3">{LEAD_SOURCE_LABEL[row.source] ?? row.source}</th>{FUNNEL_COLUMNS.map((column) => <td key={column.key} className="p-3 text-right tabular">{formatNumber(Number(row[column.key]))}</td>)}</tr>)}</tbody></table></div>
        <div className="grid gap-3 lg:hidden">{rows.map((row) => <article key={row.source} className="rounded-xl border border-mc-line p-4"><h3 className="font-bold">{LEAD_SOURCE_LABEL[row.source] ?? row.source}</h3><dl className="mt-3 grid grid-cols-2 gap-3">{FUNNEL_COLUMNS.map((column) => <div key={column.key}><dt className="text-xs text-mc-muted">{column.label}</dt><dd className="font-bold tabular">{formatNumber(Number(row[column.key]))}</dd></div>)}</dl></article>)}</div>
      </> : <EmptyState title={linkedin ? 'Sin prospectos de LinkedIn en el periodo' : 'Sin prospectos en el periodo'} description="Registra prospectos y sus actividades para alimentar este tablero." />)}
      <Link to={linkedin ? '/leads?fuente=linkedin' : '/leads'} className={`${actionClass} mt-4`}>{linkedin ? 'Registrar y dar seguimiento en LinkedIn' : 'Gestionar prospectos'} <ArrowUpRight size={16} /></Link>
    </Panel>
    {linkedin ? <Panel title="Seguimiento desde la aplicación" description="Registra solicitudes de conexión, mensajes, respuestas y reuniones en el historial de cada prospecto."><p className="text-sm text-mc-muted">El registro de actividad es manual. La app no envía mensajes en LinkedIn. Los ganados corresponden al estado del prospecto; no representan ingresos atribuidos de Shopify.</p></Panel> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{VIEWS.filter((view) => ['paid', 'seo', 'aeo', 'linkedin'].includes(view.key)).map(({ key, label, icon: Icon }) => <Link key={key} to={`?vista=${key}&periodo=${period.key}`} className="mc-surface mc-card-link p-5 hover:bg-mc-surface-2"><Icon className="mb-3 text-mc-yellow-ink" size={22} /><span className="font-bold">{label}</span><span className="mt-2 block text-xs text-mc-muted">Abrir dashboard →</span></Link>)}</div>}
  </div>
}

interface SeoRow { id: number; term: string; clicks: number; impressions: number; position: number | null }

function SeoDashboard({ period }: { period: ResolvedPeriod }) {
  const [params, setParams] = useSearchParams()
  const dimension = params.get('dimension') === 'pagina' ? 'pagina' : 'consulta'
  const query = useQuery(`shopify-seo|${period.start}|${period.end}|${dimension}`, () => selectRows<SeoRow>('seo_metrics', 'id,term,clicks,impressions,position', { filters: { period_start: period.start, period_end: period.end, dimension }, orderBy: { column: 'clicks', ascending: false }, limit: 20 }))
  return <Panel title="SEO · rendimiento en Google" description={`Hasta 20 ${dimension === 'pagina' ? 'páginas' : 'consultas'} con más clics. Solo importaciones cuyo periodo coincida exactamente con ${formatDate(period.start)} al ${formatDate(period.end)}; no se suman periodos superpuestos.`} testId="shopify-dashboard-seo">
    <div className="mb-5 flex flex-wrap gap-3"><Select aria-label="Dimensión SEO" className="!w-auto" value={dimension} onChange={(event) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('dimension', event.target.value); return next })}><option value="consulta">Consultas</option><option value="pagina">Páginas</option></Select><Link to="/leads?vista=seo" className={actionClass}>Importar Search Console / ver periodos</Link></div>
    <QueryNotice query={query} />
    {!query.loading && !query.error && (query.data?.length ? <div className="grid gap-3 sm:grid-cols-2">{query.data.map((row) => <article key={row.id} className="min-w-0 rounded-xl border border-mc-line p-4"><h3 className="break-all text-sm font-bold">{row.term}</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm">{[['Clics', formatNumber(Number(row.clicks))], ['Impresiones', formatNumber(Number(row.impressions))], ['CTR', Number(row.impressions) ? formatRatio(Number(row.clicks) / Number(row.impressions), 1) : '—'], ['Posición media', row.position === null ? '—' : String(row.position)]].map(([label, value]) => <div key={label}><dt className="text-xs text-mc-muted">{label}</dt><dd className="font-bold tabular">{value}</dd></div>)}</dl></article>)}</div> : <EmptyState title="Sin importación para este periodo" description="Carga el CSV de Search Console con estas fechas o consulta los periodos ya importados." />)}
  </Panel>
}

const PENDING = {
  paid: { title: 'Paid Ads · publicidad pagada', description: 'Vista reservada para comparar campañas de Google Ads, Meta Ads y LinkedIn Ads.', metrics: ['Inversión publicitaria', 'Clics de anuncios', 'Conversiones atribuidas', 'ROAS'], source: 'Faltan los conectores y datos de las plataformas publicitarias. El comparativo requiere moneda, periodo y modelo de atribución consistentes.' },
  google: { title: 'Google Ads · campañas', description: 'Rendimiento de campañas, grupos de anuncios y términos de búsqueda.', metrics: ['Inversión', 'Impresiones', 'Clics', 'Costo por conversión'], source: 'Integración de Google Ads pendiente de implementar y conectar. No hay campañas sincronizadas ni gasto disponible.' },
  aeo: { title: 'AEO · visibilidad en respuestas de IA', description: 'Seguimiento previsto de menciones y citas de Mitra Click en respuestas de buscadores y asistentes.', metrics: ['Consultas evaluadas', 'Respuestas con mención', 'Respuestas con cita', 'Visitas referidas por IA'], source: 'Medición pendiente de implementar. Requiere un conjunto de consultas, fecha, motor y evidencia de cada respuesta; las visitas necesitan una fuente de analítica conectada.' },
}

function PendingDashboard({ kind }: { kind: keyof typeof PENDING }) {
  const config = PENDING[kind]
  return <div className="space-y-5" data-testid={`shopify-dashboard-${kind}`}>
    <Panel title={config.title} description={config.description}><IntegrationBadge /><p className="mt-3 text-sm leading-6 text-mc-muted">{config.source}</p></Panel>
    <section aria-label="Indicadores pendientes de conexión" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{config.metrics.map((metric) => <KpiCard key={metric} label={metric} value="—" icon={kind === 'aeo' ? Sparkles : Megaphone} helper="Sin fuente conectada" />)}</section>
    <Panel title={kind === 'aeo' ? 'Evidencia antes de medir' : 'Campañas y atribución'}><EmptyState title={kind === 'aeo' ? 'Todavía no hay mediciones de AEO' : 'Todavía no hay campañas importadas'} description={kind === 'aeo' ? 'Este panel no presenta una puntuación automática de visibilidad sin evidencia.' : 'Los pedidos de Shopify por sí solos no identifican qué anuncio produjo cada venta.'} />{kind === 'paid' && <Link to="?vista=google" className={actionClass}>Abrir Google Ads <ArrowUpRight size={16} /></Link>}</Panel>
  </div>
}

export function ShopifyDashboards({ integration }: { integration: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((item) => item.key === params.get('vista')) ?? VIEWS[0]
  const periodParam = params.get('periodo')
  const periodKey = isPeriodKey(periodParam) ? periodParam : 'mes'
  const period = resolvePeriod(periodKey, localTodayKey())
  return <div className="space-y-5">
    <PageHeader eyebrow="Shopify · ventas y crecimiento" title={`Shopify · ${view.label}`} description="La tienda, sus canales de adquisición y la operación comercial en un solo lugar." actions={['ventas', 'marketing', 'linkedin', 'seo'].includes(view.key) ? <Select aria-label="Periodo del dashboard" value={periodKey} onChange={(event) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('periodo', event.target.value); return next })}>{PERIOD_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</Select> : undefined} />
    <nav aria-label="Dashboards de Shopify" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{VIEWS.map(({ key, label, icon: Icon }) => { const next = new URLSearchParams(params); next.set('vista', key); return <Link key={key} to={`?${next}`} aria-current={view.key === key ? 'page' : undefined} data-testid={`shopify-tab-${key}`} className={`mc-card-link flex min-h-24 min-w-0 flex-col justify-between gap-2 rounded-xl border p-3 text-sm font-semibold ${view.key === key ? 'border-mc-yellow-strong bg-mc-yellow-soft text-mc-ink' : 'border-mc-line bg-mc-surface text-mc-muted hover:bg-mc-surface-2'}`}><Icon size={20} aria-hidden="true" /><span>{label}</span></Link> })}</nav>
    {view.key === 'ventas' && <SalesDashboard key={periodKey} period={period} />}
    {(view.key === 'marketing' || view.key === 'linkedin') && <AcquisitionDashboard key={`${view.key}|${periodKey}`} period={period} linkedin={view.key === 'linkedin'} />}
    {view.key === 'seo' && <SeoDashboard key={periodKey} period={period} />}
    {(view.key === 'paid' || view.key === 'google' || view.key === 'aeo') && <PendingDashboard kind={view.key} />}
    {view.key === 'integracion' && integration}
  </div>
}
