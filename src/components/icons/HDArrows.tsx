import type { CSSProperties } from 'react'

interface Props {
  size?:      number
  style?:     CSSProperties
  className?: string
}

/**
 * Reproduce el icono del logo Supply Chain MX: dos flechas circulares
 * interconectadas (navy + red) sin el texto. Mismo aspecto que la parte
 * superior del PNG /public/hd-logo.png.
 */
export function HDArrows({ size = 24, style, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {/* Flecha NAVY izquierda — 3/4 de círculo cerrando hacia la derecha */}
      <path
        d="M 62 22 A 28 28 0 1 0 62 78"
        stroke="#1e3a5f"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      {/* Punta de flecha NAVY arriba a la derecha */}
      <path
        d="M 62 22 L 51 14 L 70 8 L 71 30 Z"
        fill="#1e3a5f"
      />

      {/* Flecha ROJA derecha — 3/4 de círculo cerrando hacia la izquierda */}
      <path
        d="M 38 22 A 28 28 0 1 1 38 78"
        stroke="#c8373c"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      {/* Punta de flecha ROJA abajo a la izquierda */}
      <path
        d="M 38 78 L 49 86 L 30 92 L 29 70 Z"
        fill="#c8373c"
      />
    </svg>
  )
}
