export const formatCurrency = (value: number, compact = false) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: compact && Math.abs(value) >= 1_000_000 ? 1 : 0,
    minimumFractionDigits: compact && Math.abs(value) >= 1_000_000 ? 1 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value)

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
  if (['Activo', 'Activa', 'Suficiente', 'Sin diferencia', 'Ajustado', 'Resuelta'].includes(status)) return 'success'
  if (['Negativo', 'Abierta'].includes(status)) return 'danger'
  if (['Pendiente', 'Bajo', 'Sin familia'].includes(status)) return 'warning'
  return 'neutral'
}
