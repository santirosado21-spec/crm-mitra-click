import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SessionContext, type SessionValue } from '../auth/SessionContext'
import { HomePage } from '../pages/HomePage'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AppShell } from './AppShell'
import { NAV_GROUPS } from '../navigation'

const session: SessionValue = {
  status: 'listo',
  session: null,
  profile: { id: '1', email: 'angel@example.com', displayName: 'Ángel Secades', roles: ['direccion'] },
  can: () => true,
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}

function renderShell(path: string) {
  return renderToStaticMarkup(
    <ThemeProvider initialTheme="light">
      <SessionContext.Provider value={session}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="clientes" element={<h1>Clientes</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SessionContext.Provider>
    </ThemeProvider>,
  )
}

describe('AppShell', () => {
  it('oculta el sidebar y la cabecera móvil en el menú principal', () => {
    const html = renderShell('/')
    expect(html).not.toContain('id="app-sidebar"')
    expect(html).not.toContain('Abrir navegación')
    expect(html).toContain('Bienvenido, Ángel')
    expect(html).toContain('Módulos del sistema')
    expect(html.match(/data-testid="home-area-/g)).toHaveLength(10)
    expect(html.match(/data-testid="area-artwork"/g)).toHaveLength(10)
    expect(html).not.toContain('data-testid="home-module-')
    expect(html).toContain('lg:grid-cols-3')
    expect(html).toContain('auto-rows-fr')
  })

  it('coloca Shopify como segunda área y lo separa de Sistema sin duplicar la ruta', () => {
    expect(NAV_GROUPS[1].label).toBe('Shopify')
    expect(NAV_GROUPS.flatMap((group) => group.modules).filter((module) => module.path === '/shopify')).toHaveLength(1)
    expect(NAV_GROUPS.find((group) => group.label === 'Sistema')?.modules.some((module) => module.path === '/shopify')).toBe(false)
    const html = renderShell('/')
    expect(html.indexOf('home-area-shopify')).toBeLessThan(html.indexOf('home-area-ventas'))
    expect(renderShell('/?area=shopify')).toContain('href="/shopify"')
  })

  it.each(NAV_GROUPS)('abre solamente las secciones de $label y conserva el acceso al inicio', (group) => {
    const key = group.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const html = renderShell('/?area=' + key)
    expect(html).not.toContain('id="app-sidebar"')
    expect(html).toContain('Todas las áreas')
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    for (const other of NAV_GROUPS) {
      for (const module of other.modules.filter((item) => item.path !== '/')) {
        const marker = 'data-testid="home-module-' + module.path.slice(1) + '"'
        if (other === group) expect(html).toContain(marker)
        else expect(html).not.toContain(marker)
      }
    }
  })

  it('vuelve al selector si el área de la URL no existe', () => {
    const html = renderShell('/?area=inexistente')
    expect(html).toContain('data-testid="home-main-menu"')
    expect(html).not.toContain('data-testid="home-area-sections"')
  })

  it('muestra el sidebar al entrar a un módulo', () => {
    const html = renderShell('/clientes')
    expect(html).toContain('id="app-sidebar"')
    expect(html).toContain('Abrir navegación')
    expect(html).toContain('<h1>Clientes</h1>')
  })
})
