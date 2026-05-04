import type { OperationStatus } from '../../types'

type EstadoConfig = {
  label: string
  bg:    string
  fg:    string
  border:string
  dot:   string
}

const ESTADO_STYLES: Record<OperationStatus, EstadoConfig> = {
  creada:             { label: 'Creada',             bg: '#eff6ff', fg: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  validada_sac:       { label: 'Validada SAC',       bg: '#ecfeff', fg: '#155e75', border: '#a5f3fc', dot: '#06b6d4' },
  confirmada_almacen: { label: 'Confirmada Almacén', bg: '#f5f3ff', fg: '#5b21b6', border: '#ddd6fe', dot: '#8b5cf6' },
  cerrada_sac:        { label: 'Cerrada SAC',        bg: '#fef3c7', fg: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  tarifario_ok:       { label: 'Tarifario OK',       bg: '#ecfdf5', fg: '#065f46', border: '#a7f3d0', dot: '#10b981' },
  enviada_bind:       { label: 'Enviada a Bind',     bg: '#dcfce7', fg: '#14532d', border: '#86efac', dot: '#16a34a' },
  cancelada:          { label: 'Cancelada',          bg: '#fef2f2', fg: '#991b1b', border: '#fecaca', dot: '#ef4444' },
  // Legacy
  en_proceso:         { label: 'En proceso',         bg: '#eff6ff', fg: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  cerrada:            { label: 'Cerrada',            bg: '#fef3c7', fg: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  pendiente:          { label: 'Pendiente',          bg: '#ecfeff', fg: '#155e75', border: '#a5f3fc', dot: '#06b6d4' },
}

interface EstadoBadgeProps {
  estado: OperationStatus
  size?:  'sm' | 'md'
}

export function EstadoBadge({ estado, size = 'sm' }: EstadoBadgeProps) {
  const cfg = ESTADO_STYLES[estado] ?? ESTADO_STYLES.creada
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${padding}`}
      style={{ background: cfg.bg, color: cfg.fg, borderColor: cfg.border }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: cfg.dot }}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  )
}

export const ESTADO_LABELS: Record<OperationStatus, string> = Object.fromEntries(
  Object.entries(ESTADO_STYLES).map(([k, v]) => [k, v.label])
) as Record<OperationStatus, string>
