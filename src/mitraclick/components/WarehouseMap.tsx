import { useMemo } from 'react'
import { LOCATION_KINDS, type LocationKind } from '../lib/warehouse'
import { formatNumber } from '../lib/format'

export interface MapLocation {
  id: string
  code: string
  zone: string
  position: number | null
  level: number | null
  kind: LocationKind
  units: number
  products: number
  max_units: number | null
  fill_rate: number | null
  active: boolean
}

// Mismos tonos que los de la marca en index.css; el SVG necesita literales.
const EMPTY = '#f6f6f1'
const SERVICE = '#e8e6dd'
const INACTIVE = '#d6d4cc'
const SCALE = ['#dcebe3', '#9fcdb6', '#f0c674', '#d88040', '#b42318']
const STROKE = 'rgba(0,0,0,.18)'

/**
 * Color por ocupación. Sin capacidad capturada no se inventa un porcentaje: solo se
 * distingue vacía de ocupada. Es la diferencia con el mapa del CEDIS, que pintaba una
 * escala a partir de unidades/100 fijo.
 */
function colorFor(location: MapLocation): string {
  if (!location.active) return INACTIVE
  if (location.position === null) return location.units > 0 ? SCALE[1] : SERVICE
  if (location.units <= 0) return EMPTY
  if (location.fill_rate === null) return SCALE[1]
  const rate = Number(location.fill_rate)
  if (rate < 0.35) return SCALE[0]
  if (rate < 0.6) return SCALE[1]
  if (rate < 0.85) return SCALE[2]
  if (rate < 1) return SCALE[3]
  return SCALE[4]
}

function describe(location: MapLocation): string {
  const parts = [location.code, LOCATION_KINDS[location.kind] ?? location.kind]
  if (!location.active) parts.push('inactiva')
  parts.push(location.units > 0 ? `${formatNumber(Number(location.units))} unidades` : 'vacía')
  if (location.fill_rate !== null) parts.push(`${Math.round(Number(location.fill_rate) * 100)}% de su capacidad`)
  return parts.join(' · ')
}

const CELL = 34
const GAP = 4
const LABEL = 46
const HEADER = 22

interface MapProps {
  locations: MapLocation[]
  selected: string | null
  onSelect: (location: MapLocation) => void
}

/**
 * Planta: una fila por zona, una celda por posición. Lo que se ve de frente al entrar.
 * Cuando una posición tiene varios niveles, la celda resume la suma.
 */
