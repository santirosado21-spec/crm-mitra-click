import { useState } from 'react'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ClipboardList, Home, PackageSearch } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import type { AppRole } from '../auth/roles'
import { CountForm, IncidentForm, MovementForm, type StockPreset } from '../components/StockForms'
import { selectRows } from '../lib/crud'
import { formatNumber } from '../lib/format'
import { useQuery } from '../lib/useQuery'

interface TagRow {
  id: string
  code: string
  label: string | null
  active: boolean
  product: { id: string; sku: string; name: string; unit: string; photo_url: string | null; family: { name: string } | null } | null
  location: { id: string; code: string; description: string | null } | null
}

interface LevelRow {
  quantity: number
  product: { id: string; sku: string; name: string } | null
  location: { id: string; code: string } | null
}

type Action = 'entrada' | 'salida' | 'conteo' | 'incidencia'

const ACTIONS: { key: Action; label: string; icon: LucideIcon; roles: AppRole[]; className: string }[] = [
  { key: 'entrada', label: 'Entrada', icon: ArrowDownToLine, roles: ['direccion', 'admin', 'almacen', 'logistica', 'compras'], className: 'bg-mc-charcoal text-white' },
  { key: 'salida', label: 'Salida', icon: ArrowUpFromLine, roles: ['direccion', 'admin', 'almacen', 'logistica', 'compras'], className: 'bg-mc-yellow text-mc-ink' },
  { key: 'conteo', label: 'Conteo', icon: ClipboardList, roles: ['direccion', 'admin', 'almacen'], className: 'border border-mc-line bg-white text-mc-ink' },
  { key: 'incidencia', label: 'Incidencia', icon: AlertTriangle, roles: ['direccion', 'admin', 'almacen', 'logistica'], className: 'border border-mc-line bg-white text-mc-ink' },
]

function Message({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-2xl border border-mc-line bg-mc-surface p-6 text-center shadow-mc-card" role="alert">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mc-warning-soft text-mc-warning"><PackageSearch size={22} aria-hidden="true" /></span>
      <h1 className="mt-4 text-lg font-extrabold text-mc-ink">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-mc-muted">{children}</p>
    </div>
  )
}

