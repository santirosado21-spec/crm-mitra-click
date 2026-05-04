/**
 * Supply Chain México — SVG Logo
 * Clean, professional, no color lines, geometric typography
 */
export function Logo({ className = '', height = 48 }: { className?: string; height?: number }) {
  const w = height * 3.6 // aspect ratio ~3.6:1
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 100"
      width={w}
      height={height}
      className={className}
      role="img"
      aria-label="Supply Chain México"
    >
      {/* SC Monogram — geometric, sharp corners */}
      <g transform="translate(8, 10)">
        {/* S shape — angular */}
        <path
          d="M32 12 L12 12 Q4 12 4 20 L4 32 Q4 40 12 40 L32 40 Q40 40 40 48 L40 60 Q40 68 32 68 L4 68"
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="7"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* C shape — angular */}
        <path
          d="M76 12 L52 12 Q44 12 44 20 L44 60 Q44 68 52 68 L76 68"
          fill="none"
          stroke="#dc3545"
          strokeWidth="7"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </g>

      {/* SUPPLY CHAIN — bold, geometric sans-serif */}
      <text
        x="100"
        y="47"
        fontFamily="'Syne', 'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontSize="30"
        fontWeight="800"
        letterSpacing="0.5"
        fill="#1e3a5f"
      >
        Supply<tspan fill="#dc3545">Chain</tspan>
      </text>

      {/* MÉXICO — wide tracking */}
      <text
        x="100"
        y="72"
        fontFamily="'Nunito', 'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontSize="16"
        fontWeight="600"
        letterSpacing="6"
        fill="#94a3b8"
      >
        MÉXICO
      </text>
    </svg>
  )
}
