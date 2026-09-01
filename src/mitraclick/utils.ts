export const formatCurrency = (value: number, compact = false) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value)

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)

export const formatPercent = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value) + '%'

export const formatDate = (value: string, withTime = false) =>
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

export const statusTone = (status: string) => {
  if (['Ganado', 'Aceptada', 'Cliente', 'Completado', 'Activa'].includes(status)) return 'success'
  if (['Perdido', 'Rechazada', 'Vencida', 'Inactivo'].includes(status)) return 'danger'
  if (['Negociación', 'Vista', 'Pendiente'].includes(status)) return 'warning'
  if (['Cotización', 'Enviada', 'Calificado'].includes(status)) return 'info'
  return 'neutral'
}
