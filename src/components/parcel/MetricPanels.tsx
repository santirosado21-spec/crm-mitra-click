import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import type { Bucket } from '../../hooks/useShipmentProfileMetrics'

export const CHART_COLORS = ['#1e3a5f', '#c8373c', '#28a745', '#ffc107', '#3b82f6', '#8b5cf6', '#f97316', '#14b8a6']

interface PanelProps { title: string; data: Bucket[]; height?: number }

// Panel de barras horizontales — para rankings (carrier, servicio, estado…).
export function BarPanel({ title, data, height = 220 }: PanelProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      {data.length === 0 ? (
        <p className="text-xs text-gray-400 py-8 text-center">Sin datos</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={90} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// Panel de dona — para distribuciones (payment terms, country…).
export function PiePanel({ title, data, height = 220 }: PanelProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      {data.length === 0 ? (
        <p className="text-xs text-gray-400 py-8 text-center">Sin datos</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
