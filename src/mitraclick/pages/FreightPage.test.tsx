import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SessionContext, type SessionValue } from '../auth/SessionContext'
import { FreightPage } from './FreightPage'

const session: SessionValue = {
  status: 'listo',
  session: null,
  profile: { id: '1', email: 'angel@example.com', displayName: 'Ángel Secades', roles: ['direccion'] },
  can: () => true,
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}

function renderPage(path: string) {
  return renderToStaticMarkup(
    <SessionContext.Provider value={session}>
      <MemoryRouter initialEntries={[path]}>
        <FreightPage />
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

describe('FreightPage', () => {
  it('abre el cotizador de fletes como vista predeterminada', () => {
    const html = renderPage('/fletes')
    expect(html).toContain('<h1')
    expect(html).toContain('Cotizador de fletes')
    expect(html).toContain('Nuevo flete')
    expect(html).toContain('Cotizaciones de flete')
  })

  it('permite cambiar a la vista para crear viajes', () => {
    const html = renderPage('/fletes?vista=viajes')
    expect(html).toContain('>Viajes</h1>')
    expect(html).toContain('Nuevo viaje')
    expect(html).toContain('no descuenta mercancía')
  })
})
