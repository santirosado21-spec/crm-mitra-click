import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function RecordDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-mc-gray-950/30 backdrop-blur-[2px]"
        aria-label="Cerrar detalle"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 right-0 flex w-full max-w-[680px] animate-[drawerIn_.24s_ease-out] flex-col border-l border-mc-gray-200 bg-mc-surface shadow-2xl"
      >
        <header className="mc-panel-heading flex items-start justify-between gap-4 border-b border-mc-line-soft px-5 py-4 lg:px-6">
          <div className="min-w-0">
            <p className="mb-2 inline-flex rounded-lg bg-mc-yellow-wash px-2 py-1 text-[10px] font-bold text-mc-yellow-ink">Detalle de registro</p>
            <h2 className="mt-1 truncate text-xl font-extrabold text-mc-gray-950">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-mc-gray-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-mc-gray-200 text-mc-gray-500 transition hover:bg-mc-gray-50 hover:text-mc-gray-900" aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-6">{children}</div>
        {footer && <footer className="border-t border-mc-line-soft bg-mc-surface-2 px-5 py-4 lg:px-6">{footer}</footer>}
      </aside>
    </div>
  )
}
