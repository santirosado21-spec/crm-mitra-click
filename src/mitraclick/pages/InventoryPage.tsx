import { useState } from 'react'
import { AlertTriangle, Boxes, Plus, Search, TrendingDown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { Button, Select, TextInput } from '../components/Controls'
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge } from '../components/Primitives'
import { MovementForm } from '../components/StockForms'
import { selectRows } from '../lib/crud'
import { formatDate, formatNumber } from '../lib/format'
import { useQuery } from '../lib/useQuery'

interface LevelRow {
  product_id: string
  location_id: string
  quantity: number
  updated_at: string
  product: { sku: string; name: string; unit: string; reorder_point: number } | null
  location: { code: string } | null
}

type Estado = '' | 'bajo' | 'negativo'
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function InventoryPage() {
  const { can } = useSession()
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(false)
  const search = params.get('q') ?? ''
  const location = params.get('ubicacion') ?? ''
  const estado = (params.get('estado') ?? '') as Estado
  const query = useQuery('stock-levels', () =>
    selectRows<LevelRow>('stock_levels', 'product_id,location_id,quantity,updated_at,product:products(sku,name,unit,reorder_point),location:locations(code)', { limit: 2000 }),
  )

  const setParam = (key: string, value: string) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  const all = (query.data ?? []).map((row) => ({ ...row, quantity: Number(row.quantity) }))
  // El punto de reorden es por producto: se compara contra el total en todas las ubicaciones.
  const totals = new Map<string, number>()
  for (const row of all) totals.set(row.product_id, (totals.get(row.product_id) ?? 0) + row.quantity)
  const isLow = (row: LevelRow) => (totals.get(row.product_id) ?? 0) <= Number(row.product?.reorder_point ?? 0)

  const locations = [...new Map(all.map((row) => [row.location_id, row.location?.code ?? '—'])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  const term = fold(search.trim())
  const rows = all
    .filter((row) => !location || row.location_id === location)
    .filter((row) => !term || fold(`${row.product?.name ?? ''} ${row.product?.sku ?? ''}`).includes(term))
    .filter((row) => (estado === 'negativo' ? row.quantity < 0 : estado === 'bajo' ? isLow(row) : true))
    .sort((a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? '') || (a.location?.code ?? '').localeCompare(b.location?.code ?? ''))

  const lowProducts = [...totals.keys()].filter((id) => {
    const row = all.find((item) => item.product_id === id)
    return row ? isLow(row) : false
  }).length
  const negative = all.filter((row) => row.quantity < 0).length
  const status = (row: LevelRow) => (row.quantity < 0 ? <StatusBadge status="Negativo" /> : isLow(row) ? <StatusBadge status="Bajo" /> : <StatusBadge status="Suficiente" />)
  // Si la consulta falló, estos totales son 0 por falta de renglones, no porque la bodega
  // esté vacía. Las tarjetas lo dicen en vez de afirmar un cero.
  const unknown = query.error !== null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Bodega"
        title="Inventario"
        description="Existencia por producto y ubicación. No se captura aquí: es la suma del libro de movimientos."
        actions={can(['direccion', 'admin', 'almacen', 'logistica', 'compras']) ? <Button onClick={() => setAdding(true)} data-testid="new-movement"><Plus size={16} aria-hidden="true" />Registrar movimiento</Button> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Productos con existencia registrada" value={formatNumber(totals.size)} unknown={unknown} icon={Boxes} testId="kpi-productos" />
        <KpiCard label="En o bajo punto de reorden" value={formatNumber(lowProducts)} unknown={unknown} icon={TrendingDown} testId="kpi-bajo" />
        <KpiCard label="Ubicaciones en negativo" value={formatNumber(negative)} unknown={unknown} icon={AlertTriangle} testId="kpi-negativo" />
      </div>

      <Panel padding={false} testId="inventory-table">
        <div className="flex flex-col gap-3 border-b border-mc-line-soft p-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mc-gray-400" aria-hidden="true" />
            <TextInput type="search" aria-label="Buscar producto" placeholder="Buscar por nombre o SKU…" value={search} onChange={(event) => setParam('q', event.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Ubicación" className="lg:!w-auto" value={location} onChange={(event) => setParam('ubicacion', event.target.value)}>
            <option value="">Ubicación: todas</option>
            {locations.map(([id, code]) => <option key={id} value={id}>{code}</option>)}
          </Select>
          <Select aria-label="Estado" className="lg:!w-auto" value={estado} onChange={(event) => setParam('estado', event.target.value)}>
            <option value="">Estado: todos</option>
            <option value="bajo">En o bajo punto de reorden</option>
            <option value="negativo">En negativo</option>
          </Select>
          <p className="text-xs text-mc-muted tabular lg:ml-auto" data-testid="result-count" aria-live="polite">{query.loading ? 'Cargando…' : `${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}`}</p>
        </div>

        {query.error ? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm font-semibold text-mc-danger">{query.error}</p>
            <Button variant="outline" className="mt-3" onClick={query.reload}>Reintentar</Button>
          </div>
        ) : !query.loading && rows.length === 0 ? (
          <EmptyState title={all.length ? 'Sin resultados' : 'Todavía no hay existencias'} description={all.length ? 'Prueba con otros filtros.' : 'La existencia aparece al registrar la primera entrada de un producto.'} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Existencia por producto y ubicación</caption>
                <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Producto</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">SKU</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Ubicación</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Existencia</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Punto de reorden</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Estado</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Último movimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mc-line-soft">
                  {rows.map((row) => (
                    <tr key={`${row.product_id}-${row.location_id}`} data-testid={`level-${row.product?.sku ?? row.product_id}-${row.location?.code ?? row.location_id}`}>
                      <td className="px-4 py-2.5 font-semibold text-mc-ink">{row.product?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-mc-gray-700">{row.product?.sku ?? '—'}</td>
                      <td className="px-4 py-2.5 text-mc-gray-700">{row.location?.code ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular text-mc-ink">{formatNumber(row.quantity)} <span className="font-normal text-mc-muted">{row.product?.unit}</span></td>
                      <td className="px-4 py-2.5 text-right tabular text-mc-gray-700">{formatNumber(Number(row.product?.reorder_point ?? 0))}</td>
                      <td className="px-4 py-2.5">{status(row)}</td>
                      <td className="px-4 py-2.5 text-mc-muted">{formatDate(row.updated_at, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-mc-line-soft md:hidden">
              {rows.map((row) => (
                <li key={`${row.product_id}-${row.location_id}`} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-mc-ink">{row.product?.name ?? '—'}</p>
                    <p className="mt-0.5 text-xs text-mc-muted">{row.product?.sku} · {row.location?.code}</p>
                    <div className="mt-1.5">{status(row)}</div>
                  </div>
                  <p className="shrink-0 text-right text-lg font-extrabold tabular text-mc-ink">{formatNumber(row.quantity)}<span className="block text-[11px] font-normal text-mc-muted">{row.product?.unit}</span></p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {adding && <MovementForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); query.reload() }} />}
    </div>
  )
}
