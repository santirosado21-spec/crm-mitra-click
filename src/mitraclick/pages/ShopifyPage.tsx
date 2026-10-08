import { useState } from 'react'
import { CheckCircle2, CircleDashed, RefreshCw } from 'lucide-react'
import { useSession } from '../auth/SessionContext'
import { Button, Checkbox } from '../components/Controls'
import { EmptyState, PageHeader, Panel, StatusBadge } from '../components/Primitives'
import { callFunction, invokeFunction, selectRows } from '../lib/crud'
import { formatDate, formatNumber } from '../lib/format'
import { useQuery } from '../lib/useQuery'

interface Status { configurado: { dominio: boolean; token: boolean; webhook: boolean }; version: string }
interface RunRow { id: number; entity: string; status: string; started_at: string; rows_received: number; rows_upserted: number; error: string | null; triggered_by: string | null }
interface SettingRow { key: string; enabled: boolean; label: string; description: string | null }
interface DifferenceRow { id: string; sku: string; name: string; shopify_available: number; system_quantity: number; difference: number }
interface SyncResult { recibidos: number; aplicados: number; problemas: string[]; incompleto: boolean }

const ENTITY_LABEL: Record<string, string> = { order: 'Pedidos', product: 'Productos', customer: 'Clientes', inventory: 'Inventario' }
const RUN_TEXT: Record<string, string> = { exitoso: 'Exitosa', parcial: 'Parcial', fallido: 'Fallida', en_curso: 'En curso' }
const SECRETS: { key: keyof Status['configurado']; label: string; secret: string }[] = [
  { key: 'dominio', label: 'Dominio de la tienda', secret: 'SHOPIFY_STORE_DOMAIN' },
  { key: 'token', label: 'Token de la Admin API', secret: 'SHOPIFY_ADMIN_TOKEN' },
  { key: 'webhook', label: 'Secreto de webhooks', secret: 'SHOPIFY_WEBHOOK_SECRET' },
]
const SYNCS = [
  { entidad: 'productos', label: 'Productos' },
  { entidad: 'clientes', label: 'Clientes' },
  { entidad: 'pedidos', label: 'Pedidos' },
]

