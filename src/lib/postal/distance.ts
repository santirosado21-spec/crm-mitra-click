// Cálculo de distancia entre dos códigos postales.
// Usa la fórmula Haversine sobre lat/lon obtenidos de la tabla mx_postal_codes
// (sembrada con dataset SEPOMEX). Si un CP no está en la tabla devuelve null.

import { supabase } from '../supabase'

export interface PostalCoord {
  cp:        string
  lat:       number
  lon:       number
  estado?:   string | null
  municipio?: string | null
  ciudad?:   string | null
}

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Distancia Haversine en km entre dos coordenadas. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return EARTH_RADIUS_KM * c
}

/** Pequeño cache en memoria para evitar pegarle a la DB en cada cotización. */
const cpCache = new Map<string, PostalCoord | null>()

export async function getCoordForCP(cp: string): Promise<PostalCoord | null> {
  const norm = cp.trim()
  if (!/^\d{5}$/.test(norm)) return null
  if (cpCache.has(norm)) return cpCache.get(norm) ?? null
  const { data } = await supabase
    .from('mx_postal_codes')
    .select('cp, lat, lon, estado, municipio, ciudad')
    .eq('cp', norm)
    .maybeSingle()
  const coord = (data ?? null) as PostalCoord | null
  cpCache.set(norm, coord)
  return coord
}

/**
 * Devuelve la distancia en km entre dos códigos postales mexicanos. Si alguno
 * de los dos no se encuentra en la tabla devuelve `null` y deja al caller
 * decidir el fallback (usar el zone del carrier, asumir local, etc).
 */
export async function distanceBetweenCPs(fromCP: string, toCP: string): Promise<number | null> {
  const [from, to] = await Promise.all([getCoordForCP(fromCP), getCoordForCP(toCP)])
  if (!from || !to) return null
  return Math.round(haversineKm(from, to))
}

/** Helper síncrono cuando ya tenemos las coords (útil en tests). */
export function distanceBetweenCoords(from: PostalCoord, to: PostalCoord): number {
  return Math.round(haversineKm(from, to))
}
