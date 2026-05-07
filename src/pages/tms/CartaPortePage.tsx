import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Plus, Printer, RotateCcw, Trash2, Inbox, Upload, Loader2, X } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { useClientCatalog } from '../../hooks/useClientCatalog'
import { useOperadores } from '../../hooks/useOperadores'
import { useVehiculos } from '../../hooks/useVehiculos'
import { useCartasInstruccion } from '../../hooks/useCartasInstruccion'
import { useToast } from '../../hooks/useToast'
import { useAuthContext } from '../../context/AuthContext'
import { isBaseManiobrista } from '../../lib/tmsCatalog'
import { extractReceiptItemsFromPT } from '../../lib/ptParser'
import { supabase } from '../../lib/supabase'
import type { CartaInstruccion } from '../../types/cartas'

type MercanciaCP = {
  bienesTransp: string
  descripcion: string
  cantidad: string
  claveUnidad: string
  unidad: string
  pesoKg: string
  valor: string
  materialPeligroso: string
  embalaje: string
  pedimento: string
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20'
const areaCls = 'w-full min-h-20 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 resize-y'
const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block'
const today = new Date().toISOString().split('T')[0]
const emptyMercancia: MercanciaCP = {
  bienesTransp: '',
  descripcion: '',
  cantidad: '',
  claveUnidad: 'H87',
  unidad: 'Pieza',
  pesoKg: '',
  valor: '',
  materialPeligroso: 'No',
  embalaje: '',
  pedimento: '',
}

export function CartaPortePage() {
  const { clientes } = useClientCatalog()
  const { operadores } = useOperadores({ esPropio: true })
  const { vehiculos } = useVehiculos({ esPropio: true })

  const [folio, setFolio] = useState(`CP-${Date.now().toString().slice(-6)}`)
  const [fecha, setFecha] = useState(today)
  const [tipoCfdi, setTipoCfdi] = useState('Ingreso')
  const [idCcp, setIdCcp] = useState('')
  const [cliente, setCliente] = useState('')
  const [rfcCliente, setRfcCliente] = useState('')
  const [regimenCliente, setRegimenCliente] = useState('')
  const [usoCfdi, setUsoCfdi] = useState('G03')
  const [transpInternac, setTranspInternac] = useState('No')
  const [totalDist, setTotalDist] = useState('')
  const [logisticaInversa, setLogisticaInversa] = useState('No')
  const [origenRfc, setOrigenRfc] = useState('')
  const [origenNombre, setOrigenNombre] = useState('')
  const [origenFechaHora, setOrigenFechaHora] = useState(`${today}T08:00`)
  const [origenDomicilio, setOrigenDomicilio] = useState('')
  const [destinoRfc, setDestinoRfc] = useState('')
  const [destinoNombre, setDestinoNombre] = useState('')
  const [destinoFechaHora, setDestinoFechaHora] = useState(`${today}T18:00`)
  const [destinoDomicilio, setDestinoDomicilio] = useState('')
  const [permSct, setPermSct] = useState('')
  const [numPermisoSct, setNumPermisoSct] = useState('')
  const [configVehicular, setConfigVehicular] = useState('')
  const [placaVm, setPlacaVm] = useState('')
  const [anioModelo, setAnioModelo] = useState('')
  const [aseguradora, setAseguradora] = useState('')
  const [poliza, setPoliza] = useState('')
  const [remolque, setRemolque] = useState('')
  const [operador, setOperador] = useState('')
  const [operadorRfc, setOperadorRfc] = useState('')
  const [licencia, setLicencia] = useState('')
  const [operadorDomicilio, setOperadorDomicilio] = useState('')
  const [observaciones, setObservaciones] = useState('Precaptura para revisión del contador y timbrado posterior por PAC autorizado.')
  const [mercancias, setMercancias] = useState<MercanciaCP[]>([{ ...emptyMercancia }])

  // Importadores
  const toast = useToast()
  const { user } = useAuthContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const fromCartaId = searchParams.get('fromCarta')
  const { cartas: cartasEnviadas } = useCartasInstruccion({ status: 'enviada' })
  const [showImportModal, setShowImportModal] = useState(false)
  const [importingPDF, setImportingPDF] = useState(false)
  const [importedCartaId, setImportedCartaId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyCartaInstruccion = (c: CartaInstruccion) => {
    if (c.cliente_nombre)       setCliente(c.cliente_nombre)
    if (c.origen)               setOrigenNombre(c.origen)
    if (c.origen_direccion)     setOrigenDomicilio(c.origen_direccion)
    if (c.destino)              setDestinoNombre(c.destino)
    if (c.destino_direccion)    setDestinoDomicilio(c.destino_direccion)
    if (c.fecha_carga)          setOrigenFechaHora(`${c.fecha_carga}T${c.hora_carga || '08:00'}`)
    if (c.fecha_entrega)        setDestinoFechaHora(`${c.fecha_entrega}T${c.hora_entrega || '18:00'}`)
    if (c.placas_sugeridas)     setPlacaVm(c.placas_sugeridas)
    if (c.operador_sugerido)    setOperador(c.operador_sugerido)
    if (c.mercancias?.length) {
      setMercancias(c.mercancias.map(m => ({
        bienesTransp:      '',
        descripcion:       m.descripcion ?? m.sku ?? '',
        cantidad:          String(m.cantidad ?? ''),
        claveUnidad:       'H87',
        unidad:            m.empaque || 'Pieza',
        pesoKg:            String(m.peso ?? ''),
        valor:             String(m.valor ?? ''),
        materialPeligroso: 'No',
        embalaje:          m.empaque ?? '',
        pedimento:         '',
      })))
    }
    setImportedCartaId(c.id)
    toast.success('Carta importada', `Folio ${c.folio} — ${c.mercancias?.length ?? 0} mercancías`)
  }

  // Si entró con ?fromCarta=<id>, busca y autollena.
  useEffect(() => {
    if (!fromCartaId) return
    let cancelled = false
    supabase.from('cartas_instruccion').select('*').eq('id', fromCartaId).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          toast.error('No se encontró la carta', error?.message ?? 'ID inválido')
          return
        }
        applyCartaInstruccion(data as CartaInstruccion)
        searchParams.delete('fromCarta')
        setSearchParams(searchParams, { replace: true })
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCartaId])

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    setImportingPDF(true)
    try {
      const ext = await extractReceiptItemsFromPT(file)
      if (ext.items.length === 0) {
        toast.error('Sin items detectados', 'El parser no encontró SKUs/cantidades en el archivo.')
        return
      }
      setMercancias(ext.items.map(it => ({
        bienesTransp:      '',
        descripcion:       it.sku,
        cantidad:          String(it.qty),
        claveUnidad:       'H87',
        unidad:            'Pieza',
        pesoKg:            '',
        valor:             '',
        materialPeligroso: 'No',
        embalaje:          '',
        pedimento:         '',
      })))
      toast.success('Archivo importado', `${ext.items.length} mercancías cargadas${ext.ref ? ` · ref ${ext.ref}` : ''}`)
      setShowImportModal(false)
    } catch (e) {
      toast.error('Error al parsear el archivo', e instanceof Error ? e.message : 'Formato no reconocido')
    } finally {
      setImportingPDF(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const marcarComoProcesada = async () => {
    if (!importedCartaId) return
    try {
      await supabase.from('cartas_instruccion').update({
        status:        'procesada',
        procesada_por: user?.name ?? user?.email ?? null,
        procesada_at:  new Date().toISOString(),
      }).eq('id', importedCartaId)
      toast.success('Carta marcada como procesada')
      setImportedCartaId(null)
    } catch (e) {
      toast.error('No se pudo marcar', e instanceof Error ? e.message : 'Error')
    }
  }

  const operadoresBase = operadores.filter(o => !isBaseManiobrista(o.nombre, o.notas))
  const pesoTotal = useMemo(() => mercancias.reduce((sum, item) => sum + (Number(item.pesoKg) || 0), 0), [mercancias])
  const cantidadTotal = useMemo(() => mercancias.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0), [mercancias])

  const faltantes = [
    !cliente && 'Cliente/receptor',
    !rfcCliente && 'RFC receptor',
    !origenFechaHora && 'Fecha salida origen',
    !origenDomicilio && 'Domicilio origen',
    !destinoDomicilio && 'Domicilio destino',
    !permSct && 'Permiso SICT',
    !numPermisoSct && 'Número permiso SICT',
    !configVehicular && 'Config. vehicular',
    !placaVm && 'Placa',
    !operador && 'Operador',
    !operadorRfc && 'RFC operador',
    !licencia && 'Licencia operador',
    !mercancias.some(m => m.descripcion.trim()) && 'Mercancía',
  ].filter(Boolean)

  const updateMercancia = (idx: number, field: keyof MercanciaCP, value: string) => {
    setMercancias(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleVehicle = (id: string) => {
    const veh = vehiculos.find(v => v.id === id)
    if (!veh) return
    setPlacaVm(veh.placa)
    setAnioModelo(String(veh.año ?? ''))
    setConfigVehicular(veh.tipo)
  }

  const handleOperator = (id: string) => {
    const op = operadoresBase.find(o => o.id === id)
    if (!op) return
    setOperador(op.nombre)
    setLicencia(op.licencia_numero ?? '')
  }

  const reset = () => {
    setFolio(`CP-${Date.now().toString().slice(-6)}`)
    setFecha(today)
    setTipoCfdi('Ingreso')
    setIdCcp('')
    setCliente('')
    setRfcCliente('')
    setRegimenCliente('')
    setUsoCfdi('G03')
    setTranspInternac('No')
    setTotalDist('')
    setLogisticaInversa('No')
    setOrigenRfc('')
    setOrigenNombre('')
    setOrigenFechaHora(`${today}T08:00`)
    setOrigenDomicilio('')
    setDestinoRfc('')
    setDestinoNombre('')
    setDestinoFechaHora(`${today}T18:00`)
    setDestinoDomicilio('')
    setPermSct('')
    setNumPermisoSct('')
    setConfigVehicular('')
    setPlacaVm('')
    setAnioModelo('')
    setAseguradora('')
    setPoliza('')
    setRemolque('')
    setOperador('')
    setOperadorRfc('')
    setLicencia('')
    setOperadorDomicilio('')
    setObservaciones('Precaptura para revisión del contador y timbrado posterior por PAC autorizado.')
    setMercancias([{ ...emptyMercancia }])
  }

  const data = {
    folio, fecha, tipoCfdi, idCcp, cliente, rfcCliente, regimenCliente, usoCfdi,
    transpInternac, totalDist, logisticaInversa, origenRfc, origenNombre, origenFechaHora,
    origenDomicilio, destinoRfc, destinoNombre, destinoFechaHora, destinoDomicilio,
    permSct, numPermisoSct, configVehicular, placaVm, anioModelo, aseguradora, poliza,
    remolque, operador, operadorRfc, licencia, operadorDomicilio, observaciones,
    mercancias, pesoTotal, cantidadTotal,
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
              #carta-porte-print, #carta-porte-print * { visibility: visible; }
              #carta-porte-print {
                position: absolute;
                inset: 0;
                width: 100%;
                padding: 0;
                box-shadow: none !important;
                border: none !important;
              }
              .cp-no-print { display: none !important; }
            }
          `}</style>

          <div className="cp-no-print flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Precaptura Carta Porte</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Formato base para revisión contable y posterior timbrado vía PAC autorizado, con CFDI 4.0 + Complemento Carta Porte 3.1.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 flex items-center gap-2 hover:bg-gray-50">
                <RotateCcw size={15} /> Limpiar
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-50"
                title="Autollena los campos desde una Carta de Instrucción enviada por SAC, o desde un PT en PDF/Excel"
              >
                <Inbox size={15} /> Importar
                {cartasEnviadas.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center bg-[#dc3545] text-white text-[10px] font-bold rounded-full w-4 h-4">
                    {cartasEnviadas.length}
                  </span>
                )}
              </button>
              {importedCartaId && (
                <button
                  onClick={marcarComoProcesada}
                  className="h-10 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                  title="Marca la carta importada como procesada — desaparece de la bandeja de SAC"
                >
                  Marcar carta como procesada
                </button>
              )}
              <button onClick={() => window.print()} className="h-10 px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#16304d]">
                <Printer size={15} /> Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="cp-no-print rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 mb-5 flex gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            Este módulo no timbra CFDI por sí mismo. Genera una precaptura de campos para revisión del contador y posterior emisión fiscal vía PAC autorizado.
          </div>

          <div className="cp-no-print grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
              {faltantes.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Faltan datos recomendados para SAT: {faltantes.join(', ')}.
                </div>
              )}

              <Block title="CFDI y receptor">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Folio interno"><input className={inputCls} value={folio} onChange={e => setFolio(e.target.value)} /></Field>
                  <Field label="Fecha"><input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
                  <Field label="Tipo CFDI"><select className={inputCls} value={tipoCfdi} onChange={e => setTipoCfdi(e.target.value)}><option>Ingreso</option><option>Traslado</option></select></Field>
                  <Field label="IdCCP (lo genera timbrado)"><input className={inputCls} value={idCcp} onChange={e => setIdCcp(e.target.value)} placeholder="CCC..." /></Field>
                  <Field label="Cliente">
                    <select className={inputCls} value={cliente} onChange={e => setCliente(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {clientes.map(c => <option key={`${c.codigo}-${c.nombre}`} value={c.nombre}>{c.codigo} - {c.nombre}</option>)}
                    </select>
                  </Field>
                  <Field label="RFC receptor"><input className={inputCls} value={rfcCliente} onChange={e => setRfcCliente(e.target.value.toUpperCase())} /></Field>
                  <Field label="Régimen receptor"><input className={inputCls} value={regimenCliente} onChange={e => setRegimenCliente(e.target.value)} placeholder="601, 603, 626..." /></Field>
                  <Field label="Uso CFDI"><input className={inputCls} value={usoCfdi} onChange={e => setUsoCfdi(e.target.value.toUpperCase())} /></Field>
                </div>
              </Block>

              <Block title="Complemento Carta Porte">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Transp. internacional"><select className={inputCls} value={transpInternac} onChange={e => setTranspInternac(e.target.value)}><option>No</option><option>Sí</option></select></Field>
                  <Field label="Total distancia recorrida km"><input className={inputCls} value={totalDist} onChange={e => setTotalDist(e.target.value)} /></Field>
                  <Field label="Logística inversa"><select className={inputCls} value={logisticaInversa} onChange={e => setLogisticaInversa(e.target.value)}><option>No</option><option>Sí</option></select></Field>
                </div>
              </Block>

              <Block title="Ubicaciones">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="RFC origen"><input className={inputCls} value={origenRfc} onChange={e => setOrigenRfc(e.target.value.toUpperCase())} /></Field>
                  <Field label="Nombre origen"><input className={inputCls} value={origenNombre} onChange={e => setOrigenNombre(e.target.value)} /></Field>
                  <Field label="Salida origen"><input type="datetime-local" className={inputCls} value={origenFechaHora} onChange={e => setOrigenFechaHora(e.target.value)} /></Field>
                  <Field label="Domicilio origen"><textarea className={areaCls} value={origenDomicilio} onChange={e => setOrigenDomicilio(e.target.value)} /></Field>
                  <Field label="RFC destino"><input className={inputCls} value={destinoRfc} onChange={e => setDestinoRfc(e.target.value.toUpperCase())} /></Field>
                  <Field label="Nombre destino"><input className={inputCls} value={destinoNombre} onChange={e => setDestinoNombre(e.target.value)} /></Field>
                  <Field label="Llegada destino"><input type="datetime-local" className={inputCls} value={destinoFechaHora} onChange={e => setDestinoFechaHora(e.target.value)} /></Field>
                  <Field label="Domicilio destino"><textarea className={areaCls} value={destinoDomicilio} onChange={e => setDestinoDomicilio(e.target.value)} /></Field>
                </div>
              </Block>

              <Block title="Autotransporte y figura">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Vehículo">
                    <select className={inputCls} onChange={e => handleVehicle(e.target.value)} defaultValue="">
                      <option value="">Seleccionar...</option>
                      {vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                    </select>
                  </Field>
                  <Field label="Permiso SICT"><input className={inputCls} value={permSct} onChange={e => setPermSct(e.target.value.toUpperCase())} placeholder="TPAF01..." /></Field>
                  <Field label="Número permiso SICT"><input className={inputCls} value={numPermisoSct} onChange={e => setNumPermisoSct(e.target.value)} /></Field>
                  <Field label="Config. vehicular"><input className={inputCls} value={configVehicular} onChange={e => setConfigVehicular(e.target.value)} placeholder="C2, C3, T3S2..." /></Field>
                  <Field label="Placa VM"><input className={inputCls} value={placaVm} onChange={e => setPlacaVm(e.target.value.toUpperCase())} /></Field>
                  <Field label="Año modelo"><input className={inputCls} value={anioModelo} onChange={e => setAnioModelo(e.target.value)} /></Field>
                  <Field label="Aseguradora"><input className={inputCls} value={aseguradora} onChange={e => setAseguradora(e.target.value)} /></Field>
                  <Field label="Póliza"><input className={inputCls} value={poliza} onChange={e => setPoliza(e.target.value)} /></Field>
                  <Field label="Remolque / semirremolque"><input className={inputCls} value={remolque} onChange={e => setRemolque(e.target.value)} /></Field>
                  <Field label="Operador">
                    <select className={inputCls} onChange={e => handleOperator(e.target.value)} defaultValue="">
                      <option value="">Seleccionar...</option>
                      {operadoresBase.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                  </Field>
                  <Field label="Nombre operador"><input className={inputCls} value={operador} onChange={e => setOperador(e.target.value)} /></Field>
                  <Field label="RFC operador"><input className={inputCls} value={operadorRfc} onChange={e => setOperadorRfc(e.target.value.toUpperCase())} /></Field>
                  <Field label="Licencia"><input className={inputCls} value={licencia} onChange={e => setLicencia(e.target.value)} /></Field>
                  <Field label="Domicilio operador"><textarea className={areaCls} value={operadorDomicilio} onChange={e => setOperadorDomicilio(e.target.value)} /></Field>
                </div>
              </Block>

              <Field label="Observaciones para contador"><textarea className={areaCls} value={observaciones} onChange={e => setObservaciones(e.target.value)} /></Field>
            </section>

            <section className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-[#1e3a5f]">Mercancías</h2>
                  <button onClick={() => setMercancias(prev => [...prev, { ...emptyMercancia }])} className="text-xs font-semibold text-[#1e3a5f] flex items-center gap-1 hover:underline">
                    <Plus size={13} /> Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {mercancias.map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500">Mercancía {idx + 1}</span>
                        {mercancias.length > 1 && <button onClick={() => setMercancias(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input className={inputCls} placeholder="Clave SAT bienes" value={m.bienesTransp} onChange={e => updateMercancia(idx, 'bienesTransp', e.target.value)} />
                        <input className={inputCls} placeholder="Descripción" value={m.descripcion} onChange={e => updateMercancia(idx, 'descripcion', e.target.value)} />
                        <input className={inputCls} placeholder="Cantidad" value={m.cantidad} onChange={e => updateMercancia(idx, 'cantidad', e.target.value)} />
                        <input className={inputCls} placeholder="Clave unidad" value={m.claveUnidad} onChange={e => updateMercancia(idx, 'claveUnidad', e.target.value.toUpperCase())} />
                        <input className={inputCls} placeholder="Unidad" value={m.unidad} onChange={e => updateMercancia(idx, 'unidad', e.target.value)} />
                        <input className={inputCls} placeholder="Peso kg" value={m.pesoKg} onChange={e => updateMercancia(idx, 'pesoKg', e.target.value)} />
                        <input className={inputCls} placeholder="Valor mercancía" value={m.valor} onChange={e => updateMercancia(idx, 'valor', e.target.value)} />
                        <select className={inputCls} value={m.materialPeligroso} onChange={e => updateMercancia(idx, 'materialPeligroso', e.target.value)}><option>No</option><option>Sí</option></select>
                        <input className={inputCls} placeholder="Embalaje" value={m.embalaje} onChange={e => updateMercancia(idx, 'embalaje', e.target.value)} />
                        <input className={inputCls} placeholder="Pedimento / doc aduanero" value={m.pedimento} onChange={e => updateMercancia(idx, 'pedimento', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <CartaPortePreview data={data} />
            </section>
          </div>
        </main>
      </div>

      {/* Modal Importar */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 ci-no-print">
          <div className="bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <Inbox size={18} /> Importar a Carta Porte
              </h2>
              <button type="button" onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Sección 1: cartas de SAC */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Carta de Instrucción enviada por SAC</h3>
                <p className="text-[11px] text-gray-500 mb-2">
                  Selecciona una para autollenar cliente, origen, destino, fechas, mercancías y operador sugerido.
                </p>
                {cartasEnviadas.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-6 border border-dashed border-gray-200 rounded-lg">
                    No hay cartas pendientes de SAC.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {cartasEnviadas.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { applyCartaInstruccion(c); setShowImportModal(false) }}
                        className="w-full text-left bg-white border border-gray-200 hover:border-[#1e3a5f] hover:bg-blue-50/30 rounded-lg p-2.5 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-[#1e3a5f]">{c.folio}</p>
                            <p className="text-sm font-semibold text-gray-800 truncate">{c.cliente_nombre}</p>
                            <p className="text-[11px] text-gray-500 truncate">{c.origen ?? '—'} → {c.destino} · {c.mercancias.length} mercancías · {c.total_peso_kg} kg</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* Sección 2: archivo PDF/Excel */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Importar desde archivo</h3>
                <p className="text-[11px] text-gray-500 mb-2">
                  Sube un Pick Ticket en PDF o Excel. El parser intenta extraer SKU + cantidad y rellena las mercancías.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={e => handleImportFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={importingPDF}
                  className="w-full h-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#1e3a5f] hover:bg-blue-50/30 text-sm text-gray-600 hover:text-[#1e3a5f] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {importingPDF ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  {importingPDF ? 'Procesando…' : 'Subir PDF o Excel'}
                </button>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Solo extrae mercancías. Cliente, origen, destino y datos del vehículo se llenan a mano.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className={labelCls}>{label}</span>{children}</label>
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-3">{title}</h2>{children}</section>
}

function CartaPortePreview({ data }: { data: any }) {
  return (
    <article id="carta-porte-print" className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-gray-800">
      <div className="flex items-start justify-between border-b-2 border-[#1e3a5f] pb-4 mb-5">
        <div>
          <p className="text-2xl font-extrabold text-[#1e3a5f]">PRECAPTURA CARTA PORTE</p>
          <p className="text-xs font-semibold text-gray-500 mt-1">CFDI 4.0 · Complemento Carta Porte 3.1 · Revisión contable</p>
        </div>
        <div className="text-right text-xs">
          <p><b>Folio:</b> {data.folio || '—'}</p>
          <p><b>Fecha:</b> {data.fecha || '—'}</p>
          <p><b>Tipo CFDI:</b> {data.tipoCfdi || '—'}</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 mb-5">
        Documento preliminar. No es CFDI, no está timbrado y debe validarse contra catálogos SAT antes de emisión fiscal por PAC autorizado.
      </div>

      <Section title="Receptor y complemento">
        <DocGrid rows={[
          ['Cliente', data.cliente],
          ['RFC receptor', data.rfcCliente],
          ['Régimen', data.regimenCliente],
          ['Uso CFDI', data.usoCfdi],
          ['IdCCP', data.idCcp || 'Se genera al timbrar'],
          ['Transp. internacional', data.transpInternac],
          ['Distancia km', data.totalDist],
          ['Logística inversa', data.logisticaInversa],
        ]} />
      </Section>

      <Section title="Ubicaciones">
        <DocGrid rows={[
          ['Origen', `${data.origenNombre || '—'} · ${data.origenRfc || '—'}`],
          ['Salida', data.origenFechaHora],
          ['Domicilio origen', data.origenDomicilio],
          ['Destino', `${data.destinoNombre || '—'} · ${data.destinoRfc || '—'}`],
          ['Llegada', data.destinoFechaHora],
          ['Domicilio destino', data.destinoDomicilio],
        ]} />
      </Section>

      <Section title="Mercancías">
        <table className="w-full text-[11px] border border-gray-200">
          <thead className="bg-gray-50">
            <tr>{['Clave SAT', 'Descripción', 'Cant.', 'Unidad', 'Peso kg', 'Mat. peligroso', 'Pedimento'].map(h => <th key={h} className="text-left p-2 border-b">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.mercancias.map((m: MercanciaCP, idx: number) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{m.bienesTransp || '—'}</td>
                <td className="p-2">{m.descripcion || '—'}</td>
                <td className="p-2">{m.cantidad || '—'}</td>
                <td className="p-2">{m.claveUnidad || '—'} {m.unidad || ''}</td>
                <td className="p-2">{m.pesoKg || '—'}</td>
                <td className="p-2">{m.materialPeligroso || '—'} {m.embalaje ? `· ${m.embalaje}` : ''}</td>
                <td className="p-2">{m.pedimento || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">Cantidad total: <b>{data.cantidadTotal}</b> · Peso bruto total: <b>{data.pesoTotal} kg</b></p>
      </Section>

      <Section title="Autotransporte y figuras">
        <DocGrid rows={[
          ['Permiso SICT', data.permSct],
          ['Número permiso', data.numPermisoSct],
          ['Config. vehicular', data.configVehicular],
          ['Placa VM', data.placaVm],
          ['Año modelo', data.anioModelo],
          ['Seguro', `${data.aseguradora || '—'} · ${data.poliza || '—'}`],
          ['Remolque', data.remolque],
          ['Operador', `${data.operador || '—'} · ${data.operadorRfc || '—'}`],
          ['Licencia', data.licencia],
          ['Domicilio operador', data.operadorDomicilio],
        ]} />
      </Section>

      <Section title="Observaciones">
        <p className="text-xs whitespace-pre-wrap">{data.observaciones || '—'}</p>
      </Section>

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
