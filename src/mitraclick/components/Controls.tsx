import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

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
      className={`mc-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
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
        className={`mc-field min-h-11 rounded-xl border bg-white px-3 py-2 text-sm text-mc-ink outline-none placeholder:text-mc-subtle focus:ring-2 focus:ring-mc-yellow/50 ${error ? 'border-mc-danger' : 'border-mc-line focus:border-mc-charcoal'} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-mc-danger">{error}</span>}
    </div>
  )
}

const fieldClass = (error?: string, className = '') =>
  `mc-field min-h-11 max-w-full w-full rounded-xl border bg-white px-3 py-2 text-sm text-mc-ink outline-none placeholder:text-mc-subtle focus:ring-2 focus:ring-mc-yellow/50 disabled:bg-mc-surface-2 disabled:text-mc-muted ${error ? 'border-mc-danger' : 'border-mc-line focus:border-mc-charcoal'} ${className}`

/** Etiqueta + control + ayuda/errores, con los ids enlazados para lectores de pantalla. */
export function Field({ id, label, required, hint, error, children }: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-mc-muted">
        {label}
        {required && <span className="text-mc-danger" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-[11px] text-mc-gray-400">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-mc-danger" role="alert">{error}</p>}
    </div>
  )
}

export function TextInput({ error, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input aria-invalid={error ? true : undefined} aria-describedby={error && props.id ? `${props.id}-error` : undefined} className={fieldClass(error, className)} {...props} />
}

export function TextArea({ error, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea rows={3} aria-invalid={error ? true : undefined} className={fieldClass(error, className)} {...props} />
}

export function Select({ error, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return <select aria-invalid={error ? true : undefined} className={fieldClass(error, className)} {...props}>{children}</select>
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-mc-ink">
      <input type="checkbox" className="h-4 w-4 rounded border-mc-line accent-mc-charcoal" {...props} />
      {label}
    </label>
  )
}
