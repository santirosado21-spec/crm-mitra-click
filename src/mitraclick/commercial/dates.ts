// Fechas de negocio como 'YYYY-MM-DD'. Toda la aritmética se hace en UTC para que
// sumar días nunca se desplace por horario de verano o zona horaria del navegador.

const DAY_MS = 86_400_000
const pad = (value: number) => String(value).padStart(2, '0')

export const parseKey = (key: string) => new Date(`${key}T00:00:00Z`)

export const toKey = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

export const addDays = (key: string, days: number) => toKey(new Date(parseKey(key).getTime() + days * DAY_MS))

/** Días enteros de `from` a `to` (positivo si `to` es posterior). */
export const daysBetween = (from: string, to: string) =>
  Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / DAY_MS)

export const monthOf = (key: string) => key.slice(0, 7)

export const firstDayOfMonth = (key: string) => `${monthOf(key)}-01`

export const daysInMonth = (key: string) => {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Mismo día del mes anterior, recortado al último día si no existe (31 → 30). */
export const sameDayPreviousMonth = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  const prevMonthLastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()
  return toKey(new Date(Date.UTC(year, month - 2, Math.min(day, prevMonthLastDay))))
}

/** 0 = domingo … 6 = sábado. */
export const dayOfWeek = (key: string) => parseKey(key).getUTCDay()

/** Fecha local del navegador (México) como 'YYYY-MM-DD'. */
export const localTodayKey = (now = new Date()) =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

export const inRange = (key: string, start: string, end: string) => key >= start && key <= end

export const formatDayLabel = (key: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('es-MX', { ...options, timeZone: 'UTC' }).format(parseKey(key))
