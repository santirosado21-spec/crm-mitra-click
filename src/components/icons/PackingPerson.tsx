import type { CSSProperties } from 'react'

interface Props {
  size?:      number
  style?:     CSSProperties
  className?: string
  strokeWidth?: number
}

/**
 * Icono ilustrativo: persona cerrando una caja de paquetería.
 * Diseñado para integrarse con el resto de íconos lucide del sistema:
 * stroke="currentColor", viewBox 24×24.
 */
export function PackingPerson({ size = 24, style, className, strokeWidth = 1.6 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {/* Cabeza de la persona */}
      <circle cx="5" cy="5" r="1.7" />

      {/* Torso + brazo extendido hacia la caja */}
      <path d="M5 6.7 v4" />
      <path d="M5 8 q1.5 0.5 3 2 l1.8 1.4" />

      {/* Tapas cerrándose (forma de V invertida sobre la caja) */}
      <path d="M9 11 l3 -2 l3 2" />
      <path d="M15 11 l3 -2 l3 2" />

      {/* Cuerpo de la caja */}
      <rect x="9" y="11" width="12" height="9" rx="0.6" />

      {/* Línea de cinta horizontal (la cinta que cierra la caja) */}
      <path d="M9 14.5 h12" strokeDasharray="0" />

      {/* Cinta vertical en el centro */}
      <path d="M15 11 v9" />

      {/* Pies de la persona */}
      <path d="M4 13 l1 1.6" />
      <path d="M6 13 l-1 1.6" />
    </svg>
  )
}
