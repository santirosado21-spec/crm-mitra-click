export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mitraclick-theme'
const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

export function resolveInitialTheme(saved: string | null, prefersDark: boolean): Theme {
  return isTheme(saved) ? saved : prefersDark ? 'dark' : 'light'
}

export function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  let saved: string | null = null
  try {
    saved = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // El almacenamiento puede estar bloqueado; el tema del dispositivo sigue funcionando.
  }
  return resolveInitialTheme(saved, window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111513' : '#f7f7f3')
}

export function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // El cambio visual no depende de que el navegador permita persistirlo.
  }
}
