/** Invierte solo los trazos neutros y conserva los píxeles amarillos del original. */
export function BrandColorFilter() {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute pointer-events-none">
    <defs>
      <filter id="mc-brand-dark" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  4 0 -4 0 0" result="yellow-mask" />
        <feComponentTransfer in="SourceGraphic" result="inverted">
          <feFuncR type="table" tableValues="1 0" />
          <feFuncG type="table" tableValues="1 0" />
          <feFuncB type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feComposite in="inverted" in2="yellow-mask" operator="out" result="neutral" />
        <feComposite in="SourceGraphic" in2="yellow-mask" operator="in" result="yellow" />
        <feMerge result="recolored">
          <feMergeNode in="neutral" />
          <feMergeNode in="yellow" />
        </feMerge>
        {/* El fondo blanco del JPG se vuelve transparente, sin mezclar el amarillo. */}
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 -4 -4 0 12" result="ink-mask" />
        <feComposite in="recolored" in2="ink-mask" operator="in" />
      </filter>
    </defs>
  </svg>
}