export function ShopifyPage() {
  const { can } = useSession()
  const admin = can(['direccion', 'admin'])
  const [running, setRunning] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const status = useQuery(`shopify-status|${admin}`, async () => (admin ? invokeFunction<Status>('shopify-sync', { entidad: 'estado' }) : null))
  const data = useQuery('shopify-data', async () => {
    const [runs, settings, differences] = await Promise.all([
      selectRows<RunRow>('sync_runs', 'id,entity,status,started_at,rows_received,rows_upserted,error,triggered_by', { filters: { source: 'shopify' }, orderBy: { column: 'started_at', ascending: false }, limit: 25 }),
      selectRows<SettingRow>('integration_settings', 'key,enabled,label,description', { orderBy: { column: 'label' } }),
      selectRows<DifferenceRow>('shopify_inventory_differences', 'id,sku,name,shopify_available,system_quantity,difference', { orderBy: { column: 'name' }, limit: 100 }),
    ])
    return { runs, settings, differences }
  })

  const connected = Boolean(status.data?.configurado.dominio && status.data.configurado.token)
  const demoRuns = (data.data?.runs ?? []).filter((run) => run.triggered_by === 'demo').length

  const sync = async (entidad: string, label: string) => {
    setRunning(entidad)
    setNotice(null)
    try {
      const result = await invokeFunction<SyncResult>('shopify-sync', { entidad })
      setNotice({ tone: 'ok', text: `${label}: ${result.recibidos} recibidos, ${result.aplicados} aplicados${result.problemas.length ? `, ${result.problemas.length} con problema (ver bitácora abajo)` : ''}${result.incompleto ? '. Quedaron páginas pendientes: vuelve a sincronizar.' : '.'}` })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setRunning(null)
      data.reload()
    }
  }

  const toggle = async (setting: SettingRow, enabled: boolean) => {
    setNotice(null)
    try {
      await callFunction('set_integration_setting', { p_key: setting.key, p_enabled: enabled })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) })
    }
    data.reload()
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Sistema" title="Shopify" description="Shopify sigue siendo la tienda. De allá llegan pedidos, clientes y productos; aquí vive la operación interna. Las credenciales se guardan como secretos del servidor: nunca se escriben ni se ven en esta pantalla." />

      {demoRuns > 0 && <p className="rounded-xl border border-mc-yellow-strong/40 bg-mc-yellow-wash px-4 py-3 text-sm text-mc-ink" role="status"><strong>Datos de prueba activos.</strong> La conciliación y la bitácora incluyen {formatNumber(demoRuns)} corridas demo de Shopify; se pueden retirar con <code>purge_shopify_demo()</code>.</p>}

      {notice && <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === 'error' ? 'border-mc-danger/25 bg-mc-danger-soft text-mc-danger' : 'border-mc-success/30 bg-mc-success-soft text-mc-ink'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Conexión" description={status.data ? `Versión de la API: ${status.data.version}` : undefined} testId="shopify-connection">
          {!admin ? (
            <p className="text-sm text-mc-muted">Solo dirección y administración pueden ver el estado de la conexión.</p>
          ) : status.error ? (
            <p className="text-sm text-mc-danger" role="alert">No se pudo consultar el estado: {status.error}</p>
          ) : !status.data ? (
            <p className="text-sm text-mc-muted" role="status">Consultando…</p>
          ) : (
            <>
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-mc-ink" data-testid="shopify-status">
                {connected ? <CheckCircle2 size={18} className="text-mc-success" aria-hidden="true" /> : <CircleDashed size={18} className="text-mc-warning" aria-hidden="true" />}
                {connected ? 'Conectado' : 'Integración pendiente: faltan credenciales'}
              </p>
              <ul className="space-y-2 text-sm">
                {SECRETS.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3">
                    <span className="text-mc-ink">{item.label} <code className="text-xs text-mc-muted">{item.secret}</code></span>
                    <StatusBadge status={status.data!.configurado[item.key] ? 'Activo' : 'Pendiente'} />
                  </li>
                ))}
              </ul>
              {!connected && <p className="mt-3 text-xs leading-5 text-mc-muted">Para activar: en Shopify crea una app personalizada con permisos de lectura de pedidos, productos, clientes e inventario; guarda los tres valores como secretos de las Edge Functions en Supabase y registra los webhooks hacia la función <code>shopify-webhook</code>.</p>}
            </>
          )}
        </Panel>

        <Panel title="Sincronizar ahora" description="Carga inicial o reconciliación. Se puede repetir: no duplica." testId="shopify-sync">
          <div className="flex flex-wrap gap-2">
            {SYNCS.map((item) => (
              <Button key={item.entidad} variant="outline" disabled={!admin || !connected || running !== null} onClick={() => { void sync(item.entidad, item.label) }} data-testid={`sync-${item.entidad}`}>
                <RefreshCw size={15} aria-hidden="true" />{running === item.entidad ? 'Sincronizando…' : item.label}
              </Button>
            ))}
          </div>
          {!connected && <p className="mt-3 text-xs text-mc-muted">Disponible cuando la conexión esté activa. Mientras tanto, el catálogo y los clientes se pueden cargar con el importador CSV.</p>}
          <div className="mt-5 space-y-3 border-t border-mc-line-soft pt-4">
            {(data.data?.settings ?? []).map((setting) => (
              <div key={setting.key}>
                <Checkbox label={setting.label} checked={setting.enabled} disabled={!admin} onChange={(event) => { void toggle(setting, event.target.checked) }} />
                {setting.description && <p className="ml-6 text-xs leading-5 text-mc-muted">{setting.description}</p>}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Diferencias de inventario contra Shopify" description="Lo que Shopify cree que hay contra la existencia del sistema. Informativo: Shopify nunca sobrescribe la existencia." padding={false} testId="shopify-differences">
        {(data.data?.differences ?? []).length === 0 ? <EmptyState title="Sin diferencias" description="No hay inventario reportado por Shopify que difiera del sistema." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Diferencias de inventario</caption>
              <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted"><tr><th scope="col" className="px-4 py-2.5 font-semibold">Producto</th><th scope="col" className="px-4 py-2.5 text-right font-semibold">Shopify</th><th scope="col" className="px-4 py-2.5 text-right font-semibold">Sistema</th><th scope="col" className="px-4 py-2.5 text-right font-semibold">Diferencia</th></tr></thead>
              <tbody className="divide-y divide-mc-line-soft">
                {data.data!.differences.map((row) => (
                  <tr key={row.id}><td className="px-4 py-2.5 font-semibold text-mc-ink">{row.name}<span className="block text-xs font-normal text-mc-muted">{row.sku}</span></td><td className="px-4 py-2.5 text-right tabular">{formatNumber(Number(row.shopify_available))}</td><td className="px-4 py-2.5 text-right tabular">{formatNumber(Number(row.system_quantity))}</td><td className="px-4 py-2.5 text-right font-bold tabular text-mc-danger">{formatNumber(Number(row.difference))}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Bitácora de sincronización" description="Últimas 25 corridas: webhooks y sincronizaciones manuales." padding={false} testId="shopify-runs">
        {data.error ? <p className="p-5 text-sm text-mc-danger" role="alert">{data.error}</p> : (data.data?.runs ?? []).length === 0 ? <EmptyState title="Todavía no hay sincronizaciones" description="Aparecerán aquí cuando llegue el primer webhook o se corra una sincronización." /> : (
          <ul className="divide-y divide-mc-line-soft">
            {data.data!.runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="font-semibold text-mc-ink">{ENTITY_LABEL[run.entity] ?? run.entity}</span>
                <StatusBadge status={RUN_TEXT[run.status] ?? run.status} />
                <span className="text-xs text-mc-muted">{formatNumber(run.rows_upserted)} de {formatNumber(run.rows_received)} aplicados · {formatDate(run.started_at, true)} · {run.triggered_by ?? ''}</span>
                {run.error && <span className="basis-full text-xs text-mc-danger">{run.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
