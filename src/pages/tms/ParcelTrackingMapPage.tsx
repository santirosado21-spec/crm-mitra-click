import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin, Package, Truck, AlertCircle, CheckCircle2, Clock, X,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useShipmentPositions, type ShipmentPosition } from '../../hooks/useShipmentPositions'
import { PAQUETERIA_LABEL } from '../../types/guias'

// Fix de iconos de Leaflet (los assets default no resuelven con Vite).
// Usamos divIcon custom así que no afecta visualmente, pero inicializa la lib.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_COLOR: Record<string, string> = {
  cotizado:    '#94a3b8',
  comprado:    '#3b82f6',
  en_transito: '#f97316',  // naranja pulsante
  entregado:   '#10b981',
  excepcion:   '#ef4444',
  devuelto:    '#f59e0b',
}

const STATUS_LABEL: Record<string, string> = {
  cotizado:    'Cotizado',
  comprado:    'Comprado',
  en_transito: 'En tránsito',
  entregado:   'Entregado',
  excepcion:   'Excepción',
  devuelto:    'Devuelto',
}

const fmtETA = (mins: number | null) => {
  if (mins == null) return '—'
  if (mins <= 0) return 'Llegando'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h >= 24) return `${Math.round(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const fmtMXN = (n: number) => `$${(n ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

export function ParcelTrackingMapPage() {
  const { positions, loading, error } = useShipmentPositions(15_000)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map())
  const [selected, setSelected] = useState<ShipmentPosition | null>(null)

  // Inicializar el mapa una sola vez
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true })
      .setView([23.6, -102.5], 5) // centro de México
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    mapInstanceRef.current = map
    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Marcadores y polylines
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const seen = new Set<string>()
    for (const pos of positions) {
      if (!pos.current) continue
      seen.add(pos.guia.id)
      const status = pos.guia.tracking_status ?? 'comprado'
      const color = STATUS_COLOR[status] ?? STATUS_COLOR.comprado
      const pulse = status === 'en_transito'

      // Marker custom con CSS pulsante
      const html = `
        <div class="parcel-marker" style="--c:${color}">
          <div class="parcel-marker-dot ${pulse ? 'parcel-marker-pulse' : ''}"></div>
        </div>
      `
      const icon = L.divIcon({
        html,
        className: 'parcel-marker-wrap',
        iconSize:   [22, 22],
        iconAnchor: [11, 11],
      })

      let marker = markersRef.current.get(pos.guia.id)
      if (!marker) {
        marker = L.marker([pos.current.lat, pos.current.lon], { icon })
          .addTo(map)
          .on('click', () => setSelected(pos))
        markersRef.current.set(pos.guia.id, marker)
      } else {
        marker.setLatLng([pos.current.lat, pos.current.lon])
        marker.setIcon(icon)
      }
      marker.bindTooltip(
        `${pos.guia.tracking_number} · ${STATUS_LABEL[status] ?? status}`,
        { direction: 'top', offset: [0, -8] },
      )

      // Polyline ruta origen → paradas → destino para los en tránsito
      const routePoints = [pos.from, ...pos.stops, pos.to]
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
      if (routePoints.length >= 2 && (status === 'en_transito' || status === 'comprado')) {
        let poly = polylinesRef.current.get(pos.guia.id)
        const path: L.LatLngExpression[] = routePoints.map(p => [p.lat, p.lon])
        if (!poly) {
          poly = L.polyline(path, {
            color, weight: 2, opacity: 0.4, dashArray: '6, 6',
          }).addTo(map)
          polylinesRef.current.set(pos.guia.id, poly)
        } else {
          poly.setLatLngs(path)
          poly.setStyle({ color })
        }
      }
    }

    // Limpiar marcadores que ya no están
    for (const [id, m] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        map.removeLayer(m)
        markersRef.current.delete(id)
      }
    }
    for (const [id, p] of polylinesRef.current.entries()) {
      if (!seen.has(id)) {
        map.removeLayer(p)
        polylinesRef.current.delete(id)
      }
    }
  }, [positions])

  const inTransito = useMemo(
    () => positions.filter(p => p.guia.tracking_status === 'en_transito').length,
    [positions],
  )
  const entregados = useMemo(
    () => positions.filter(p => p.guia.tracking_status === 'entregado').length,
    [positions],
  )

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden flex flex-col">
          {/* Toolbar superior */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
            <div>
              <h1 className="text-lg font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <MapPin size={18} /> Mapa de tracking
              </h1>
              <p className="text-[11px] text-gray-400">
                Posiciones simuladas en modo demo · 🟠 punto naranja = en tránsito · refresca cada 15s
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-50 text-orange-700 font-bold">
                <Truck size={11} /> {inTransito} en tránsito
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                <CheckCircle2 size={11} /> {entregados} entregados
              </span>
            </div>
          </div>

          {/* Mapa */}
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 z-[400] flex items-center justify-center bg-white/60 pointer-events-none">
                <Spinner size={28} />
              </div>
            )}
            {error && (
              <div className="absolute top-4 right-4 z-[500] bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 inline-flex items-center gap-2 shadow">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            {!loading && positions.length === 0 && (
              <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center text-center px-4">
                <Package size={36} className="text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-600">Sin paquetes para mostrar</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-md">
                  Genera guías desde "Cotizar y comprar" en el módulo TMS de Paqueterías.
                  Las que tengan CP origen + CP destino válidos aparecerán aquí.
                </p>
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: 400 }} />
          </div>
        </main>
      </div>

      {/* Panel detalle del shipment seleccionado */}
      {selected && (
        <ShipmentDetailPanel pos={selected} onClose={() => setSelected(null)} />
      )}

      {/* Estilos del marcador (orange pulse) */}
      <style>{`
        .parcel-marker-wrap { background: transparent !important; border: none !important; }
        .parcel-marker {
          position: relative;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .parcel-marker-dot {
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: var(--c, #f97316);
          border: 2px solid white;
          box-shadow: 0 0 0 1px rgba(0,0,0,.15);
        }
        .parcel-marker-pulse::before {
          content: '';
          position: absolute;
          inset: 0;
          margin: auto;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: var(--c, #f97316);
          opacity: 0.6;
          animation: parcel-pulse 1.6s ease-out infinite;
        }
        @keyframes parcel-pulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.6); opacity: 0;   }
        }
      `}</style>
    </div>
  )
}

