import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Icon size={30} className="text-gray-400" />
      </div>
      <div>
        <p className="font-semibold text-gray-600">{title}</p>
        {description && <p className="text-sm text-gray-400 mt-1 max-w-xs">{description}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
