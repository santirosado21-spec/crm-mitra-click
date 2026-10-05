import { Link } from 'react-router-dom'

export interface ViewOption {
  key: string
  label: string
}

/** Pestañas que cambian de vista con un link: la URL reproduce la misma pantalla. */
export function ViewTabs({ options, current, label }: { options: ViewOption[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto rounded-2xl border border-mc-line bg-mc-surface p-1">
      {options.map((option, index) => (
        <Link
          key={option.key}
          to={index === 0 ? '.' : `?vista=${option.key}`}
          aria-current={option.key === current ? 'page' : undefined}
          className={`inline-flex min-h-10 shrink-0 items-center rounded-xl px-4 text-sm font-semibold transition-colors ${option.key === current ? 'bg-mc-charcoal text-white' : 'text-mc-muted hover:bg-mc-surface-2 hover:text-mc-ink'}`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  )
}
