export const formatCurrency = (value: number, compact = false) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: compact && Math.abs(value) >= 1_000_000 ? 1 : 0,
    minimumFractionDigits: compact && Math.abs(value) >= 1_000_000 ? 1 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value)

/** Importe exacto con centavos, para documentos. */
export const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)

export const formatPercent = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value) + '%'

/** 0.953 → "95%". Para avances, participaciones y conversiones expresadas como fracción. */
export const formatRatio = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: digits }).format(value)

export const formatDate =(value: string, withTime = false) =>
  new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  }).format(new Date(value))

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

/** Tono de una etiqueta de estado. Lo que no está en la lista se muestra neutro. */
export const statusTone = (status: string) => {
  if (['Activo', 'Activa', 'Suficiente', 'Sin diferencia', 'Ajustado', 'Resuelta', 'Ganada', 'Entregado', 'Entregada', 'Recibida', 'Verificada', 'Pagada', 'Pagado', 'Resuelto'].includes(status)) return 'success'
  if (['Negativo', 'Abierta', 'Perdida', 'Cancelado', 'Cancelada', 'Rechazada', 'Con incidencia', 'Vencida', 'Alta'].includes(status)) return 'danger'
  if (['Pendiente', 'Bajo', 'Sin familia', 'En negociación', 'Parcial', 'En compra', 'En surtido', 'Abierto', 'En proceso', 'Media'].includes(status)) return 'warning'
  if (['Enviada', 'Enviado', 'Confirmado', 'En ruta', 'Programado', 'Emitida', 'Nuevo', 'Nueva'].includes(status)) return 'info'
  return 'neutral'
}
