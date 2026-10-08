// Layout de la bodega y recorrido de surtido. Funciones puras: la base vuelve a validar
// todo y es la que genera las ubicaciones de verdad.
//
// Una ubicación se nombra `ZONA-POSICIÓN-NIVEL` (A-01-1: anaquel A, posición 1, nivel 1).
// Las zonas de servicio (recepción, embarque) no tienen posición ni nivel: su código es
// el nombre de la zona. No se guardan coordenadas: la posición en el mapa se deriva de
// (zona, posición, nivel), como en el mapa del CEDIS, que en eso acertaba.

export type LocationKind = 'almacenaje' | 'picking' | 'recepcion' | 'embarque' | 'devoluciones' | 'cuarentena'

export const LOCATION_KINDS: Record<LocationKind, string> = {
  almacenaje: 'Almacenaje',
  picking: 'Picking',
  recepcion: 'Recepción',
  embarque: 'Embarque',
  devoluciones: 'Devoluciones',
  cuarentena: 'Cuarentena',
}

/** Las zonas sin posición se ordenan a partir de aquí, por encima de cualquier anaquel. */
const SERVICE_ZONE_BASE = 1_000_000_000

const round3 = (value: number) => Math.round(value * 1000) / 1000
const normalizeZone = (zone: string) => zone.trim().toUpperCase()

/** `A-01-1`. Sin posición ni nivel, el código es la zona (RECEPCION, EMBARQUE…). */
export function locationCode(zone: string, position?: number | null, level?: number | null): string {
  const clean = normalizeZone(zone)
  if (position === null || position === undefined || level === null || level === undefined) return clean
  return `${clean}-${String(position).padStart(2, '0')}-${level}`
}

export interface ParsedLocation {
  zone: string
  position: number | null
  level: number | null
}

/** Lee un código de ubicación. Devuelve null si no tiene la forma esperada. */
export function parseLocationCode(code: string): ParsedLocation | null {
  const clean = code.trim().toUpperCase()
  if (!clean) return null
  const parts = clean.split('-')
  if (parts.length === 1) return { zone: parts[0], position: null, level: null }
  if (parts.length !== 3) return null
  const [zone, position, level] = parts
  if (!zone || !/^\d+$/.test(position) || !/^\d+$/.test(level)) return null
  return { zone, position: Number(position), level: Number(level) }
}

/**
 * Orden de recorrido: zona por zona, dentro de cada zona avanzando por posición y
 * tomando primero el nivel bajo (lo que está a la mano). Las zonas de servicio van al
 * final para que el surtido termine en embarque.
 *
 * El valor cabe en un `integer` de Postgres, que es el tipo de `locations.pick_order`.
 * De ahí los límites: la zona se distingue por sus primeros 3 caracteres, la posición
 * llega a 999 y el nivel a 9. Suficiente para una bodega; si algún día no lo fuera,
 * hay que ampliar la columna a bigint y esta función a la vez.
 */
export const MAX_POSITION = 999
export const MAX_LEVEL = 9

/** '0'–'9' → 1..10, 'A'–'Z' → 11..36, lo demás → 0. Base 37. */
function charRank(char: string): number {
  const code = char.charCodeAt(0)
  if (code >= 48 && code <= 57) return code - 47
  if (code >= 65 && code <= 90) return code - 54
  return 0
}

export function pickOrder(zone: string, position?: number | null, level?: number | null): number {
  const clean = normalizeZone(zone).padEnd(3, ' ').slice(0, 3)
  // Peso de la zona: máximo 36·37² + 36·37 + 36 = 50 652.
  const zoneWeight = charRank(clean[0]) * 1369 + charRank(clean[1]) * 37 + charRank(clean[2])
  // Zonas de servicio, después de cualquier anaquel (el máximo normal es ~5.1e8).
  if (position === null || position === undefined || level === null || level === undefined) {
    return SERVICE_ZONE_BASE + zoneWeight
  }
  return zoneWeight * 10_000 + position * 10 + level
}

export interface ZonePlan {
  zone: string
  /** 0 en una zona de servicio: genera una sola ubicación. */
  positions: number
  levels: number
  /** Tipo de las ubicaciones. En un anaquel, el nivel 1 se marca como picking de todos modos. */
  kind?: LocationKind
  description?: string
}

export interface PlannedLocation {
  code: string
  zone: string
  position: number | null
  level: number | null
  kind: LocationKind
  pick_order: number
  description: string | null
}

