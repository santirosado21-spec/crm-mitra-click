import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ThemeToggle } from '../components/ThemeToggle'
import { ThemeProvider } from './ThemeProvider'
import { resolveInitialTheme } from './theme'

describe('tema de la aplicación', () => {
  it('respeta una preferencia guardada antes que la del dispositivo', () => {
    expect(resolveInitialTheme('light', true)).toBe('light')
    expect(resolveInitialTheme('dark', false)).toBe('dark')
  })

  it('usa la preferencia del dispositivo cuando no existe una guardada', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('explica el modo al que cambiará el control', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider initialTheme="dark">
        <ThemeToggle showLabel />
      </ThemeProvider>,
    )
    expect(html).toContain('Cambiar a modo claro')
    expect(html).toContain('Modo claro')
    expect(html).toContain('aria-pressed="true"')
  })
})