function ShipmentDetailPanel({ pos, onClose }: { pos: ShipmentPosition; onClose: () => void }) {
  const g = pos.guia
  const status = g.tracking_status ?? 'comprado'
  const carrier = g.auto_pick_carrier ?? g.paqueteria
  return (
    <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-[1000] w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#1e3a5f] to-[#2d4a73] text-white">
        <div>
          <p className="font-mono text-xs">{g.tracking_number}</p>
          <p className="text-[10px] opacity-80">{PAQUETERIA_LABEL[g.paqueteria] ?? g.paqueteria} · {g.from_postal_code} → {g.to_postal_code}</p>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white"><X size={16} /></button>
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Estado</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: STATUS_COLOR[status] ?? '#94a3b8' }}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>
        <Row label="Carrier"  value={`${carrier} · ${g.auto_pick_service ?? ''}`} />
        <Row label="Cliente"  value={g.cliente_codigo ?? '—'} />
        <Row label="Costo"    value={fmtMXN(Number(g.costo))} />
        <Row label="Precio"   value={fmtMXN(Number(g.precio))} />
        <Row label="Margen"   value={fmtMXN(Number(g.margen))} />
        <Row label="Peso"     value={`${g.weight_kg ?? '—'} kg`} />
        <Row label="ETA"      value={<span className="inline-flex items-center gap-1"><Clock size={11} /> {fmtETA(pos.etaMinutes)}</span>} />
        <Row label="Progreso" value={`${Math.round(pos.progress * 100)}%`} />
        {pos.stops.length > 0 && (
          <Row label="Paradas" value={pos.stops.map(s => s.ciudad || s.municipio || s.cp).join(' → ')} />
        )}
        {pos.from && pos.to && (
          <p className="text-[10px] text-gray-400 mt-2">
            {[pos.from, ...pos.stops, pos.to].map(p => p.ciudad ?? p.municipio ?? p.estado ?? p.cp).join(' → ')}
          </p>
        )}
        {g.override_reason && (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded p-2 mt-2">
            <b>Override SAC:</b> {g.override_reason}
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[10px] uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-gray-800 font-semibold">{value}</span>
    </div>
  )
}