export function PlanView({ locations, selected, onSelect }: MapProps) {
  const zones = useMemo(() => {
    const byZone = new Map<string, Map<number, MapLocation[]>>()
    for (const location of locations) {
      if (location.position === null) continue
      const zone = byZone.get(location.zone) ?? new Map<number, MapLocation[]>()
      zone.set(location.position, [...(zone.get(location.position) ?? []), location])
      byZone.set(location.zone, zone)
    }
    return [...byZone.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([zone, positions]) => ({
        zone,
        positions: [...positions.entries()].sort(([a], [b]) => a - b).map(([position, items]) => {
          const units = items.reduce((sum, item) => sum + Number(item.units), 0)
          const capacity = items.reduce((sum, item) => sum + (item.max_units === null ? 0 : Number(item.max_units)), 0)
          const known = items.every((item) => item.max_units !== null)
          // La celda representa toda la columna: se muestra la primera para el clic.
          return {
            position,
            items,
            cell: { ...items[0], units, max_units: known ? capacity : null, fill_rate: known && capacity > 0 ? units / capacity : null } as MapLocation,
          }
        }),
      }))
  }, [locations])

  if (!zones.length) return null
  const columns = Math.max(...zones.map((zone) => zone.positions.length))
  const width = LABEL + columns * (CELL + GAP)
  const height = HEADER + zones.length * (CELL + GAP + 14)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Planta de la bodega por zona y posición">
      {zones.map((zone, row) => {
        const y = HEADER + row * (CELL + GAP + 14)
        return (
          <g key={zone.zone}>
            <text x={0} y={y + CELL / 2 + 4} className="fill-mc-ink text-[13px] font-bold">{zone.zone}</text>
            {zone.positions.map(({ position, items, cell }, index) => {
              const x = LABEL + index * (CELL + GAP)
              const isSelected = items.some((item) => item.id === selected)
              return (
                <g key={position}>
                  <rect
                    x={x} y={y} width={CELL} height={CELL} rx={4}
                    fill={colorFor(cell)}
                    stroke={isSelected ? '#454a49' : STROKE}
                    strokeWidth={isSelected ? 2.5 : 0.75}
                    className="cursor-pointer"
                    onClick={() => onSelect(items[0])}
                  >
                    <title>{`${zone.zone}-${String(position).padStart(2, '0')} · ${items.length} ${items.length === 1 ? 'nivel' : 'niveles'} · ${formatNumber(cell.units)} unidades`}</title>
                  </rect>
                  <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" className="pointer-events-none fill-mc-ink text-[11px] font-semibold tabular">
                    {cell.units > 0 ? formatNumber(cell.units) : ''}
                  </text>
                  <text x={x + CELL / 2} y={y + CELL + 11} textAnchor="middle" className="fill-mc-muted text-[9px] tabular">{position}</text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

/** Elevación: cómo se ve el anaquel de frente. Posición en X, nivel en Y (1 abajo). */
export function ElevationView({ locations, selected, onSelect }: MapProps) {
  const zones = useMemo(() => {
    const byZone = new Map<string, MapLocation[]>()
    for (const location of locations) {
      if (location.position === null || location.level === null) continue
      byZone.set(location.zone, [...(byZone.get(location.zone) ?? []), location])
    }
    return [...byZone.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [locations])

  if (!zones.length) return null

  return (
    <div className="space-y-6">
      {zones.map(([zone, items]) => {
        const positions = [...new Set(items.map((item) => item.position as number))].sort((a, b) => a - b)
        const levels = [...new Set(items.map((item) => item.level as number))].sort((a, b) => b - a)
        const width = LABEL + positions.length * (CELL + GAP)
        const height = HEADER + levels.length * (CELL + GAP)
        const find = (position: number, level: number) => items.find((item) => item.position === position && item.level === level)

        return (
          <div key={zone}>
            <h3 className="mb-2 text-sm font-bold text-mc-ink">Anaquel {zone}</h3>
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Elevación del anaquel ${zone}: posiciones y niveles`}>
              {levels.map((level, row) => {
                const y = row * (CELL + GAP)
                return (
                  <g key={level}>
                    <text x={0} y={y + CELL / 2 + 4} className="fill-mc-muted text-[11px] font-semibold">N{level}</text>
                    {positions.map((position, column) => {
                      const location = find(position, level)
                      const x = LABEL + column * (CELL + GAP)
                      if (!location) return <rect key={position} x={x} y={y} width={CELL} height={CELL} rx={4} fill="none" stroke={STROKE} strokeDasharray="3 3" />
                      return (
                        <g key={position}>
                          <rect
                            x={x} y={y} width={CELL} height={CELL} rx={4}
                            fill={colorFor(location)}
                            stroke={location.id === selected ? '#454a49' : STROKE}
                            strokeWidth={location.id === selected ? 2.5 : 0.75}
                            className="cursor-pointer"
                            onClick={() => onSelect(location)}
                          >
                            <title>{describe(location)}</title>
                          </rect>
                          <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" className="pointer-events-none fill-mc-ink text-[11px] font-semibold tabular">
                            {location.units > 0 ? formatNumber(Number(location.units)) : ''}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )
              })}
              {positions.map((position, column) => (
                <text key={position} x={LABEL + column * (CELL + GAP) + CELL / 2} y={height - 4} textAnchor="middle" className="fill-mc-muted text-[9px] tabular">{position}</text>
              ))}
            </svg>
          </div>
        )
      })}
    </div>
  )
}

/** Leyenda honesta: dice cuándo el color significa ocupación y cuándo solo "tiene algo". */
export function MapLegend({ anyCapacity }: { anyCapacity: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-mc-muted">
      <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border border-mc-line" style={{ background: EMPTY }} aria-hidden="true" />Vacía</span>
      {anyCapacity ? (
        <>
          <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm" style={{ background: SCALE[0] }} aria-hidden="true" />Hasta 35%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm" style={{ background: SCALE[1] }} aria-hidden="true" />35–60%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm" style={{ background: SCALE[2] }} aria-hidden="true" />60–85%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm" style={{ background: SCALE[3] }} aria-hidden="true" />85–100%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm" style={{ background: SCALE[4] }} aria-hidden="true" />Llena</span>
        </>
      ) : (
        <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm" style={{ background: SCALE[1] }} aria-hidden="true" />Con existencia</span>
      )}
      <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm" style={{ background: INACTIVE }} aria-hidden="true" />Inactiva</span>
      {!anyCapacity && <span className="basis-full">El color solo distingue vacía de ocupada: ninguna ubicación tiene capacidad capturada, así que no hay porcentaje que mostrar.</span>}
    </div>
  )
}
