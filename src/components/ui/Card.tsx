interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  glass?: boolean
}

export function Card({ children, className = '', title, glass = false }: CardProps) {
  const baseClass = glass
    ? 'bg-white/80 backdrop-blur-md border-white/50 shadow-sm'
    : 'bg-white border-gray-100 shadow-sm'

  return (
    <div className={`${baseClass} rounded-xl border ${className}`}>
      {title && (
        <div className={`px-6 py-4 border-b ${glass ? 'border-white/30' : 'border-gray-100'}`}>
          <h3 className="text-base font-semibold text-[#1e3a5f]">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
