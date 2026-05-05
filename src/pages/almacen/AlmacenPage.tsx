import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Wifi, WifiOff, Database, Loader2, Users, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useExtensivWarehouseData, type ClientSummary, type WarehouseStatus } from '../../hooks/useExtensivWarehouseData'

export function AlmacenPage() {
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [clientFilter, setClientFilter] = useState<number | null>(null)

  const { occupancy, byLocation, clients, status, lastFetch, error, itemsFetched, fetchNow } =
    useExtensivWarehouseData()

  // Push occupancy + clients → iframe on fresh data
  const lastPostedRef = useRef<string>('')
  useEffect(() => {
    if (status !== 'live' && status !== 'cache') return
    const key = lastFetch?.toISOString() ?? `cache-${clients.length}`
    if (!key || key === lastPostedRef.current) return
    lastPostedRef.current = key

    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const colors: Record<number, string> = {}
    for (const c of clients) colors[c.customerId] = c.color

    iframe.contentWindow.postMessage(
      { type: 'occupancy-update', data: occupancy },
      window.location.origin
    )
    iframe.contentWindow.postMessage(
      { type: 'clients-update', data: byLocation, colors },
      window.location.origin
    )
  }, [occupancy, byLocation, clients, status, lastFetch])

  // Push client filter → iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    iframe.contentWindow.postMessage(
      { type: 'client-filter', customerId: clientFilter },
      window.location.origin
    )
  }, [clientFilter, iframeLoaded])

  const nextAutoRefresh = lastFetch
    ? new Date(lastFetch.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null

  const [mobileClientsOpen, setMobileClientsOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-dvh h-dvh overflow-hidden" style={{ background: '#f5f7fa' }}>
      {/* Top bar — compacto en móvil, scroll horizontal si no caben los controles */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 shrink-0 overflow-x-auto whitespace-nowrap">
        <img
          src="/hd-logo.png"
          alt="Supply Chain MX"
          className="h-10 sm:h-20 w-auto object-contain cursor-pointer shrink-0"
          onClick={() => navigate('/')}
        />
        <div className="hidden sm:block w-px h-8 bg-gray-200 shrink-0" />

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#1f3864] transition-colors px-2 py-1.5 rounded hover:bg-gray-50 shrink-0"
        >
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Volver al inicio</span>
        </button>

        <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" />

        <span className="text-[10px] sm:text-xs font-bold text-[#1f3864] shrink-0">
          <span className="sm:hidden">CEDIS Lerma</span>
          <span className="hidden sm:inline">Almacén — CEDIS Lerma · Bodega 1</span>
        </span>

        <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" />

        {/* Client filter dropdown */}
        <label className="flex items-center gap-1.5 text-[11px] shrink-0">
          <span className="hidden sm:inline text-gray-500 font-semibold">Cliente:</span>
          <select
            value={clientFilter ?? ''}
            onChange={e => setClientFilter(e.target.value ? Number(e.target.value) : null)}
            className="h-7 px-2 rounded border border-gray-200 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-[#1f3864]/20 max-w-[160px] sm:max-w-[220px]"
          >
            <option value="">Todos los clientes</option>
            {clients.map(c => (
              <option key={c.customerId} value={c.customerId}>
                {c.customerName} ({c.positions.length})
              </option>
            ))}
          </select>
          {clientFilter !== null && (
            <button
              onClick={() => setClientFilter(null)}
              className="text-[10px] text-gray-400 hover:text-red-500 px-1"
              title="Limpiar filtro"
            >
              ✕
            </button>
          )}
        </label>

        <div className="flex-1" />

        <StatusPill status={status} lastFetch={lastFetch} error={error} itemsFetched={itemsFetched} />

        {nextAutoRefresh && status === 'live' && (
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-gray-400">
            <span>Auto-refresh:</span>
            <span className="font-semibold text-gray-600">
              {nextAutoRefresh.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )}

        <button
          onClick={fetchNow}
          disabled={status === 'loading'}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-[#1f3864] text-white text-xs font-semibold hover:bg-[#16304d] transition-colors disabled:opacity-60 shrink-0"
        >
          <RefreshCw size={12} className={status === 'loading' ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{status === 'loading' ? 'Cargando...' : 'Actualizar ahora'}</span>
        </button>
      </div>

      {/* Main content: iframe + side panel */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative overflow-auto touch-pan-x touch-pan-y" style={{ background: '#f5f7fa', WebkitOverflowScrolling: 'touch' }}>
          {!iframeLoaded && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: '#f5f7fa' }}
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={28} className="animate-spin text-[#1f3864]" />
                <p className="text-xs text-gray-500 font-semibold tracking-wider">CARGANDO LAYOUT CEDIS...</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src="/cedis-layout/index.html"
            title="Layout CEDIS Lerma"
            className="border-0 transition-opacity duration-300 w-full h-full lg:w-full lg:h-full"
            style={{
              background: '#f5f7fa',
              opacity: iframeLoaded ? 1 : 0,
              minWidth: '900px',
              minHeight: '600px',
            }}
            onLoad={() => setTimeout(() => setIframeLoaded(true), 400)}
          />
        </div>

        {/* Sidebar de clientes — desktop inline / móvil bottom-sheet */}
        <div className="hidden lg:block">
          <ClientsPanel
            clients={clients}
            status={status}
            selectedId={clientFilter}
            onSelect={setClientFilter}
          />
        </div>

        {/* FAB móvil para abrir panel de clientes */}
        <button
          type="button"
          onClick={() => setMobileClientsOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#1f3864] text-white text-xs font-semibold shadow-xl active:scale-[0.98]"
        >
          <Users size={14} /> Clientes ({clients.length})
        </button>

        {/* Bottom sheet móvil */}
        {mobileClientsOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex flex-col">
            <div className="flex-1 bg-black/40 animate-fade-in" onClick={() => setMobileClientsOpen(false)} />
            <div className="bg-white border-t border-gray-200 max-h-[70vh] flex flex-col rounded-t-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-[#1f3864]" />
                  <h2 className="text-sm font-bold text-gray-800">Clientes en el CEDIS</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileClientsOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
              <ClientsPanel
                clients={clients}
                status={status}
                selectedId={clientFilter}
                onSelect={(id) => { setClientFilter(id); setMobileClientsOpen(false) }}
                forceMobile
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ClientsPanel({
  clients, status, selectedId, onSelect, forceMobile,
}: {
  clients: ClientSummary[]
  status: WarehouseStatus
  selectedId: number | null
  onSelect: (id: number | null) => void
  forceMobile?: boolean
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const filtered = search.trim()
    ? clients.filter(c => c.customerName.toLowerCase().includes(search.toLowerCase()))
    : clients

  if (collapsed && !forceMobile) {
    return (
      <div className="w-10 bg-white border-l border-gray-200 flex flex-col items-center py-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
          title="Mostrar clientes"
        >
          <Users size={14} />
        </button>
      </div>
    )
  }

  return (
    <aside className={forceMobile
      ? 'flex-1 flex flex-col bg-white'
      : 'w-80 bg-white border-l border-gray-200 flex flex-col shrink-0'
    }>
      {!forceMobile && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#1f3864]" />
            <h2 className="text-xs font-bold text-gray-800">Clientes en el CEDIS</h2>
          </div>
          <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-gray-100 text-gray-400" title="Ocultar">
            <ChevronDown size={12} className="rotate-90" />
          </button>
        </div>
      )}

      <div className="px-4 py-2 border-b border-gray-100">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-7 pl-7 pr-2 rounded border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1f3864]/20"
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          {clients.length} clientes · {filtered.length} mostrados
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {status === 'loading' && clients.length === 0 && (
          <div className="p-6 text-center text-xs text-gray-400">Cargando inventario de Extensiv...</div>
        )}
        {status === 'error' && clients.length === 0 && (
          <div className="p-6 text-center text-xs text-red-500">Sin conexión a Extensiv</div>
        )}
        {filtered.length === 0 && clients.length > 0 && (
          <div className="p-6 text-center text-xs text-gray-400">Sin resultados</div>
        )}

        {filtered.map(c => {
          const isSelected = selectedId === c.customerId
          return (
            <div key={c.customerId} className={`border-b border-gray-50 ${isSelected ? 'bg-blue-50/60' : ''}`}>
              <div className="flex items-stretch">
                <button
                  onClick={() => onSelect(isSelected ? null : c.customerId)}
                  className="flex-1 px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 text-left"
                  title={isSelected ? 'Limpiar filtro' : 'Filtrar mapa por este cliente'}
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ background: c.color, ...(isSelected ? { boxShadow: `0 0 0 2px ${c.color}` } : {}) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[#1f3864]' : 'text-gray-800'}`}>{c.customerName}</p>
                    <p className="text-[10px] text-gray-500">
                      {c.positions.length} {c.positions.length === 1 ? 'posición' : 'posiciones'} · {c.totalUnits.toLocaleString()} unidades
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === c.customerId ? null : c.customerId)}
                  className="px-2 hover:bg-gray-100 text-gray-400"
                  title="Ver ubicaciones"
                >
                  {expandedId === c.customerId ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
              {expandedId === c.customerId && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-1">
                  {c.positions.slice(0, 50).map(pos => (
                    <span
                      key={pos}
                      className="text-[10px] font-mono text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded truncate"
                      title={pos}
                    >
                      {pos}
                    </span>
                  ))}
                  {c.positions.length > 50 && (
                    <span className="text-[10px] text-gray-400 col-span-2">
                      ...y {c.positions.length - 50} más
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-[9px] text-gray-400">
          {selectedId !== null
            ? 'Mapa filtrado: solo se muestra el cliente seleccionado.'
            : 'Cada posición se colorea por el cliente que la ocupa. Click en un cliente para filtrar.'}
        </p>
      </div>
    </aside>
  )
}

function StatusPill({
  status, lastFetch, error, itemsFetched,
}: {
  status: WarehouseStatus
  lastFetch: Date | null
  error: string | null
  itemsFetched: number
}) {
  const config = {
    loading: { Icon: Loader2, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', label: 'CARGANDO...', pulse: false, spin: true },
    live:    { Icon: Wifi,    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'EN VIVO (Extensiv)', pulse: true,  spin: false },
    cache:   { Icon: Database,color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'CACHE',         pulse: false, spin: false },
    error:   { Icon: WifiOff, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'SIN CONEXIÓN',  pulse: false, spin: false },
  }[status]

  const tooltipText = error
    ? `Error: ${error}\n\nAbre la consola (F12) para ver detalles.`
    : status === 'live' ? `${itemsFetched.toLocaleString()} items cargados` : undefined

  return (
    <div
      className="flex items-center gap-2 px-3 py-1 rounded-full border"
      style={{ borderColor: config.border, background: config.bg }}
      title={tooltipText}
    >
      {config.pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: config.color }}
        />
      )}
      <config.Icon size={12} className={config.spin ? 'animate-spin' : ''} style={{ color: config.color }} />
      <span className="text-[10px] font-bold tracking-wider" style={{ color: config.color }}>
        {config.label}
      </span>
      {lastFetch && (
        <span className="text-[10px] text-gray-400 hidden sm:inline">
          {lastFetch.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
