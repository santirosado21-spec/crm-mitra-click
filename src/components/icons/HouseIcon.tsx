import type { CSSProperties } from 'react'

interface Props {
  size?:        number
  style?:       CSSProperties
  className?:   string
  strokeWidth?: number
}

/**
 * Casita ilustrativa con techo, puerta, ventana y chimenea.
 * Más detallada que el icono Home estándar de lucide — pensado para usar
 * como "ir a página principal" en el header.
 */
export function HouseIcon({ size = 24, style, className, strokeWidth = 1.6 }: Props) {
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
      {/* Chimenea — sale del techo del lado derecho */}
      <path d="M 16.5 5.5 V 8" />
      <path d="M 15.5 5.5 H 17.5" />

      {/* Techo */}
      <path d="M 3 12 L 12 4 L 21 12" />

      {/* Paredes */}
      <path d="M 5 11 V 20 H 19 V 11" />

      {/* Piso (opcional, mejora la base visual) */}
      <path d="M 4 20 H 20" />

      {/* Puerta */}
      <path d="M 10 20 V 14 H 14 V 20" />
      {/* Manija */}
      <circle cx="13" cy="17" r="0.4" fill="currentColor" />

      {/* Ventana */}
      <rect x="6.2" y="13" width="2.6" height="2.6" />
      <path d="M 7.5 13 V 15.6" />
      <path d="M 6.2 14.3 H 8.8" />
    </svg>
  )
}
