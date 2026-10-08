import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SessionContext, type SessionValue } from '../auth/SessionContext'
import { HomePage } from '../pages/HomePage'
import { AppShell } from './AppShell'

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
    <SessionContext.Provider value={session}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="clientes" element={<h1>Clientes</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

describe('AppShell', () => {
  it('oculta el sidebar y la cabecera móvil en el menú principal', () => {
    const html = renderShell('/')
    expect(html).not.toContain('id="app-sidebar"')
    expect(html).not.toContain('Abrir navegación')
    expect(html).toContain('Bienvenido, Ángel')
    expect(html).toContain('Módulos del sistema')
  })

  it('muestra el sidebar al entrar a un módulo', () => {
    const html = renderShell('/clientes')
    expect(html).toContain('id="app-sidebar"')
    expect(html).toContain('Abrir navegación')
    expect(html).toContain('<h1>Clientes</h1>')
  })
})