/** Bodega chica estándar: tres anaqueles de 8 × 4 más las cuatro zonas de servicio. */
export const SMALL_WAREHOUSE: ZonePlan[] = [
  { zone: 'A', positions: 8, levels: 4, description: 'Anaquel A' },
  { zone: 'B', positions: 8, levels: 4, description: 'Anaquel B' },
  { zone: 'C', positions: 8, levels: 4, description: 'Anaquel C' },
  { zone: 'RECEPCION', positions: 0, levels: 0, kind: 'recepcion', description: 'Mercancía recibida, antes de acomodar' },
  { zone: 'EMBARQUE', positions: 0, levels: 0, kind: 'embarque', description: 'Pedidos surtidos esperando salida' },
  { zone: 'DEVOLUCIONES', positions: 0, levels: 0, kind: 'devoluciones', description: 'Producto devuelto por revisar' },
  { zone: 'CUARENTENA', positions: 0, levels: 0, kind: 'cuarentena', description: 'Producto dañado, fuera de lo vendible' },
]

const MAX_PER_ZONE = 500

/** Convierte el plan de zonas en las ubicaciones concretas que se van a crear. */
export function planLayout(zones: ZonePlan[]): PlannedLocation[] {
  const rows: PlannedLocation[] = []
  for (const plan of zones) {
    const zone = normalizeZone(plan.zone)
    const description = plan.description?.trim() || null
    if (plan.positions <= 0 || plan.levels <= 0) {
      rows.push({ code: zone, zone, position: null, level: null, kind: plan.kind ?? 'almacenaje', pick_order: pickOrder(zone), description })
      continue
    }
    for (let position = 1; position <= plan.positions; position += 1) {
      for (let level = 1; level <= plan.levels; level += 1) {
        rows.push({
          code: locationCode(zone, position, level),
          zone,
          position,
          level,
          // El nivel 1 es lo que se alcanza con la mano: ahí se hace picking.
          kind: plan.kind ?? (level === 1 ? 'picking' : 'almacenaje'),
          pick_order: pickOrder(zone, position, level),
          description,
        })
      }
    }
  }
  return rows
}

/** Problemas del plan antes de crear nada. Lista vacía si se puede generar. */
export function validateLayout(zones: ZonePlan[]): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  zones.forEach((plan, index) => {
    const zone = normalizeZone(plan.zone)
    if (!zone) {
      errors.push(`Zona ${index + 1}: escribe el nombre.`)
      return
    }
    if (seen.has(zone)) {
      errors.push(`Zona ${index + 1}: "${zone}" está repetida.`)
      return
    }
    seen.add(zone)
    if (plan.positions < 0 || plan.levels < 0) {
      errors.push(`Zona ${zone}: las posiciones y los niveles no pueden ser negativos.`)
      return
    }
    if (plan.positions > MAX_POSITION || plan.levels > MAX_LEVEL) {
      errors.push(`Zona ${zone}: el máximo son ${MAX_POSITION} posiciones y ${MAX_LEVEL} niveles.`)
      return
    }
    const total = plan.positions * plan.levels
    if (total > MAX_PER_ZONE) {
      errors.push(`Zona ${zone}: ${total.toLocaleString('es-MX')} ubicaciones es demasiado para una zona; el máximo son ${MAX_PER_ZONE}.`)
    }
  })
  return errors
}

/** Resumen en una línea de lo que se va a crear, para confirmar antes de generar. */
export function describeLayout(zones: ZonePlan[]): string {
  if (!zones.length) return 'Sin zonas: no se creará ninguna ubicación.'
  const total = planLayout(zones).length
  const parts = zones.map((plan) => {
    const zone = normalizeZone(plan.zone)
    return plan.positions > 0 && plan.levels > 0 ? `${zone} (${plan.positions} × ${plan.levels})` : zone
  })
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
  return `${total.toLocaleString('es-MX')} ubicaciones: ${list}.`
}

export interface StockAtLocation {
  locationId: string
  code: string
  pick_order: number
  quantity: number
}

export interface PickAllocation {
  lines: StockAtLocation[]
  /** Lo que no se pudo cubrir con la existencia registrada. */
  missing: number
}

/**
 * Reparte lo que hay que surtir entre las ubicaciones con existencia, empezando por la
 * más cercana al inicio del recorrido. No inventa existencia: lo que falta se reporta.
 */
export function allocatePick(stock: StockAtLocation[], required: number): PickAllocation {
  const lines: StockAtLocation[] = []
  let pending = round3(required)
  const available = stock.filter((item) => item.quantity > 0).sort((a, b) => a.pick_order - b.pick_order)

  for (const item of available) {
    if (pending <= 0) break
    const take = round3(Math.min(item.quantity, pending))
    lines.push({ ...item, quantity: take })
    pending = round3(pending - take)
  }
  return { lines, missing: Math.max(0, pending) }
}
