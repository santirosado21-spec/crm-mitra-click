import type { OperationStatus, OperationType } from '../types'

// ── Currency ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// ── Dates ───────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-MX', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ── References ──────────────────────────────────────────────────────────────

export function generateReference(count: number, prefix = 'SCLER'): string {
  return `${prefix}${String(count).padStart(5, '0')}`
}

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OperationStatus, string> = {
  en_proceso: 'En proceso',
  cerrada:    'Cerrada',
  pendiente:  'Pendiente',
  cancelada:  'Cancelada',
}

const STATUS_STYLES: Record<OperationStatus, string> = {
  en_proceso: 'bg-[#1e3a5f] text-white',
  cerrada:    'bg-[#28a745] text-white',
  pendiente:  'bg-[#ffc107] text-black',
  cancelada:  'bg-[#6c757d] text-white',
}

export function getStatusLabel(status: OperationStatus): string {
  return STATUS_LABELS[status] ?? status
}

export function getStatusStyle(status: OperationStatus): string {
  return STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'
}

// ── Type helpers ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<OperationType, string> = {
  entrada:           'Entrada',
  salida:            'Salida',
  recoleccion:       'Recolección',
  cross_dock:        'Cross dock',
  actividad_almacen: 'Actividad almacén',
  flete:             'Flete',
  maniobra:          'Maniobra',
}

export function getTypeLabel(type: OperationType): string {
  return TYPE_LABELS[type] ?? type
}

// ── Misc ─────────────────────────────────────────────────────────────────────

export function truncate(str: string, max = 40): string {
  return str.length <= max ? str : `${str.slice(0, max)}…`
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
