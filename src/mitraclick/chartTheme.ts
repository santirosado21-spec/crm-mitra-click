// Colores de gráficas. Mismos valores que los tokens --color-mc-series-* de
// index.css; Recharts necesita hex literales en props (fill/stroke).
// Paleta categórica validada con la skill dataviz (CVD ΔE ≥ 9.2, visión normal ≥ 27.6).
// Regla: el color sigue a la entidad, nunca al orden; 6+ series → "Otros".

import type { BusinessUnit } from './domain'

export const SERIES = ['#3a6ea5', '#eda100', '#4a3aa7', '#1baf7a', '#eb6834'] as const
export const SERIES_OTHER = '#a1a4a2'

export const UNIT_COLOR: Record<BusinessUnit, string> = {
  mitra: SERIES[0],
  mitraclick: SERIES[1],
}

export const CHART = {
  grid: '#ecebe5',
  axis: '#767a78',
  ink: '#303536',
  muted: '#676b69',
  surface: '#ffffff',
  /** Marcas neutras de una sola serie (magnitud). */
  neutral: '#454a49',
  success: '#1f7a4d',
  warning: '#a35f00',
  danger: '#b42318',
} as const

export const axisTick = { fill: CHART.axis, fontSize: 11 }
