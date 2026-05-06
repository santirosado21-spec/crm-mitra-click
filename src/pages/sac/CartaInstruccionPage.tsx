import { useMemo, useState } from 'react'
import { FileText, Printer, RotateCcw, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useClientCatalog } from '../../hooks/useClientCatalog'

type Mercancia = {
  descripcion: string
  sku: string
  cantidad: string
  empaque: string
  peso: string
  valor: string
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20'
const areaCls = 'w-full min-h-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 resize-y'
const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block'
const today = new Date().toISOString().split('T')[0]

const emptyMercancia: Mercancia = {
  descripcion: '',
  sku: '',
  cantidad: '',
  empaque: '',
  peso: '',
  valor: '',
}

function joinAddress(parts: string[]) {
  return parts.map(p => p.trim()).filter(Boolean).join(', ')
}

export function CartaInstruccionPage() {
  const { clientes } = useClientCatalog()
  const [folio, setFolio] = useState(`CI-${Date.now().toString().slice(-6)}`)
  const [fecha, setFecha] = useState(today)
  const [cliente, setCliente] = useState('')
  const [referencia, setReferencia] = useState('')
  const [ordenCompra, setOrdenCompra] = useState('')
  const [tipoServicio, setTipoServicio] = useState('Entrega local')
  const [origen, setOrigen] = useState('CEDIS Lerma')
  const [origenDir, setOrigenDir] = useState('')
  const [destino, setDestino] = useState('')
  const [destinoDir, setDestinoDir] = useState('')
  const [fechaCarga, setFechaCarga] = useState(today)
  const [horaCarga, setHoraCarga] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState(today)
  const [horaEntrega, setHoraEntrega] = useState('')
  const [contactoCarga, setContactoCarga] = useState('')
  const [contactoEntrega, setContactoEntrega] = useState('')
  const [unidad, setUnidad] = useState('')
  const [operador, setOperador] = useState('')
  const [placas, setPlacas] = useState('')
  const [maniobras, setManiobras] = useState('No')
  const [sellos, setSellos] = useState('')
  const [documentos, setDocumentos] = useState('Pick Ticket, evidencia fotográfica, acuse de entrega')
  const [instrucciones, setInstrucciones] = useState('Validar cantidades contra documento origen. No liberar sin evidencia de entrega firmada o sello del receptor.')
  const [seguridad, setSeguridad] = useState('Mantener comunicación durante carga, salida, arribo y descarga. Reportar incidencias inmediatamente a SAC y Transportes.')
  const [mercancias, setMercancias] = useState<Mercancia[]>([{ ...emptyMercancia }])

  const totalBultos = useMemo(
    () => mercancias.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0),
    [mercancias],
  )
  const totalPeso = useMemo(
    () => mercancias.reduce((sum, item) => sum + (Number(item.peso) || 0), 0),
    [mercancias],
  )

  const faltantes = [
    !cliente && 'Cliente',
    !referencia && 'Referencia',
    !destino && 'Destino',
    !destinoDir && 'Domicilio destino',
    !mercancias.some(m => m.descripcion.trim()) && 'Mercancía',
  ].filter(Boolean)

  const updateMercancia = (idx: number, field: keyof Mercancia, value: string) => {
    setMercancias(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const reset = () => {
    setFolio(`CI-${Date.now().toString().slice(-6)}`)
    setFecha(today)
    setCliente('')
    setReferencia('')
    setOrdenCompra('')
    setTipoServicio('Entrega local')
    setOrigen('CEDIS Lerma')
    setOrigenDir('')
    setDestino('')
    setDestinoDir('')
    setFechaCarga(today)
    setHoraCarga('')
    setFechaEntrega(today)
    setHoraEntrega('')
    setContactoCarga('')
    setContactoEntrega('')
    setUnidad('')
    setOperador('')
    setPlacas('')
    setManiobras('No')
    setSellos('')
    setDocumentos('Pick Ticket, evidencia fotográfica, acuse de entrega')
    setInstrucciones('Validar cantidades contra documento origen. No liberar sin evidencia de entrega firmada o sello del receptor.')
    setSeguridad('Mantener comunicación durante carga, salida, arribo y descarga. Reportar incidencias inmediatamente a SAC y Transportes.')
    setMercancias([{ ...emptyMercancia }])
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y p-6">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #carta-instruccion-print, #carta-instruccion-print * { visibility: visible; }
              #carta-instruccion-print {
                position: absolute;
                inset: 0;
                width: 100%;
                padding: 0;
                box-shadow: none !important;
                border: none !important;
              }
              .ci-no-print { display: none !important; }
            }
          `}</style>

          <div className="ci-no-print flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Cartas de instrucción para Transportes</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Documento operativo para entregar a transportes con ruta, mercancía, contactos e instrucciones de ejecución.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 flex items-center gap-2 hover:bg-gray-50">
                <RotateCcw size={15} /> Limpiar
              </button>
              <button onClick={() => window.print()} className="h-10 px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#16304d]">
                <Printer size={15} /> Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="ci-no-print grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
              {faltantes.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  Faltan datos recomendados: {faltantes.join(', ')}.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Folio"><input className={inputCls} value={folio} onChange={e => setFolio(e.target.value)} /></Field>
                <Field label="Fecha"><input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
                <Field label="Cliente">
                  <select className={inputCls} value={cliente} onChange={e => setCliente(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {clientes.map(c => <option key={`${c.codigo}-${c.nombre}`} value={c.nombre}>{c.codigo} - {c.nombre}</option>)}
                  </select>
                </Field>
                <Field label="Referencia / PT"><input className={inputCls} value={referencia} onChange={e => setReferencia(e.target.value)} /></Field>
                <Field label="OC / Pedido"><input className={inputCls} value={ordenCompra} onChange={e => setOrdenCompra(e.target.value)} /></Field>
                <Field label="Tipo de servicio"><input className={inputCls} value={tipoServicio} onChange={e => setTipoServicio(e.target.value)} /></Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Origen"><input className={inputCls} value={origen} onChange={e => setOrigen(e.target.value)} /></Field>
                <Field label="Destino"><input className={inputCls} value={destino} onChange={e => setDestino(e.target.value)} /></Field>
                <Field label="Domicilio origen"><textarea className={areaCls} value={origenDir} onChange={e => setOrigenDir(e.target.value)} /></Field>
                <Field label="Domicilio destino"><textarea className={areaCls} value={destinoDir} onChange={e => setDestinoDir(e.target.value)} /></Field>
                <Field label="Fecha/hora carga">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className={inputCls} value={fechaCarga} onChange={e => setFechaCarga(e.target.value)} />
                    <input type="time" className={inputCls} value={horaCarga} onChange={e => setHoraCarga(e.target.value)} />
                  </div>
                </Field>
                <Field label="Fecha/hora entrega">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className={inputCls} value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
                    <input type="time" className={inputCls} value={horaEntrega} onChange={e => setHoraEntrega(e.target.value)} />
                  </div>
                </Field>
                <Field label="Contacto carga"><input className={inputCls} value={contactoCarga} onChange={e => setContactoCarga(e.target.value)} /></Field>
                <Field label="Contacto entrega"><input className={inputCls} value={contactoEntrega} onChange={e => setContactoEntrega(e.target.value)} /></Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Unidad requerida"><input className={inputCls} value={unidad} onChange={e => setUnidad(e.target.value)} placeholder="Van, rabón, caja seca..." /></Field>
                <Field label="Operador asignado"><input className={inputCls} value={operador} onChange={e => setOperador(e.target.value)} /></Field>
                <Field label="Placas"><input className={inputCls} value={placas} onChange={e => setPlacas(e.target.value)} /></Field>
                <Field label="Maniobra"><select className={inputCls} value={maniobras} onChange={e => setManiobras(e.target.value)}><option>No</option><option>Sí</option></select></Field>
              </div>

              <Field label="Documentos requeridos"><textarea className={areaCls} value={documentos} onChange={e => setDocumentos(e.target.value)} /></Field>
              <Field label="Instrucciones de operación"><textarea className={areaCls} value={instrucciones} onChange={e => setInstrucciones(e.target.value)} /></Field>
              <Field label="Seguridad / restricciones"><textarea className={areaCls} value={seguridad} onChange={e => setSeguridad(e.target.value)} /></Field>
            </section>

            <section className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-[#1e3a5f]">Mercancía</h2>
                  <button onClick={() => setMercancias(prev => [...prev, { ...emptyMercancia }])} className="text-xs font-semibold text-[#1e3a5f] flex items-center gap-1 hover:underline">
                    <Plus size={13} /> Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {mercancias.map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500">Línea {idx + 1}</span>
                        {mercancias.length > 1 && (
                          <button onClick={() => setMercancias(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inputCls} placeholder="Descripción" value={m.descripcion} onChange={e => updateMercancia(idx, 'descripcion', e.target.value)} />
                        <input className={inputCls} placeholder="SKU / Parte" value={m.sku} onChange={e => updateMercancia(idx, 'sku', e.target.value)} />
                        <input className={inputCls} placeholder="Cantidad" value={m.cantidad} onChange={e => updateMercancia(idx, 'cantidad', e.target.value)} />
                        <input className={inputCls} placeholder="Empaque" value={m.empaque} onChange={e => updateMercancia(idx, 'empaque', e.target.value)} />
                        <input className={inputCls} placeholder="Peso kg" value={m.peso} onChange={e => updateMercancia(idx, 'peso', e.target.value)} />
                        <input className={inputCls} placeholder="Valor declarado" value={m.valor} onChange={e => updateMercancia(idx, 'valor', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DocumentPreview
                data={{
                  folio, fecha, cliente, referencia, ordenCompra, tipoServicio, origen, origenDir, destino, destinoDir,
                  fechaCarga, horaCarga, fechaEntrega, horaEntrega, contactoCarga, contactoEntrega, unidad, operador,
                  placas, maniobras, sellos, documentos, instrucciones, seguridad, mercancias, totalBultos, totalPeso,
                }}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className={labelCls}>{label}</span>{children}</label>
}

function DocumentPreview({ data }: { data: any }) {
  return (
    <article id="carta-instruccion-print" className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-gray-800">
      <div className="flex items-start justify-between border-b-2 border-[#1e3a5f] pb-4 mb-5">
        <div>
          <p className="text-2xl font-extrabold text-[#1e3a5f]">CARTA DE INSTRUCCIÓN</p>
          <p className="text-xs font-semibold text-gray-500 mt-1">SAC → Transportes</p>
        </div>
        <div className="text-right text-xs">
          <p><b>Folio:</b> {data.folio || '—'}</p>
          <p><b>Fecha:</b> {data.fecha || '—'}</p>
          <p><b>Servicio:</b> {data.tipoServicio || '—'}</p>
        </div>
      </div>

      <DocGrid rows={[
        ['Cliente', data.cliente],
        ['Referencia / PT', data.referencia],
        ['OC / Pedido', data.ordenCompra],
        ['Maniobra', data.maniobras],
      ]} />

      <Section title="Ruta y citas">
        <DocGrid rows={[
          ['Origen', data.origen],
          ['Domicilio origen', data.origenDir],
          ['Carga', `${data.fechaCarga || '—'} ${data.horaCarga || ''}`],
          ['Contacto carga', data.contactoCarga],
          ['Destino', data.destino],
          ['Domicilio destino', data.destinoDir],
          ['Entrega', `${data.fechaEntrega || '—'} ${data.horaEntrega || ''}`],
          ['Contacto entrega', data.contactoEntrega],
        ]} />
      </Section>

      <Section title="Asignación requerida">
        <DocGrid rows={[
          ['Unidad', data.unidad],
          ['Operador', data.operador],
          ['Placas', data.placas],
          ['Sellos', data.sellos],
        ]} />
      </Section>

      <Section title="Mercancía">
        <table className="w-full text-xs border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Descripción', 'SKU', 'Cantidad', 'Empaque', 'Peso kg', 'Valor'].map(h => <th key={h} className="text-left p-2 border-b">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.mercancias.map((m: Mercancia, idx: number) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{m.descripcion || '—'}</td>
                <td className="p-2">{m.sku || '—'}</td>
                <td className="p-2">{m.cantidad || '—'}</td>
                <td className="p-2">{m.empaque || '—'}</td>
                <td className="p-2">{m.peso || '—'}</td>
                <td className="p-2">{m.valor || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">Total bultos: <b>{data.totalBultos}</b> · Peso estimado: <b>{data.totalPeso} kg</b></p>
      </Section>

      <Section title="Instrucciones">
        <p className="text-xs whitespace-pre-wrap mb-3"><b>Documentos:</b> {data.documentos || '—'}</p>
        <p className="text-xs whitespace-pre-wrap mb-3"><b>Operación:</b> {data.instrucciones || '—'}</p>
        <p className="text-xs whitespace-pre-wrap"><b>Seguridad:</b> {data.seguridad || '—'}</p>
      </Section>

      <div className="grid grid-cols-3 gap-8 mt-10 text-center text-xs">
        {['SAC', 'Transportes', 'Operador / Receptor'].map(label => (
          <div key={label}>
            <div className="border-t border-gray-400 pt-2">{label}</div>
          </div>
        ))}
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-5"><h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2">{title}</h3>{children}</section>
}

function DocGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="border-b border-gray-100 pb-1">
          <span className="font-bold text-gray-500">{label}: </span>{value || '—'}
        </div>
      ))}
    </div>
  )
}
