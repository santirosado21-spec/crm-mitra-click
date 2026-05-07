import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { GuiaPaqueteria } from '../types/guias'

export interface PostalCoord {
  cp:        string
  lat:       number
  lon:       number
  estado?:   string | null
  municipio?: string | null
  ciudad?:   string | null
}

export interface ShipmentPosition {
  guia:                GuiaPaqueteria
  from:                PostalCoord | null
  to:                  PostalCoord | null
  current:             { lat: number; lon: number } | null
  /** 0–1 progress along the route. */
  progress:            number
  /** ETA en minutos hasta la entrega estimada (si aplica). */
  etaMinutes:          number | null
  /** True si el shipment está en movimiento simulado. */
  inMotion:            boolean
}

const REFRESH_MS = 15_000   // re-interpolar cada 15 s para animación suave
const DEFAULT_DELIVERY_DAYS = 3

/**
 * Carga shipments + coordenadas de mx_postal_codes y devuelve la posición
 * interpolada de cada paquete.
 *
 * Para 'comprado' / 'en_transito':
 *   progress = (now - comprado_at) / (delivery_days * 24h)
 *   capped a [0, 1]
 *   current = lerp(from, to, progress)
 *
 * Para 'cotizado':         current = from
 * Para 'entregado':        current = to (progress=1)
 * Para 'excepcion'/'devuelto': current = última conocida (lerp del progress)
 */
export function useShipmentPositions(intervalMs: number = REFRESH_MS) {
  const [guias, setGuias] = useState<GuiaPaqueteria[]>([])
  const [coords, setCoords] = useState<Map<string, PostalCoord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, forceTick] = useState(0)

  // Re-renderizar cada N ms para que la interpolación avance.
  useEffect(() => {
    const t = setInterval(() => forceTick(x => x + 1), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])

  // Carga inicial
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setError(null)
      try {
        // 1. Shipments con tracking activo (compradas o más recientes)
        const { data: gData, error: gErr } = await supabase
          .from('guias_paqueteria')
          .select('*')
          .in('tracking_status', ['cotizado', 'comprado', 'en_transito', 'entregado', 'excepcion', 'devuelto'])
          .order('created_at', { ascending: false })
          .limit(500)
        if (gErr) throw gErr
        if (cancelled) return
        const list = (gData ?? []) as GuiaPaqueteria[]
        setGuias(list)

        // 2. CPs únicos para batch lookup
        const cps = new Set<string>()
        for (const g of list) {
          if (g.from_postal_code) cps.add(g.from_postal_code)
          if (g.to_postal_code)   cps.add(g.to_postal_code)
        }
        if (cps.size > 0) {
          const { data: cData } = await supabase
            .from('mx_postal_codes')
            .select('cp, lat, lon, estado, municipio, ciudad')
            .in('cp', Array.from(cps))
          if (cancelled) return
          const m = new Map<string, PostalCoord>()
          for (const c of (cData ?? []) as PostalCoord[]) m.set(c.cp, c)
          setCoords(m)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando posiciones')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Suscripción realtime a cambios en guias_paqueteria — cuando llegue un
  // tracking webhook real, la UI actualiza sin refresh manual.
  useEffect(() => {
    const ch = supabase
      .channel('guias-positions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guias_paqueteria' },
        () => {
          // re-fetch lista (más simple que aplicar cambios incrementales)
          supabase.from('guias_paqueteria').select('*').limit(500).then(({ data }) => {
            if (data) setGuias(data as GuiaPaqueteria[])
          })
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const positions = useMemo<ShipmentPosition[]>(() => {
    const now = Date.now()
    return guias.map(g => {
      const from = g.from_postal_code ? coords.get(g.from_postal_code) ?? null : null
      const to   = g.to_postal_code   ? coords.get(g.to_postal_code)   ?? null : null

      let progress = 0
      if (g.tracking_status === 'entregado') progress = 1
      else if (g.tracking_status === 'comprado' || g.tracking_status === 'en_transito') {
        // Buscar timestamp de compra (created_at sirve si no hay otro dato)
        const t0 = new Date(g.created_at).getTime()
        const elapsedH = (now - t0) / (1000 * 60 * 60)
        const totalH = DEFAULT_DELIVERY_DAYS * 24
        progress = Math.max(0, Math.min(1, elapsedH / totalH))
      } else if (g.tracking_status === 'cotizado') {
        progress = 0
      } else if (g.tracking_status === 'excepcion' || g.tracking_status === 'devuelto') {
        // Mantener última posición conocida (mid-route por default)
        progress = 0.5
      }

      let current: { lat: number; lon: number } | null = null
      if (from && to) {
        current = {
          lat: from.lat + (to.lat - from.lat) * progress,
          lon: from.lon + (to.lon - from.lon) * progress,
        }
      } else if (from) {
        current = { lat: from.lat, lon: from.lon }
      } else if (to) {
        current = { lat: to.lat, lon: to.lon }
      }

      const etaMinutes = (g.tracking_status === 'comprado' || g.tracking_status === 'en_transito') && progress < 1
        ? Math.round((1 - progress) * DEFAULT_DELIVERY_DAYS * 24 * 60)
        : null

      return {
        guia:     g,
        from,
        to,
        current,
        progress,
        etaMinutes,
        inMotion: g.tracking_status === 'comprado' || g.tracking_status === 'en_transito',
      }
    })
  }, [guias, coords])

  return { positions, loading, error }
}
