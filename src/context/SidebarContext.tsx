import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface SidebarContextType {
  open:   boolean
  toggle: () => void
  close:  () => void
}

const Ctx = createContext<SidebarContextType | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen(o => !o), [])
  const close  = useCallback(() => setOpen(false), [])
  return <Ctx.Provider value={{ open, toggle, close }}>{children}</Ctx.Provider>
}

export function useSidebar() {
  const c = useContext(Ctx)
  if (!c) return { open: false, toggle: () => {}, close: () => {} }
  return c
}
