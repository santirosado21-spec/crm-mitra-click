import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/ThemeContext'

export function ThemeToggle({ showLabel = false, className = '' }: { showLabel?: boolean; className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`mc-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-mc-line bg-mc-surface px-3 text-sm font-semibold text-mc-muted shadow-mc-card hover:border-mc-yellow-strong hover:text-mc-ink ${className}`}
      aria-label={label}
      aria-pressed={dark}
      title={label}
      data-testid="theme-toggle"
    >
      {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      {showLabel && <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>}
    </button>
  )
}
