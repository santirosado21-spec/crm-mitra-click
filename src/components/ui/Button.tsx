interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  children: React.ReactNode
}

const variants = {
  primary: 'bg-[#1e3a5f] text-white hover:bg-[#162d4a] border border-transparent',
  secondary: 'bg-[#dc3545] text-white hover:bg-[#b02a37] border border-transparent',
  outline: 'bg-transparent text-[#1e3a5f] border border-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white',
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
