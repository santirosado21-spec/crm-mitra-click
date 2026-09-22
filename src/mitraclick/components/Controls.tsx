import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  children: ReactNode
}

const variants = {
  primary: 'bg-mc-charcoal text-white hover:bg-mc-ink border border-transparent',
  secondary: 'bg-mc-yellow text-mc-ink hover:bg-mc-yellow-strong border border-transparent',
  outline: 'bg-white text-mc-ink border border-mc-line hover:border-mc-charcoal',
}

export function Button({ variant = 'primary', children, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-xs font-semibold text-mc-muted">{label}</label>}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={`rounded-xl border bg-white px-3 py-2 text-sm text-mc-ink outline-none transition-colors duration-150 placeholder:text-mc-subtle focus:ring-2 focus:ring-mc-yellow/50 ${error ? 'border-mc-danger' : 'border-mc-line focus:border-mc-charcoal'} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-mc-danger">{error}</span>}
    </div>
  )
}
