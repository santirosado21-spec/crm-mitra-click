import { Plus, Trash2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RCItem {
  id:              string
  no:              number
  concepto:        string
  cantidad:        number
  proveedor:       string
  folioFactura:    string
  costoProveedor:  number
  profit:          number
  costoVenta:      number
}

export interface RCState {
  // Header
  fecha:              string
  fechaVencimiento:   string
  refInterna:         string
  // Client data
  clienteNombre:      string
  clienteDireccion:   string
  clienteRfc:         string
  // Payment & reference
  formaPago:          string
  condicionesPago:    string
  banco:              string
  metodoPago:         string
  usoCfdi:            string
  ctaBancaria:        string
  // Logistics
  referencia:         string
  origenDestino:      string
  producto:           string
  piezas:             string
  pesoKg:             string
  // Line items
  items:              RCItem[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const mxn = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })

function newItem(no: number): RCItem {
  return { id: crypto.randomUUID(), no, concepto: '', cantidad: 1, proveedor: '', folioFactura: '', costoProveedor: 0, profit: 0, costoVenta: 0 }
}

// ── Inline editable field ─────────────────────────────────────────────────────
function F({
  value, onChange, placeholder = '', className = '', type = 'text',
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#1e3a5f] focus:outline-none transition-colors text-gray-800 placeholder-gray-300 ${className}`}
    />
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#1e3a5f] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 mb-3">
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 mb-1.5">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap w-28 shrink-0">
        {label}
      </span>
      {children}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  state: RCState
  onChange: (patch: Partial<RCState>) => void
  readOnly?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RCDocument({ state, onChange, readOnly = false }: Props) {
  const { items } = state

  const set = (patch: Partial<RCState>) => onChange(patch)
  const setItem = (id: string, patch: Partial<RCItem>) => {
    onChange({
      items: items.map(it => {
        if (it.id !== id) return it
        const updated = { ...it, ...patch }
        // Auto-recalculate profit when cost or sale changes
        if ('costoProveedor' in patch || 'costoVenta' in patch) {
          updated.profit = updated.costoVenta - updated.costoProveedor
        }
        return updated
      }),
    })
  }

  const addItem = () => {
    onChange({ items: [...items, newItem(items.length + 1)] })
  }

  const removeItem = (id: string) => {
    const updated = items.filter(it => it.id !== id).map((it, i) => ({ ...it, no: i + 1 }))
    onChange({ items: updated })
  }

  const subtotal = items.reduce((s, it) => s + it.costoVenta, 0)
  const iva      = subtotal * 0.16
  const total    = subtotal + iva

  const thCls = 'text-[10px] font-bold uppercase tracking-wide text-white bg-[#1e3a5f] px-2 py-2 text-center'
  const tdCls = 'px-2 py-1.5 border-b border-gray-100 text-center align-middle'
  const numF  = 'w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#1e3a5f] focus:outline-none text-center text-sm text-gray-800 transition-colors'

  return (
    <div
      id="rc-document"
      className="bg-white rounded-2xl border border-gray-200 shadow-lg print:shadow-none print:rounded-none print:border-none"
    >
      {/* ── Document header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-gray-100">
        <img src="/logo.png" alt="Supply Chain México" className="h-14 object-contain" />
        <div className="text-right">
          <p className="text-2xl font-bold text-[#1e3a5f] tracking-wide">RENDICIÓN DE CUENTAS</p>
          <p className="text-xs text-gray-400 mt-0.5">Supply Chain México S.A. de C.V.</p>
        </div>
      </div>

      {/* ── Meta row: fecha + ref ────────────────────────────────────────── */}
      <div className="flex items-center gap-10 px-8 py-3 bg-gray-50 border-b border-gray-100 print:bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Fecha</span>
          <F
            type="date"
            value={state.fecha}
            onChange={v => set({ fecha: v })}
            className="text-sm font-semibold"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Ref. Interna</span>
          <F
            value={state.refInterna}
            onChange={v => set({ refInterna: v })}
            placeholder="SCAZ0035"
            className="text-sm font-semibold font-mono text-[#1e3a5f] w-32"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Vencimiento</span>
          <F
            type="date"
            value={state.fechaVencimiento}
            onChange={v => set({ fechaVencimiento: v })}
            className="text-sm"
          />
        </div>
      </div>

      {/* ── Two-column info ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">

        {/* Left: Datos del cliente */}
        <div className="px-8 py-5">
          <SecLabel>Datos del cliente</SecLabel>
          <Row label="Cliente">
            <F
              value={state.clienteNombre}
              onChange={v => set({ clienteNombre: v })}
              placeholder="Nombre del cliente"
              className="text-sm font-semibold flex-1 min-w-0"
            />
          </Row>
          <Row label="Dirección">
            <F
              value={state.clienteDireccion}
              onChange={v => set({ clienteDireccion: v })}
              placeholder="Dirección"
              className="text-sm flex-1 min-w-0"
            />
          </Row>
          <Row label="R.F.C.">
            <F
              value={state.clienteRfc}
              onChange={v => set({ clienteRfc: v })}
              placeholder="RFC123456789"
              className="text-sm font-mono flex-1 min-w-0"
            />
          </Row>
        </div>

        {/* Right: Datos de pago y referencia */}
        <div className="px-8 py-5">
          <SecLabel>Datos de pago y referencia</SecLabel>
          <Row label="Forma de pago">
            <F
              value={state.formaPago}
              onChange={v => set({ formaPago: v })}
              placeholder="Transferencia"
              className="text-sm flex-1 min-w-0"
            />
          </Row>
          <Row label="Condiciones">
            <F
              value={state.condicionesPago}
              onChange={v => set({ condicionesPago: v })}
              placeholder="30 días"
              className="text-sm flex-1 min-w-0"
            />
          </Row>
          <Row label="Banco">
            <F
              value={state.banco}
              onChange={v => set({ banco: v })}
              placeholder="BBVA"
              className="text-sm flex-1 min-w-0"
            />
          </Row>
          <Row label="Método de pago">
            <F
              value={state.metodoPago}
              onChange={v => set({ metodoPago: v })}
              placeholder="03 - Transferencia"
              className="text-sm flex-1 min-w-0"
            />
          </Row>
          <Row label="Uso de CFDI">
            <F
              value={state.usoCfdi}
              onChange={v => set({ usoCfdi: v })}
              placeholder="G03 - Gastos en general"
              className="text-sm flex-1 min-w-0"
            />
          </Row>
          <Row label="Cta bancaria">
            <F
              value={state.ctaBancaria}
              onChange={v => set({ ctaBancaria: v })}
              placeholder="CLABE 18 dígitos"
              className="text-sm font-mono flex-1 min-w-0"
            />
          </Row>
        </div>
      </div>

      {/* ── Logistics strip ─────────────────────────────────────────────── */}
      <div className="px-8 py-4 bg-gray-50 border-b border-gray-100 print:bg-gray-50">
        <SecLabel>Detalles de logística</SecLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-1">
          <Row label="Referencia">
            <F value={state.referencia} onChange={v => set({ referencia: v })}
               placeholder="SC200001" className="text-sm font-mono flex-1 min-w-0" />
          </Row>
          <Row label="Origen – Destino">
            <F value={state.origenDestino} onChange={v => set({ origenDestino: v })}
               placeholder="CDMX → Tlálhuac" className="text-sm flex-1 min-w-0" />
          </Row>
          <Row label="Producto">
            <F value={state.producto} onChange={v => set({ producto: v })}
               placeholder="Descripción" className="text-sm flex-1 min-w-0" />
          </Row>
          <Row label="Piezas">
            <F value={state.piezas} onChange={v => set({ piezas: v })}
               placeholder="0" className="text-sm w-20" />
          </Row>
          <Row label="Peso (kg)">
            <F value={state.pesoKg} onChange={v => set({ pesoKg: v })}
               placeholder="0.00" className="text-sm w-24" />
          </Row>
        </div>
      </div>

      {/* ── Line items table ─────────────────────────────────────────────── */}
      <div className="px-8 py-5">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr>
                <th className={`${thCls} w-10`}>No.</th>
                <th className={`${thCls} text-left pl-3`}>Concepto</th>
                <th className={`${thCls} w-14`}>Cant.</th>
                <th className={`${thCls} w-36`}>Proveedor</th>
                <th className={`${thCls} w-28`}>Folio Fact.</th>
                <th className={`${thCls} w-28`}>Costo Prov.</th>
                <th className={`${thCls} w-24`}>Profit</th>
                <th className={`${thCls} w-28`}>Costo Venta</th>
                {!readOnly && <th className={`${thCls} w-8`} />}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                  {/* No */}
                  <td className={`${tdCls} text-gray-500 text-xs font-mono`}>{item.no}</td>
                  {/* Concepto */}
                  <td className={`${tdCls} text-left pl-3`}>
                    <input
                      type="text"
                      value={item.concepto}
                      onChange={e => setItem(item.id, { concepto: e.target.value })}
                      placeholder="Descripción del servicio"
                      className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#1e3a5f] focus:outline-none text-sm text-gray-800 transition-colors text-left placeholder-gray-300 py-0.5"
                    />
                  </td>
                  {/* Cantidad */}
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={1}
                      value={item.cantidad}
                      onChange={e => setItem(item.id, { cantidad: Number(e.target.value) || 1 })}
                      className={`${numF} w-12`}
                    />
                  </td>
                  {/* Proveedor */}
                  <td className={tdCls}>
                    <input
                      type="text"
                      value={item.proveedor}
                      onChange={e => setItem(item.id, { proveedor: e.target.value })}
                      placeholder="Proveedor"
                      className={`${numF} placeholder-gray-300`}
                    />
                  </td>
                  {/* Folio Factura */}
                  <td className={tdCls}>
                    <input
                      type="text"
                      value={item.folioFactura}
                      onChange={e => setItem(item.id, { folioFactura: e.target.value })}
                      placeholder="A-685"
                      className={`${numF} placeholder-gray-300 font-mono`}
                    />
                  </td>
                  {/* Costo Proveedor */}
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.costoProveedor || ''}
                      onChange={e => setItem(item.id, { costoProveedor: Number(e.target.value) || 0 })}
                      placeholder="0.00"
                      className={`${numF} placeholder-gray-300`}
                    />
                  </td>
                  {/* Profit (auto-calculated, still editable) */}
                  <td className={tdCls}>
                    <span className={`text-sm font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {item.profit !== 0 ? mxn(item.profit) : <span className="text-gray-300">—</span>}
                    </span>
                  </td>
                  {/* Costo Venta */}
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.costoVenta || ''}
                      onChange={e => setItem(item.id, { costoVenta: Number(e.target.value) || 0 })}
                      placeholder="0.00"
                      className={`${numF} font-semibold text-[#1e3a5f] placeholder-gray-300`}
                    />
                  </td>
                  {/* Delete */}
                  {!readOnly && (
                    <td className={`${tdCls} print:hidden`}>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {/* Empty state row */}
              {items.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 8 : 9} className="py-6 text-center text-sm text-gray-400 italic">
                    Sin líneas. Genera desde operaciones o añade manualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add row button */}
        {!readOnly && (
          <button
            onClick={addItem}
            className="print:hidden mt-2 flex items-center gap-1.5 text-xs text-[#1e3a5f] hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            <Plus size={13} /> Añadir línea
          </button>
        )}
      </div>

      {/* ── Totals section ───────────────────────────────────────────────── */}
      <div className="px-8 pb-8">
        <div className="ml-auto w-72 border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtotal</span>
            <span className="text-sm font-medium text-gray-800">{mxn(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">IVA (16%)</span>
            <span className="text-sm text-gray-600">{mxn(iva)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-[#1e3a5f] print:bg-[#1e3a5f]">
            <span className="text-sm font-bold text-white uppercase tracking-wider">Total</span>
            <span className="text-lg font-bold text-white">{mxn(total)}</span>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-[10px] text-gray-400 text-center">
          Supply Chain México S.A. de C.V. · Lerma, Estado de México · Documento generado por el sistema CRM
        </p>
      </div>
    </div>
  )
}

export { newItem }
