// Deriva el estado de la República a partir de un código postal mexicano.
//
// Usa el rango estándar de los primeros 2 dígitos del CP — funciona para
// CUALQUIER CP de 5 dígitos, sin depender del seed parcial de `mx_postal_codes`
// (que solo cubre ~100 CPs). Es la base del mapa "Paquetes por estado".

export interface EstadoMx {
  /** Código ISO 3166-2. Join key con el GeoJSON (feature.properties.id). */
  iso:    string
  /** Nombre del estado — idéntico al `name` del GeoJSON de estados. */
  nombre: string
}

interface CpRange extends EstadoMx {
  lo: number
  hi: number
}

// Primeros 2 dígitos del CP → estado. Rangos contiguos del estándar mexicano.
// CDMX ocupa 01–16; el Estado de México 50–57 (no se traslapan).
const CP_RANGES: CpRange[] = [
  { lo:  1, hi: 16, iso: 'MX-CMX', nombre: 'Ciudad de México' },
  { lo: 20, hi: 20, iso: 'MX-AGU', nombre: 'Aguascalientes' },
  { lo: 21, hi: 22, iso: 'MX-BCN', nombre: 'Baja California' },
  { lo: 23, hi: 23, iso: 'MX-BCS', nombre: 'Baja California Sur' },
  { lo: 24, hi: 24, iso: 'MX-CAM', nombre: 'Campeche' },
  { lo: 25, hi: 27, iso: 'MX-COA', nombre: 'Coahuila' },
  { lo: 28, hi: 28, iso: 'MX-COL', nombre: 'Colima' },
  { lo: 29, hi: 30, iso: 'MX-CHP', nombre: 'Chiapas' },
  { lo: 31, hi: 33, iso: 'MX-CHH', nombre: 'Chihuahua' },
  { lo: 34, hi: 35, iso: 'MX-DUR', nombre: 'Durango' },
  { lo: 36, hi: 38, iso: 'MX-GUA', nombre: 'Guanajuato' },
  { lo: 39, hi: 41, iso: 'MX-GRO', nombre: 'Guerrero' },
  { lo: 42, hi: 43, iso: 'MX-HID', nombre: 'Hidalgo' },
  { lo: 44, hi: 49, iso: 'MX-JAL', nombre: 'Jalisco' },
  { lo: 50, hi: 57, iso: 'MX-MEX', nombre: 'México' },
  { lo: 58, hi: 61, iso: 'MX-MIC', nombre: 'Michoacán' },
  { lo: 62, hi: 62, iso: 'MX-MOR', nombre: 'Morelos' },
  { lo: 63, hi: 63, iso: 'MX-NAY', nombre: 'Nayarit' },
  { lo: 64, hi: 67, iso: 'MX-NLE', nombre: 'Nuevo León' },
  { lo: 68, hi: 71, iso: 'MX-OAX', nombre: 'Oaxaca' },
  { lo: 72, hi: 75, iso: 'MX-PUE', nombre: 'Puebla' },
  { lo: 76, hi: 76, iso: 'MX-QUE', nombre: 'Querétaro' },
  { lo: 77, hi: 77, iso: 'MX-ROO', nombre: 'Quintana Roo' },
  { lo: 78, hi: 79, iso: 'MX-SLP', nombre: 'San Luis Potosí' },
  { lo: 80, hi: 82, iso: 'MX-SIN', nombre: 'Sinaloa' },
  { lo: 83, hi: 85, iso: 'MX-SON', nombre: 'Sonora' },
  { lo: 86, hi: 86, iso: 'MX-TAB', nombre: 'Tabasco' },
  { lo: 87, hi: 89, iso: 'MX-TAM', nombre: 'Tamaulipas' },
  { lo: 90, hi: 90, iso: 'MX-TLA', nombre: 'Tlaxcala' },
  { lo: 91, hi: 96, iso: 'MX-VER', nombre: 'Veracruz' },
  { lo: 97, hi: 97, iso: 'MX-YUC', nombre: 'Yucatán' },
  { lo: 98, hi: 99, iso: 'MX-ZAC', nombre: 'Zacatecas' },
]

/**
 * Devuelve el estado al que pertenece un CP, o `null` si no se puede resolver
 * (CP vacío, no numérico, o prefijo sin estado asignado: 17–19).
 *
 * Tolera CPs de 4 dígitos: un CP de CDMX guardado como número pierde el cero
 * inicial (p. ej. `06700` → `6700`); se reconstruye con padding a la izquierda.
 */
export function estadoFromCp(cp?: string | null): EstadoMx | null {
  if (!cp) return null
  let digits = String(cp).trim().replace(/\D/g, '')
  if (digits.length === 4) digits = `0${digits}`
  if (digits.length !== 5) return null
  const prefix = parseInt(digits.slice(0, 2), 10)
  if (Number.isNaN(prefix)) return null
  const match = CP_RANGES.find(r => prefix >= r.lo && prefix <= r.hi)
  return match ? { iso: match.iso, nombre: match.nombre } : null
}

/** Los 32 estados (para leyendas, selects o joins completos). */
export const ESTADOS_MX: EstadoMx[] = CP_RANGES.map(({ iso, nombre }) => ({ iso, nombre }))