/** Ficha que abre una etiqueta NFC/QR. Pensada para usarse de pie, con una mano, en el teléfono. */
export function TagPage() {
  const { codigo = '' } = useParams()
  const { can } = useSession()
  const [action, setAction] = useState<Action | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const tag = useQuery(`tag|${codigo}`, async () => {
    const rows = await selectRows<TagRow>('tags', 'id,code,label,active,product:products(id,sku,name,unit,photo_url,family:product_families(name)),location:locations(id,code,description)', { filters: { code: codigo }, limit: 1 })
    return rows[0] ?? null
  })
  const productId = tag.data?.product?.id ?? ''
  const locationId = tag.data?.location?.id ?? ''
  const levels = useQuery(`tag-levels|${productId}|${locationId}`, async () => {
    if (!productId && !locationId) return []
    // Con producto: su existencia en todas las ubicaciones. Solo ubicación: todo lo que hay ahí.
    return selectRows<LevelRow>('stock_levels', 'quantity,product:products(id,sku,name),location:locations(id,code)', { filters: productId ? { product_id: productId } : { location_id: locationId }, limit: 200 })
  })

  const shell = (content: React.ReactNode) => (
    <div className="min-h-dvh bg-mc-bg text-mc-ink">
      <header className="flex h-14 items-center justify-between border-b border-mc-line bg-mc-surface px-4">
        <img src="/mitraclick-mark.svg" alt="Mitra Click" className="h-8 w-8" />
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-mc-muted hover:text-mc-ink"><Home size={16} aria-hidden="true" />Ir al sistema</Link>
      </header>
      <main className="mx-auto w-full max-w-md space-y-4 p-4">{content}</main>
    </div>
  )

  if (tag.loading) return shell(<p className="py-10 text-center text-sm text-mc-muted" role="status">Buscando la etiqueta…</p>)
  if (tag.error) return shell(<Message title="No se pudo abrir la etiqueta">{tag.error}</Message>)
  if (!tag.data) return shell(<Message title="Etiqueta no reconocida">Este código no está registrado. Avisa a quien administra la bodega.</Message>)
  if (!tag.data.active) return shell(<Message title="Etiqueta desactivada">Esta etiqueta se dio de baja. Avisa a quien administra la bodega para reemplazarla.</Message>)

  const { product, location } = tag.data
  const rows = (levels.data ?? []).map((row) => ({ ...row, quantity: Number(row.quantity) }))
  const total = rows.reduce((sum, row) => sum + row.quantity, 0)
  const preset: StockPreset = { productId: product?.id, locationId: location?.id }
  const allowed = ACTIONS.filter((item) => can(item.roles))
  const finish = (text: string) => {
    setAction(null)
    setDone(text)
    levels.reload()
  }

  return shell(
    <>
      <section className="overflow-hidden rounded-2xl border border-mc-line bg-mc-surface shadow-mc-card" data-testid="tag-card">
        {product?.photo_url && <img src={product.photo_url} alt="" className="h-48 w-full bg-white object-contain" />}
        <div className="p-4">
          <p className="text-xs font-semibold text-mc-yellow-ink">{product ? product.family?.name ?? 'Sin familia' : 'Ubicación'}</p>
          <h1 className="mt-0.5 text-xl font-extrabold leading-tight text-mc-ink">{product ? product.name : location?.code}</h1>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {product && <div><dt className="text-xs text-mc-muted">SKU</dt><dd className="font-semibold text-mc-ink">{product.sku}</dd></div>}
            {location && <div><dt className="text-xs text-mc-muted">{product ? 'Ubicación habitual' : 'Descripción'}</dt><dd className="font-semibold text-mc-ink">{product ? location.code : location.description ?? '—'}</dd></div>}
            {product && (
              <div className="col-span-2 rounded-xl bg-mc-surface-2 p-3">
                <dt className="text-xs text-mc-muted">Existencia registrada</dt>
                <dd className="text-3xl font-extrabold tabular text-mc-ink" data-testid="tag-stock">{levels.loading ? '…' : formatNumber(total)} <span className="text-sm font-normal text-mc-muted">{product.unit}</span></dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {done && <p className="rounded-xl border border-mc-success/30 bg-mc-success-soft px-4 py-3 text-sm font-semibold text-mc-ink" role="status" data-testid="tag-done">{done}</p>}

      {allowed.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {allowed.map((item) => (
            <button key={item.key} type="button" onClick={() => { setDone(null); setAction(item.key) }} className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl text-base font-extrabold ${item.className}`} data-testid={`tag-action-${item.key}`}>
              <item.icon size={24} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-mc-line bg-mc-surface px-4 py-3 text-sm text-mc-muted">Tu rol puede consultar esta ficha, pero no registrar movimientos de bodega.</p>
      )}

      {rows.length > 0 && (
        <section className="rounded-2xl border border-mc-line bg-mc-surface shadow-mc-card">
          <h2 className="border-b border-mc-line-soft px-4 py-3 text-sm font-bold text-mc-ink">{product ? 'Por ubicación' : 'Productos en esta ubicación'}</h2>
          <ul className="divide-y divide-mc-line-soft">
            {rows.map((row, index) => (
              <li key={index} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate text-mc-gray-700">{product ? row.location?.code : `${row.product?.name ?? '—'} · ${row.product?.sku ?? ''}`}</span>
                <span className="shrink-0 font-bold tabular text-mc-ink">{formatNumber(row.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(action === 'entrada' || action === 'salida') && <MovementForm type={action} preset={preset} onClose={() => setAction(null)} onSaved={() => finish(action === 'entrada' ? 'Entrada registrada.' : 'Salida registrada.')} />}
      {action === 'conteo' && <CountForm preset={preset} onClose={() => setAction(null)} onSaved={() => finish('Conteo guardado. Si hubo diferencia, quedó pendiente de revisión.')} />}
      {action === 'incidencia' && <IncidentForm preset={preset} onClose={() => setAction(null)} onSaved={() => finish('Incidencia reportada.')} />}
    </>,
  )
}
