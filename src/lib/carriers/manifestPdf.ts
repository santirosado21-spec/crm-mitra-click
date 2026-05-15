// Generador de PDF de manifiesto con jsPDF.
// Layout carta con: logo / nombre Supply Chain MX, fecha, carrier, listado
// de tracking numbers y línea de firma del transportista.

import { jsPDF } from 'jspdf'

export interface ManifestGuiaLine {
  tracking_number: string
  cliente:         string
  destino:         string
}

export interface ManifestPdfData {
  folio:    string
  carrier:  string
  fecha:    string
  guias:    ManifestGuiaLine[]
}

/** Genera el PDF del manifiesto y devuelve un Blob URL listo para imprimir. */
export function generateManifestPDF(data: ManifestPdfData): string {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()

  // Cabecera
  doc.setFontSize(16)
  doc.setTextColor(30, 58, 95) // navy
  doc.text('Supply Chain MX', 20, 22)
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text('Manifiesto de paquetería', 20, 30)

  doc.setFontSize(10)
  doc.setTextColor(90, 90, 90)
  doc.text(`Folio: ${data.folio}`, pageW - 20, 22, { align: 'right' })
  doc.text(`Fecha: ${data.fecha}`, pageW - 20, 28, { align: 'right' })
  doc.text(`Carrier: ${data.carrier.toUpperCase()}`, pageW - 20, 34, { align: 'right' })

  doc.setDrawColor(200, 200, 200)
  doc.line(20, 38, pageW - 20, 38)

  // Encabezados de tabla
  let y = 47
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text('#', 20, y)
  doc.text('TRACKING', 30, y)
  doc.text('CLIENTE', 95, y)
  doc.text('DESTINO', 140, y)
  y += 4
  doc.line(20, y, pageW - 20, y)
  y += 6

  doc.setTextColor(40, 40, 40)
  data.guias.forEach((g, idx) => {
    if (y > 240) { doc.addPage(); y = 25 }
    doc.text(String(idx + 1), 20, y)
    doc.text(g.tracking_number.slice(0, 28), 30, y)
    doc.text(g.cliente.slice(0, 22), 95, y)
    doc.text(g.destino.slice(0, 28), 140, y)
    y += 6
  })

  // Total + firma
  y += 6
  doc.setDrawColor(200, 200, 200)
  doc.line(20, y, pageW - 20, y)
  y += 8
  doc.setFontSize(10)
  doc.setTextColor(30, 58, 95)
  doc.text(`Total de guías: ${data.guias.length}`, 20, y)

  y += 24
  doc.setDrawColor(120, 120, 120)
  doc.line(20, y, 90, y)
  doc.line(pageW - 90, y, pageW - 20, y)
  y += 5
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Firma operador Supply Chain MX', 20, y)
  doc.text('Firma / sello transportista', pageW - 90, y)

  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}
