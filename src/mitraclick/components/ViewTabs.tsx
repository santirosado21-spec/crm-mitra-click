import { Link } from 'react-router-dom'

export interface ViewOption {
  key: string
  label: string
}

/** Pestañas que cambian de vista con un link: la URL reproduce la misma pantalla. */
export function ViewTabs({ options, current, label }: { options: ViewOption[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="mc-surface flex gap-1 overflow-x-auto p-1.5">
      {options.map((option, index) => (
        <Link
          key={option.key}
          to={index === 0 ? '.' : `?vista=${option.key}`}
          aria-current={option.key === current ? 'page' : undefined}
          className={`mc-card-link inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold ${option.key === current ? 'bg-mc-yellow-soft text-mc-ink' : 'text-mc-muted hover:bg-mc-surface-2 hover:text-mc-ink'}`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  )
}
