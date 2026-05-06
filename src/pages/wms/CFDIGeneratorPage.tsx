import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, AlertTriangle, Settings, FileCode, RefreshCw } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { supabase } from '../../lib/supabase'
import { useMonthlyStorageCalc, monthName } from '../../hooks/useMonthlyStorageCalc'
import { generateCFDIXml, downloadCFDI, type CFDIEmisor, type CFDIReceptor, type CFDIConcepto } from '../../lib/cfdiGenerator'

interface EmisorRow {
  rfc: string
  razon_social: string
  regimen_fiscal_sat: string
  cp_expedicion: string
  serie_default: string
  folio_proximo: number
}

interface ClientRow {
  id: string
  name: string
  codigo: string | null
  rfc: string | null
  razon_social: string | null
  cp_fiscal: string | null
  regimen_fiscal_sat: string | null
  uso_cfdi_default: string | null
  extensiv_customer_id: number | null
  is_active: boolean
}

export function CFDIGeneratorPage() {
  const navigate = useNavigate()
  const today = new Date()
  const defaultDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const [year, setYear] = useState(defaultDate.getFullYear())
  const [month, setMonth] = useState(defaultDate.getMonth() + 1)

  const [emisor, setEmisor] = useState<EmisorRow | null>(null)
  const [clientsByCodigo, setClientsByCodigo] = useState<Map<string, ClientRow>>(new Map())
  const [loadingConfig, setLoadingConfig] = useState(true)

  const { rows, status, fetchNow } = useMonthlyStorageCalc(year, month)
  const [error, setError] = useState('')
  const [generatedFolio, setGeneratedFolio] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      setLoadingConfig(true)
      const [{ data: emData }, { data: clData }] = await Promise.all([
        supabase.from('emisor_config').select('*').eq('id', 1).single(),
        supabase.from('clients').select('id, name, codigo, rfc, razon_social, cp_fiscal, regimen_fiscal_sat, uso_cfdi_default, extensiv_customer_id, is_active').eq('is_active', true),
      ])
      if (emData) setEmisor(emData as EmisorRow)
      if (clData) {
        const m = new Map<string, ClientRow>()
        for (const c of clData as ClientRow[]) {
          if (c.codigo) m.set(c.codigo, c)
        }
        setClientsByCodigo(m)
      }
      setLoadingConfig(false)
    })()
  }, [])

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]

  const rowsReady = useMemo(() => {
    return rows.map(r => {
      const client = r.clienteCodigo ? clientsByCodigo.get(r.clienteCodigo) : null
      const hasFiscalData = !!(client?.rfc && client.razon_social && client.cp_fiscal && client.regimen_fiscal_sat)
      return {
        ...r,
        client,
        hasFiscalData,
        canGenerate: r.storageMXN > 0 && hasFiscalData && !!emisor,
      }
    })
  }, [rows, clientsByCodigo, emisor])

  const handleGenerate = async (idx: number) => {
    setError('')
    const row = rowsReady[idx]
    if (!row.client || !row.hasFiscalData || !emisor) {
      setError('Datos incompletos para este cliente')
      return
    }
    try {
      const emisorInput: CFDIEmisor = {
        rfc:               emisor.rfc,
        razonSocial:       emisor.razon_social,
        regimenFiscalSat:  emisor.regimen_fiscal_sat,
        cpExpedicion:      emisor.cp_expedicion,
      }
      const receptor: CFDIReceptor = {
        rfc:               row.client.rfc!,
        razonSocial:       row.client.razon_social!,
        cpFiscal:          row.client.cp_fiscal!,
        regimenFiscalSat:  row.client.regimen_fiscal_sat!,
        usoCfdi:           row.client.uso_cfdi_default ?? 'G03',
      }
      const conceptos: CFDIConcepto[] = [{
        categoria:     'almacenaje',
        unidad:        row.tariffUnit ?? 'SERVICIO',
        descripcion:   `${row.tariffConcepto ?? 'Almacenaje'} — ${monthName(month)} ${year}`,
        cantidad:      row.tariffUnit === 'FIJO_MENSUAL' ? 1 : (row.tariffUnit === 'M2' ? row.totalM2 : row.positions),
        valorUnitario: row.tariffUnit === 'FIJO_MENSUAL' ? row.storageMXN : row.tariffRate,
        aplicaIVA:     true,
      }]

      // Get next folio from emisor
      const nextFolio = emisor.folio_proximo

      const out = generateCFDIXml({
        serie:       emisor.serie_default,
        folio:       nextFolio,
        fecha:       new Date(),
        emisor:      emisorInput,
        receptor,
        conceptos,
        formaPago:   '99',   // Por definir (typical PPD)
        metodoPago:  'PPD',  // Pago en parcialidades o diferido
        moneda:      'MXN',
        condicionesPago: `Pago a 30 días — ${monthName(month)} ${year}`,
      })

      // Persist draft + increment folio
      await supabase.from('cfdi_drafts').insert({
        cliente_codigo: row.clienteCodigo,
        cliente_rfc:    row.client.rfc,
        serie:          emisor.serie_default,
        folio:          nextFolio,
        fecha:          new Date().toISOString(),
        periodo:        `${year}-${String(month).padStart(2, '0')}`,
        subtotal:       out.subtotal,
        iva:            out.iva,
        total:          out.total,
        xml_content:    out.xml,
        estado:         'borrador',
        conceptos_json: conceptos,
      })

      await supabase.from('emisor_config').update({ folio_proximo: nextFolio + 1 }).eq('id', 1)
      setEmisor(prev => prev ? { ...prev, folio_proximo: nextFolio + 1 } : prev)
      setGeneratedFolio(nextFolio)

      downloadCFDI(out.xml, `CFDI_${out.folioCompleto}_${row.clienteCodigo}.xml`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar CFDI')
    }
  }

  if (loadingConfig) {
    return (
      <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
        <Header />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y p-6">
            <p className="text-sm text-gray-400">Cargando...</p>
          </main>
        </div>
      </div>
    )
  }

  const missingEmisor = !emisor || !emisor.rfc || emisor.rfc === 'XAXX010101000'

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y p-6">
          <button
            onClick={() => navigate('/wms')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1e3a5f] mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Volver a WMS
          </button>

          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f]">Generador CFDI 4.0</h1>
              <p className="text-xs text-gray-500 mt-1">
                Genera XMLs CFDI 4.0 listos para timbrar en ContPAQ. Datos del storage vienen del Bridge Facturación.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/wms/emisor-config')}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Settings size={12} /> Datos Emisor
              </button>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                {months.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={fetchNow}
                disabled={status === 'loading'}
                className="flex items-center gap-1 h-9 px-3 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#16304d] disabled:opacity-60"
              >
                <RefreshCw size={12} className={status === 'loading' ? 'animate-spin' : ''} />
                Recargar
              </button>
            </div>
          </div>

          {missingEmisor && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>
                Aún no tienes configurados los datos del Emisor.
                <button onClick={() => navigate('/wms/emisor-config')} className="underline ml-1 font-semibold">
                  Configurar ahora
                </button>
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {generatedFolio !== null && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              CFDI generado con folio <span className="font-mono font-bold">{emisor?.serie_default}-{String(generatedFolio).padStart(6, '0')}</span> · XML descargado
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase text-gray-500">RFC</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase text-gray-500">Subtotal</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase text-gray-500">IVA</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase text-gray-500">Total</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase text-gray-500">Estado</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody>
                {rowsReady.map((r, idx) => {
                  const subtotal = r.storageMXN
                  const iva = subtotal * 0.16
                  const total = subtotal + iva
                  return (
                    <tr key={r.customerId || r.customerName} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <div className="text-sm font-semibold text-gray-800">{r.customerName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{r.clienteCodigo ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-600">
                        {r.client?.rfc ?? <span className="text-red-500 italic">Sin RFC</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                        ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                        ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-[#1e3a5f]">
                        ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {!r.storageMXN ? (
                          <span className="text-[10px] text-gray-300">sin storage</span>
                        ) : !r.hasFiscalData ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold">
                            <AlertTriangle size={10} /> Datos fiscales faltantes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-semibold">
                            Listo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleGenerate(idx)}
                          disabled={!r.canGenerate || missingEmisor}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-[11px] font-semibold hover:bg-[#16304d] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <FileCode size={11} /> Generar XML
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {rowsReady.length === 0 && status === 'ready' && (
                  <tr><td colSpan={7} className="text-center py-12 text-xs text-gray-400">Sin datos para este periodo</td></tr>
                )}
                {status === 'loading' && (
                  <tr><td colSpan={7} className="text-center py-12 text-xs text-gray-400">Calculando...</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
            <Download size={10} />
            Al hacer click "Generar XML" se descarga el archivo y se guarda un borrador en el CRM. ContPAQ timbrará cada XML con su PAC.
          </p>
        </main>
      </div>
    </div>
  )
}
