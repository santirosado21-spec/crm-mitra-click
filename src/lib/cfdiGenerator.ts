/**
 * CFDI 4.0 XML Generator
 *
 * Generates DRAFT (pre-timbrado) CFDI XMLs compliant with the SAT Anexo 20
 * version 4.0 schema. The output is imported by ContPAQ (or another PAC
 * software) which then handles the actual timbrado via the cert & key.
 *
 * IMPORTANT: This does NOT sign, seal or timbrar the CFDI. The "Sello"
 * and "Certificado" attributes are left empty — ContPAQ fills them at
 * import time using its configured certificate.
 *
 * Reference: http://omawww.sat.gob.mx/tramitesyservicios/Paginas/anexo_20.htm
 */
import { getSatProductCode, getSatUnitCode } from './satCatalogs'

/* ─── Types ──────────────────────────────────────────────────────────── */
export interface CFDIEmisor {
  rfc:                string
  razonSocial:        string
  regimenFiscalSat:   string        // '601', etc.
  cpExpedicion:       string
}

export interface CFDIReceptor {
  rfc:                string
  razonSocial:        string
  cpFiscal:           string        // domicilio fiscal receptor (solo CP)
  regimenFiscalSat:   string
  usoCfdi:            string        // 'G03', etc.
}

export interface CFDIConcepto {
  claveProdServ?:     string        // If omitted, derived from `categoria`
  claveUnidad?:       string        // If omitted, derived from `unidad`
  categoria:          string        // 'almacenaje' | 'transporte' | ...
  unidad:             string        // 'TARIMA' | 'M2' | 'HORA' | ...
  descripcion:        string
  cantidad:           number
  valorUnitario:      number        // antes de IVA
  descuento?:         number
  aplicaIVA:          boolean       // default true (16%)
}

export interface CFDIInput {
  serie:              string
  folio:              number
  fecha:              Date
  emisor:             CFDIEmisor
  receptor:           CFDIReceptor
  conceptos:          CFDIConcepto[]
  formaPago:          string        // '99' por definir (typical for PPD)
  metodoPago:         'PUE' | 'PPD' // PUE: una sola exhibición; PPD: diferido
  moneda:             'MXN' | 'USD'
  condicionesPago?:   string
}

export interface CFDIOutput {
  xml:                string
  subtotal:           number
  iva:                number
  total:              number
  folioCompleto:      string   // 'A-001'
}

/* ─── Helper: XML-escape text ─── */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/* ─── Helper: format number with 2 decimals (SAT requires) ─── */
function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals)
}

/* ─── Helper: format date as SAT expects: YYYY-MM-DDTHH:mm:ss ─── */
function fmtFecha(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/* ─── Validators ─── */
function validateRFC(rfc: string): void {
  const re = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/
  if (!re.test(rfc.toUpperCase())) {
    throw new Error(`RFC inválido: "${rfc}"`)
  }
}
function validateCP(cp: string): void {
  if (!/^\d{5}$/.test(cp)) throw new Error(`Código postal inválido: "${cp}"`)
}

/* ─── Main generator ─────────────────────────────────────────────────── */
export function generateCFDIXml(input: CFDIInput): CFDIOutput {
  validateRFC(input.emisor.rfc)
  validateRFC(input.receptor.rfc)
  validateCP(input.emisor.cpExpedicion)
  validateCP(input.receptor.cpFiscal)

  if (input.conceptos.length === 0) {
    throw new Error('El CFDI debe tener al menos un concepto')
  }

  // Compute totals
  let subtotal = 0
  let totalIVA = 0
  const conceptosWithCalc = input.conceptos.map(c => {
    const importe = c.cantidad * c.valorUnitario - (c.descuento ?? 0)
    const iva = c.aplicaIVA ? importe * 0.16 : 0
    subtotal += importe
    totalIVA += iva
    return { ...c, importe, iva }
  })
  const total = subtotal + totalIVA

  // Build concepts XML
  const conceptosXml = conceptosWithCalc.map(c => {
    const claveProdServ = c.claveProdServ ?? getSatProductCode(c.categoria)
    const claveUnidad   = c.claveUnidad   ?? getSatUnitCode(c.unidad)
    const objetoImp = c.aplicaIVA ? '02' : '01'  // 02 = sí objeto y sí obligado; 01 = no objeto

    const impuestosXml = c.aplicaIVA
      ? `
        <cfdi:Impuestos>
          <cfdi:Traslados>
            <cfdi:Traslado Base="${fmt(c.importe)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${fmt(c.iva)}"/>
          </cfdi:Traslados>
        </cfdi:Impuestos>`
      : ''

    return `      <cfdi:Concepto
        ClaveProdServ="${claveProdServ}"
        Cantidad="${fmt(c.cantidad, c.cantidad % 1 === 0 ? 0 : 6)}"
        ClaveUnidad="${claveUnidad}"
        Unidad="${xmlEscape(c.unidad)}"
        Descripcion="${xmlEscape(c.descripcion)}"
        ValorUnitario="${fmt(c.valorUnitario)}"
        Importe="${fmt(c.importe)}"
        ObjetoImp="${objetoImp}"${c.descuento ? `
        Descuento="${fmt(c.descuento)}"` : ''}>${impuestosXml}
      </cfdi:Concepto>`
  }).join('\n')

  // Totals impuestos block
  const impuestosGlobal = totalIVA > 0 ? `
  <cfdi:Impuestos TotalImpuestosTrasladados="${fmt(totalIVA)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${fmt(subtotal)}" Importe="${fmt(totalIVA)}" Impuesto="002" TasaOCuota="0.160000" TipoFactor="Tasa"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>` : ''

  // Build main Comprobante XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"
  Serie="${xmlEscape(input.serie)}"
  Folio="${input.folio}"
  Fecha="${fmtFecha(input.fecha)}"
  FormaPago="${input.formaPago}"
  NoCertificado=""
  Certificado=""
  Sello=""
  SubTotal="${fmt(subtotal)}"
  Moneda="${input.moneda}"
  Total="${fmt(total)}"
  TipoDeComprobante="I"
  Exportacion="01"
  MetodoPago="${input.metodoPago}"
  LugarExpedicion="${input.emisor.cpExpedicion}"${input.condicionesPago ? `
  CondicionesDePago="${xmlEscape(input.condicionesPago)}"` : ''}>
  <cfdi:Emisor
    Rfc="${input.emisor.rfc.toUpperCase()}"
    Nombre="${xmlEscape(input.emisor.razonSocial)}"
    RegimenFiscal="${input.emisor.regimenFiscalSat}"/>
  <cfdi:Receptor
    Rfc="${input.receptor.rfc.toUpperCase()}"
    Nombre="${xmlEscape(input.receptor.razonSocial)}"
    DomicilioFiscalReceptor="${input.receptor.cpFiscal}"
    RegimenFiscalReceptor="${input.receptor.regimenFiscalSat}"
    UsoCFDI="${input.receptor.usoCfdi}"/>
  <cfdi:Conceptos>
${conceptosXml}
  </cfdi:Conceptos>${impuestosGlobal}
</cfdi:Comprobante>`

  return {
    xml,
    subtotal: Math.round(subtotal * 100) / 100,
    iva:      Math.round(totalIVA * 100) / 100,
    total:    Math.round(total * 100) / 100,
    folioCompleto: `${input.serie}-${String(input.folio).padStart(6, '0')}`,
  }
}

/* ─── Helper: download a single XML as file ─── */
export function downloadCFDI(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xml') ? filename : `${filename}.xml`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
