import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Spinner } from '../ui/Spinner'

// Valor agregado por estado. `iso` debe ser el ISO 3166-2 (MX-XXX) — el mismo
// que `feature.properties.id` del GeoJSON `public/geo/mexico-estados.json`.
export interface EstadoValue {
  iso:    string
  nombre: string
  value:  number
}

interface Props {
  title:      string
  data:       EstadoValue[]
  height?:    number
  className?: string
}

// Escala secuencial navy: claro = pocos paquetes, navy oscuro = muchos.
const SCALE = ['#dbe4ee', '#9db4cd', '#5d7fa3', '#2d4a73', '#1e3a5f']
const EMPTY_FILL = '#eef1f5'
const GEO_URL = '/geo/mexico-estados.json'

function colorFor(value: number, max: number): string {
  if (value <= 0 || max <= 0) return EMPTY_FILL
  const idx = Math.min(SCALE.length - 1, Math.floor((value / max) * SCALE.length))
  return SCALE[idx]
}

/**
 * Mapa coroplético de los 32 estados de México. Pinta cada estado según el
 * volumen de paquetes (`data`). Estático (sin zoom/drag) — pensado como panel
 * de dashboard. Tooltip por estado al pasar el cursor.
 */
export function MexicoChoropleth({ title, data, height = 300, className = '' }: Props) {
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const geoLayerRef    = useRef<L.GeoJSON | null>(null)
  const [layerReady, setLayerReady] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // Inicializa el mapa y carga el GeoJSON una sola vez.
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current, {
      zoomControl:        false,
      attributionControl: false,
      scrollWheelZoom:    false,
      doubleClickZoom:    false,
      dragging:           false,
      boxZoom:            false,
      keyboard:           false,
      touchZoom:          false,
    })
    mapInstanceRef.current = map

    let cancelled = false
    fetch(GEO_URL)
      .then(r => { if (!r.ok) throw new Error('geojson'); return r.json() })
      .then((geo: GeoJSON.GeoJsonObject) => {
        if (cancelled || !mapInstanceRef.current) return
        const layer = L.geoJSON(geo, {
          style: () => ({ weight: 1, color: '#ffffff', fillColor: EMPTY_FILL, fillOpacity: 1 }),
        }).addTo(map)
        geoLayerRef.current = layer
        map.invalidateSize()
        map.fitBounds(layer.getBounds(), { padding: [6, 6] })
        setLayerReady(true)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('No se pudo cargar el mapa de México'); setLoading(false) }
      })

    return () => {
      cancelled = true
      map.remove()
      mapInstanceRef.current = null
      geoLayerRef.current = null
      setLayerReady(false)
    }
  }, [])

  // Recolorea y re-vincula tooltips cada vez que cambian los datos o se
  // termina de cargar la capa (filtros del dashboard).
  useEffect(() => {
    const layer = geoLayerRef.current
    if (!layer || !layerReady) return
    const byIso = new Map(data.map(d => [d.iso, d]))
    const max   = data.reduce((m, d) => Math.max(m, d.value), 0)

    layer.eachLayer(l => {
      const path  = l as L.Path & { feature?: GeoJSON.Feature }
      const props = (path.feature?.properties ?? {}) as { id?: string; name?: string }
      const ev    = byIso.get(props.id ?? '')
      const value = ev?.value ?? 0
      const nombre = ev?.nombre ?? props.name ?? props.id ?? '—'
      path.setStyle({ fillColor: colorFor(value, max) })
      path.bindTooltip(
        `<span style="font-weight:700">${nombre}</span><br/>` +
        `${value.toLocaleString('es-MX')} paquete${value === 1 ? '' : 's'}`,
        { sticky: true, direction: 'top', opacity: 0.96, className: 'mx-choropleth-tip' },
      )
    })
  }, [data, layerReady])

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-400 mr-0.5">menos</span>
          {SCALE.map(c => (
            <span key={c} className="inline-block w-3.5 h-2.5 rounded-sm" style={{ background: c }} />
          ))}
          <span className="text-[9px] text-gray-400 ml-0.5">más</span>
        </div>
      </div>
      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center">
            <Spinner size={24} />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center px-4 text-center">
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" style={{ background: '#fff' }} />
      </div>
      <style>{`.mx-choropleth-tip { font-size: 11px; }`}</style>
    </div>
  )
}
