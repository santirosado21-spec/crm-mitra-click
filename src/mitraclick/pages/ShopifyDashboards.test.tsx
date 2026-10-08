import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ShopifyDashboards } from './ShopifyDashboards'
import { useQuery } from '../lib/useQuery'

vi.mock('../lib/useQuery', () => ({ useQuery: vi.fn() }))

const query = vi.mocked(useQuery)
function render(path: string) {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><ShopifyDashboards integration={<p>Sincronizador existente</p>} /></MemoryRouter>)
}

describe('dashboards Shopify', () => {
  it('mantiene los errores de consulta visibles sin presentar ceros', () => {
    query.mockReturnValue({ data: null, loading: false, error: 'No hay sesión', reload: vi.fn() })
    const html = render('/shopify')
    expect(html).toContain('No hay sesión')
    expect(html).toContain('Reintentar')
    expect(html).not.toContain('Sin ventas Shopify registradas')
  })

  it('separa los prospectos LinkedIn de otros canales', () => {
    const row = { prospects: 3, contacted: 2, replies: 1, conversations: 1, opportunities: 1, won: 0, pending_follow_up: 0 }
    query.mockReturnValue({ data: [{ ...row, source: 'linkedin' }, { ...row, source: 'referido' }], loading: false, error: null, reload: vi.fn() })
    const html = render('/shopify?vista=linkedin')
    expect(html).toContain('LinkedIn B2B')
    expect(html).not.toContain('Referido')
    expect(html).toContain('/leads?fuente=linkedin')
  })

  it.each(['paid', 'google', 'aeo'])('identifica %s como integración pendiente sin inventar métricas', (view) => {
    const html = render(`/shopify?vista=${view}`)
    expect(html).toContain('Integración pendiente')
    expect(html).toContain('Sin fuente conectada')
    expect(html).not.toContain('$0')
  })

  it('conserva el periodo al cambiar de dashboard y permite abrir integración', () => {
    const html = render('/shopify?vista=integracion&periodo=90d')
    expect(html).toContain('Sincronizador existente')
    expect(html).toContain('vista=seo&amp;periodo=90d')
    expect(html.match(/<h1\b/g)).toHaveLength(1)
  })
})
