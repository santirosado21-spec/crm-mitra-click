import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id:    string
  kind:  ToastKind
  title: string
  body?: string
}

interface ToastContextType {
  toast:        (kind: ToastKind, title: string, body?: string) => void
  success:      (title: string, body?: string) => void
  error:        (title: string, body?: string) => void
  info:         (title: string, body?: string) => void
}

const Ctx = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = Math.random().toString(36).slice(2)
    setItems(prev => [...prev, { id, kind, title, body }])
    setTimeout(() => {
      setItems(prev => prev.filter(t => t.id !== id))
    }, kind === 'error' ? 6000 : 3500)
  }, [])

  const remove = (id: string) => setItems(prev => prev.filter(t => t.id !== id))

  const value: ToastContextType = {
    toast,
    success: (t, b) => toast('success', t, b),
    error:   (t, b) => toast('error',   t, b),
    info:    (t, b) => toast('info',    t, b),
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[1000] flex flex-col gap-2 pointer-events-none">
        {items.map(t => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info
          const color =
            t.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' :
            t.kind === 'error'   ? 'border-rose-200 bg-rose-50 text-rose-900' :
                                   'border-blue-200 bg-blue-50 text-blue-900'
          return (
            <div
              key={t.id}
              className={`pointer-events-auto sm:w-96 max-w-full bg-white rounded-xl border ${color} shadow-lg p-3 flex items-start gap-3 animate-fade-up`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.body && <p className="text-xs opacity-80 mt-0.5">{t.body}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-current opacity-50 hover:opacity-100"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const c = useContext(Ctx)
  if (!c) {
    // Fallback no-op si el provider no está montado: evita crashes en consumers que se
    // monten antes que el provider raíz.
    return {
      toast:   () => {},
      success: () => {},
      error:   () => {},
      info:    () => {},
    } as ToastContextType
  }
  return c
}
