/**
 * Bind ERP API Client (Stub)
 * TODO: Replace with real API calls when Bind ERP credentials are available
 *
 * Bind ERP manages: invoicing (CFDI), timbrado fiscal, accounting
 * Flow: Proforma approved → Create invoice in Bind → Bind sends to ContpaqI → CFDI timbrado
 */

export interface BindInvoice {
  folio: string
  uuid: string | null
  status: 'PENDIENTE' | 'ENVIADA' | 'TIMBRADA' | 'PAGADA' | 'CANCELADA'
  total: number
  createdAt: string
}

export interface BindConcepto {
  descripcion: string
  cantidad: number
  valorUnitario: number
}

// const BIND_BASE_URL = import.meta.env.VITE_BIND_API_URL || 'https://api.bind.com.mx'

export async function createBindInvoice(_data: {
  clienteRFC: string
  conceptos: BindConcepto[]
}): Promise<BindInvoice | null> {
  // TODO: Replace with real API call
  console.log('[Bind ERP Stub] createBindInvoice called — returning null')
  return null
}

export async function getBindInvoiceStatus(_folio: string): Promise<string | null> {
  // TODO: Replace with real API call
  console.log('[Bind ERP Stub] getBindInvoiceStatus called')
  return null
}

export async function cancelBindInvoice(_folio: string): Promise<boolean> {
  // TODO: Replace with real API call
  console.log('[Bind ERP Stub] cancelBindInvoice called')
  return false
}
