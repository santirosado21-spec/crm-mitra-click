interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`px-3 py-2 rounded-lg border text-sm outline-none transition-colors duration-150
          ${error ? 'border-[#dc3545] focus:ring-[#dc3545]' : 'border-gray-300 focus:border-[#1e3a5f]'}
          focus:ring-2 focus:ring-opacity-20 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[#dc3545]">{error}</span>}
    </div>
  )
}
