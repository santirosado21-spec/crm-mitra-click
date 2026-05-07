// Generador de etiqueta PDF mock con jsPDF.
// Layout 4×6" (estándar de etiqueta de paquetería) con:
//   - Logo Supply Chain MX en la cabecera
//   - Carrier + servicio elegido + tracking number
//   - Origen y destino completos
//   - Peso + dimensiones
//   - Código de barras simulado (líneas verticales — no es escaneable real)
//   - Marca "MODO DEMO — etiqueta no válida para envío real"
//
// Uso:
//   const blob = await generateMockLabelPDF(data)
//   const url = URL.createObjectURL(blob)
//   window.open(url, '_blank')   // abre y dispara dialog de print
//
// El blob se puede guardar en data: URI o subir a Supabase Storage si se
// quiere persistir.

import type { Address, ParcelDimensions, Rate } from './types'

export interface MockLabelData {
  tracking_code: string
  rate:          Rate
  from:          Address
  to:            Address
  parcel:        ParcelDimensions
  cliente:       string
}

const fmtAddress = (a: Address) => [
  a.name,
  a.company,
  a.street1,
  a.street2,
  `${a.city}, ${a.state} ${a.postal_code}`,
  a.country,
  a.phone,
].filter(Boolean).join('\n')

export async function generateMockLabelPDF(data: MockLabelData): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  // 4×6 pulgadas = 101.6 × 152.4 mm. jsPDF usa pt por default; pasamos a mm.
  const doc = new jsPDF({ unit: 'mm', format: [101.6, 152.4] })

  // Header franja navy
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 101.6, 18, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Supply Chain MX', 5, 7)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 220, 240)
  doc.text('TMS de Paqueterías · Etiqueta de envío', 5, 11)
  doc.setFontSize(8)
  doc.text(data.rate.carrier_label.toUpperCase(), 5, 15)

  // Carrier label (esquina derecha)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(data.rate.service_label, 96, 7, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`ETA ${data.rate.delivery_days} día(s)`, 96, 11, { align: 'right' })
  doc.text(`$${data.rate.price_mxn.toLocaleString('es-MX')} MXN`, 96, 15, { align: 'right' })

  // Banner DEMO
  doc.setFillColor(255, 235, 130)
  doc.rect(0, 18, 101.6, 5, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(120, 90, 0)
  doc.text('⚠ MODO DEMO — ETIQUETA NO VÁLIDA PARA ENVÍO REAL', 50.8, 21.5, { align: 'center' })

  // Tracking number gigante
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(data.tracking_code, 50.8, 32, { align: 'center' })

  // Código de barras simulado (líneas verticales)
  const barX = 10, barY = 36, barW = 81.6, barH = 14
  doc.setFillColor(255, 255, 255)
  doc.rect(barX, barY, barW, barH, 'F')
  doc.setDrawColor(0, 0, 0)
  doc.setFillColor(0, 0, 0)
  for (let i = 0; i < 60; i++) {
    const seed = (data.tracking_code.charCodeAt(i % data.tracking_code.length) + i * 7) % 4
    if (seed > 0) {
      const x = barX + (i / 60) * barW
      const w = 0.3 + (seed * 0.25)
      doc.rect(x, barY, w, barH, 'F')
    }
  }

  // Línea separadora
  doc.setDrawColor(180, 180, 180)
  doc.line(5, 54, 96.6, 54)

  // FROM (origen)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(120, 120, 120)
  doc.text('REMITENTE', 5, 58)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(8)
  const fromLines = fmtAddress(data.from).split('\n')
  fromLines.forEach((line, i) => doc.text(line, 5, 62 + i * 3.5))

  // Línea separadora
  doc.line(5, 62 + fromLines.length * 3.5 + 2, 96.6, 62 + fromLines.length * 3.5 + 2)

  // TO (destinatario)
  const toY = 62 + fromLines.length * 3.5 + 6
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(120, 120, 120)
  doc.text('DESTINATARIO', 5, toY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(11)
  const toLines = fmtAddress(data.to).split('\n')
  toLines.forEach((line, i) => doc.text(line, 5, toY + 4 + i * 4.5))

  // Footer info paquete
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(
    `${data.parcel.weight_kg} kg · ${data.parcel.length_cm}×${data.parcel.width_cm}×${data.parcel.height_cm} cm · Cliente: ${data.cliente}`,
    50.8, 148, { align: 'center' },
  )

  return doc.output('blob')
}

/** Helper: descarga el PDF y dispara auto-print en una pestaña nueva. */
export async function printMockLabel(data: MockLabelData): Promise<string> {
  const blob = await generateMockLabelPDF(data)
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  // Auto-print cuando la ventana cargue.
  if (w) {
    w.addEventListener('load', () => {
      try { w.print() } catch { /* ignore — algunos browsers bloquean */ }
    })
  }
  return url
}
