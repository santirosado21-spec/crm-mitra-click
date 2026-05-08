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
      {/* Casita minimalista: solo techo + paredes */}
      <path d="M 3 11 L 12 4 L 21 11 V 20 H 3 Z" />
    </svg>
  )
}
