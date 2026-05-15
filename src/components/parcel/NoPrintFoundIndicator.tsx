import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Banner que replica el indicador "NO PRINT CLIENTS FOUND" de Techship.
// Se muestra cuando hay órdenes listas para imprimir pero ningún cliente
// de impresión local detectado.
export function NoPrintFoundIndicator({ show }: { show: boolean }) {
  const { t } = useTranslation()
  if (!show) return null
  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold"
      style={{ background: '#fff8e1', borderColor: '#ffc107', color: '#7a5b00' }}
      role="status"
    >
      <AlertTriangle size={16} aria-hidden="true" />
      {t('orders.noPrintFound')}
    </div>
  )
}
