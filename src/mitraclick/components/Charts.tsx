import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyPoint } from '../commercial/selectors'
import { formatDayLabel } from '../commercial/dates'
import { BUSINESS_UNIT_LABEL, type BusinessUnit } from '../domain'
import { CHART, UNIT_COLOR, axisTick } from '../chartTheme'
import { formatCurrency } from '../utils'

const tooltipStyle = { borderRadius: 12, border: `1px solid ${CHART.grid}`, fontSize: 12, color: CHART.ink, boxShadow: '0 8px 24px rgba(48,53,54,.12)' }
const dayTick = (value: string) => formatDayLabel(value, { day: 'numeric', month: 'short' })

/** Venta diaria por unidad de negocio. Barras para periodos cortos, líneas para largos. */
export function DailySalesChart({ points, units = ['mitra', 'mitraclick'], height = 260 }: { points: DailyPoint[]; units?: BusinessUnit[]; height?: number }) {
  const short = points.length <= 14
  const series = units.map((unit) => ({ key: unit, name: BUSINESS_UNIT_LABEL[unit], color: UNIT_COLOR[unit] }))
  const common = { data: points, margin: { left: 0, right: 8, top: 8, bottom: 0 } }
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={CHART.grid} />
      <XAxis dataKey="date" tickFormatter={dayTick} axisLine={false} tickLine={false} tick={axisTick} minTickGap={16} />
      <YAxis tickFormatter={(value) => formatCurrency(Number(value), true)} axisLine={false} tickLine={false} tick={axisTick} width={64} />
      <Tooltip
        contentStyle={tooltipStyle}
        labelFormatter={(label) => formatDayLabel(String(label), { weekday: 'long', day: 'numeric', month: 'long' })}
        formatter={(value, name) => [formatCurrency(Number(value)), name]}
        cursor={{ fill: 'rgba(69,74,73,.06)', stroke: CHART.grid }}
      />
      {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: CHART.muted }} />}
    </>
  )

  return (
    <div style={{ height }} role="img" aria-label={`Venta diaria de ${series.map((item) => item.name).join(' y ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        {short ? (
          <BarChart {...common} barGap={2}>
            {axes}
            {series.map((item) => <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />)}
          </BarChart>
        ) : (
          <LineChart {...common}>
            {axes}
            {series.map((item) => <Line key={item.key} type="monotone" dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }} isAnimationActive={false} />)}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/** Serie única (por ejemplo, un vendedor). */
export function SingleSeriesBars({ points, label, height = 220 }: { points: { date: string; sales: number }[]; label: string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="date" tickFormatter={dayTick} axisLine={false} tickLine={false} tick={axisTick} minTickGap={16} />
          <YAxis tickFormatter={(value) => formatCurrency(Number(value), true)} axisLine={false} tickLine={false} tick={axisTick} width={64} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => formatDayLabel(String(value), { weekday: 'long', day: 'numeric', month: 'long' })} formatter={(value) => [formatCurrency(Number(value)), 'Venta']} cursor={{ fill: 'rgba(69,74,73,.06)' }} />
          <Bar dataKey="sales" fill={CHART.neutral} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
