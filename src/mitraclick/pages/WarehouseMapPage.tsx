import { useState } from 'react'
import { ExternalLink, Tag } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Select } from '../components/Controls'
import { RecordDrawer } from '../components/RecordDrawer'
import { EmptyState, PageHeader, Panel, StatusBadge } from '../components/Primitives'
import { ElevationView, MapLegend, PlanView, type MapLocation } from '../components/WarehouseMap'
import { ViewTabs } from '../components/ViewTabs'
import { selectRows } from '../lib/crud'
import { formatNumber, formatRatio } from '../lib/format'
import { LOCATION_KINDS, type LocationKind } from '../lib/warehouse'
import { useQuery } from '../lib/useQuery'
import { useView } from '../lib/useView'

interface Content {
  product: { sku: string; name: string } | null
  quantity: number
}

const VIEWS: { key: 'planta' | 'elevacion'; label: string }[] = [
  { key: 'planta', label: 'Planta' },
  { key: 'elevacion', label: 'Elevación' },
]

/** Qué hay dentro de una ubicación, al hacer clic en el mapa. */
function LocationDrawer({ location, onClose }: { location: MapLocation; onClose: () => void }) {
  const query = useQuery(`location-contents|${location.id}`, () =>
    selectRows<Content>('stock_levels', 'quantity,product:products(sku,name)', { filters: { location_id: location.id }, limit: 200 }),
  )
  const rows = (query.data ?? []).filter((row) => Number(row.quantity) !== 0)

  return (
    <RecordDrawer open title={location.code} subtitle={`${LOCATION_KINDS[location.kind] ?? location.kind}${location.active ? '' : ' · inactiva'}`} onClose={onClose}>
      <dl className="mb-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-mc-muted">Zona</dt><dd className="font-semibold text-mc-ink">{location.zone}</dd></div>
        <div><dt className="text-xs text-mc-muted">Posición y nivel</dt><dd className="font-semibold text-mc-ink">{location.position === null ? 'Zona suelta' : `${location.position} · nivel ${location.level}`}</dd></div>
        <div><dt className="text-xs text-mc-muted">Unidades</dt><dd className="font-semibold tabular text-mc-ink">{formatNumber(Number(location.units))}</dd></div>
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-xs text-mc-muted">Qué tan llena</dt>
          <dd className="font-semibold text-mc-ink">
            {location.fill_rate === null
              ? <span className="font-normal text-mc-muted">Sin capacidad capturada; captúrala en la ubicación para ver el porcentaje.</span>
              : `${formatRatio(Number(location.fill_rate))} de ${formatNumber(Number(location.max_units))} unidades`}
          </dd>
        </div>
      </dl>

      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-muted">Qué hay aquí</h3>
      {query.error ? (
        <p className="text-sm text-mc-danger" role="alert">{query.error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-mc-muted">{query.loading ? 'Cargando…' : 'Ubicación vacía.'}</p>
      ) : (
        <ul className="divide-y divide-mc-line-soft rounded-xl border border-mc-line-soft">
          {rows.map((row, index) => (
            <li key={index} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0"><span className="block truncate font-semibold text-mc-ink">{row.product?.name ?? '—'}</span><span className="block text-xs text-mc-muted">{row.product?.sku}</span></span>
              <span className="shrink-0 font-bold tabular text-mc-ink">{formatNumber(Number(row.quantity))}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={`/movimientos?q=${encodeURIComponent(location.code)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-mc-line bg-mc-surface px-3 text-sm font-semibold text-mc-ink hover:border-mc-charcoal"><ExternalLink size={15} aria-hidden="true" />Movimientos</Link>
        <Link to={`/ubicaciones?q=${encodeURIComponent(location.code)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-mc-line bg-mc-surface px-3 text-sm font-semibold text-mc-ink hover:border-mc-charcoal"><Tag size={15} aria-hidden="true" />Editar ubicación</Link>
      </div>
    </RecordDrawer>
  )
}

export function WarehouseMapPage() {
  const view = useView(VIEWS)
  const [params, setParams] = useSearchParams()
  const warehouse = params.get('almacen') ?? ''
  const [selected, setSelected] = useState<MapLocation | null>(null)

  const warehouses = useQuery('map-warehouses', () => selectRows<{ id: string; name: string }>('warehouses', 'id,name', { filters: { active: true }, orderBy: { column: 'name' } }))
  const query = useQuery(`map|${warehouse}`, () =>
    selectRows<MapLocation>('location_contents', 'id,code,zone,position,level,kind,units,products,max_units,fill_rate,active', {
      filters: warehouse ? { warehouse_id: warehouse } : undefined,
      orderBy: { column: 'pick_order' },
      limit: 2000,
    }),
  )

  const locations = query.data ?? []
  const racks = locations.filter((location) => location.position !== null)
  const service = locations.filter((location) => location.position === null)
  const anyCapacity = locations.some((location) => location.max_units !== null)
  const occupied = locations.filter((location) => Number(location.units) > 0).length

  return (
    <div className={`space-y-5 ${query.loading ? 'opacity-70' : ''}`}>
      <PageHeader
        eyebrow="Bodega"
        title="Mapa de la bodega"
        description={locations.length ? `${formatNumber(locations.length)} ubicaciones · ${formatNumber(occupied)} con existencia. El color sale del libro de movimientos; haz clic para ver qué hay.` : 'El mapa se dibuja a partir de las ubicaciones: zona, posición y nivel.'}
        actions={
          (warehouses.data ?? []).length > 1 ? (
            <Select aria-label="Almacén" className="!w-auto" value={warehouse} onChange={(event) => setParams((previous) => { const next = new URLSearchParams(previous); if (event.target.value) next.set('almacen', event.target.value); else next.delete('almacen'); return next }, { replace: true })}>
              <option value="">Todos los almacenes</option>
              {(warehouses.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          ) : undefined
        }
      />

      {query.error ? (
        <p className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft px-4 py-3 text-sm font-semibold text-mc-danger" role="alert">{query.error}</p>
      ) : racks.length === 0 ? (
        <Panel>
          <EmptyState
            title={query.loading ? 'Cargando…' : 'Todavía no hay anaqueles que dibujar'}
            description="Crea el layout en Ubicaciones y etiquetas → Generar ubicaciones. Con la plantilla de bodega chica quedan tres anaqueles y las zonas de servicio en un paso."
          />
        </Panel>
      ) : (
        <>
          <ViewTabs options={VIEWS} current={view} label="Vista del mapa" />
          <Panel testId="warehouse-map">
            {view === 'planta' ? (
              <PlanView locations={racks} selected={selected?.id ?? null} onSelect={setSelected} />
            ) : (
              <ElevationView locations={racks} selected={selected?.id ?? null} onSelect={setSelected} />
            )}
            <div className="mt-5 border-t border-mc-line-soft pt-4">
              <MapLegend anyCapacity={anyCapacity} />
              <p className="mt-2 text-xs leading-5 text-mc-muted">
                {view === 'planta'
                  ? 'Planta: una fila por zona y una celda por posición; el número es la suma de sus niveles.'
                  : 'Elevación: el anaquel visto de frente. El nivel 1 es el piso, abajo.'}
              </p>
            </div>
          </Panel>
        </>
      )}

      {service.length > 0 && (
        <Panel title="Zonas de servicio" description="Sin posición ni nivel: recepción, embarque y lo que no es anaquel." padding={false} testId="service-zones">
          <ul className="divide-y divide-mc-line-soft">
            {service.map((location) => (
              <li key={location.id}>
                <button type="button" onClick={() => setSelected(location)} className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-mc-surface-2">
                  <span className="w-36 shrink-0 font-semibold text-mc-ink">{location.code}</span>
                  <span className="min-w-0 flex-1"><StatusBadge status={LOCATION_KINDS[location.kind as LocationKind] ?? location.kind} /></span>
                  <span className="shrink-0 tabular text-mc-ink">{Number(location.units) > 0 ? `${formatNumber(Number(location.units))} unidades` : 'Vacía'}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {selected && <LocationDrawer location={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
