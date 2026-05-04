import { useState, useRef, useEffect } from 'react'
import { Bell, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1)   return 'ahora'
  if (min < 60)  return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24)   return `hace ${hr} h`
  const d = Math.floor(hr / 24)
  if (d < 7)     return `hace ${d} d`
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export function NotificationBell() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const { items, unreadCount, markRead, markAllRead } = useNotifications(user?.email)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = async (id: string, link: string | null, read: boolean) => {
    if (!read) await markRead(id)
    setOpen(false)
    if (link) navigate(link)
  }

  return (
    <div className="relative text-gray-500" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile: full-screen overlay */}
          <div className="fixed inset-0 sm:absolute sm:inset-auto sm:right-0 sm:top-10 sm:w-80 z-50 sm:z-50">
            <div className="absolute inset-0 sm:hidden bg-black/30" onClick={() => setOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 sm:relative sm:bottom-auto bg-white sm:rounded-xl shadow-xl border border-gray-200 max-h-[80vh] sm:max-h-none overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Notificaciones</p>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 text-[11px] text-[#1e3a5f] hover:underline"
                  >
                    <Check size={11} /> Marcar todas
                  </button>
                )}
              </div>

              <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {items.length === 0 && (
                  <li className="px-4 py-10 text-center text-xs text-gray-400">
                    Sin notificaciones
                  </li>
                )}
                {items.map(n => {
                  const read = !!n.read_at
                  return (
                    <li
                      key={n.id}
                      onClick={() => handleClick(n.id, n.link, read)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${read ? 'bg-gray-200' : 'bg-[#1e3a5f]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${read ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>{n.title}</p>
                        {n.body && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">{relativeTime(n.created_at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
