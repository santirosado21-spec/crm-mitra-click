import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { Boxes } from 'lucide-react'
import { KpiCard, Panel } from './Primitives'

describe('Tarjetas compartidas', () => {
  it('ofrece un enlace al módulo con un nombre explícito', () => {
    const html = renderToStaticMarkup(<MemoryRouter><KpiCard label="Existencias" value={12} icon={Boxes} link={{ to: '/inventario', label: 'Ver inventario' }} /></MemoryRouter>)
    expect(html).toContain('href="/inventario"')
    expect(html).toContain('Ver inventario')
    expect(html).toContain('<dt')
    expect(html).toContain('<dd')
  })

  it('no inventa enlaces cuando no hay destino', () => {
    const html = renderToStaticMarkup(<KpiCard label="Existencias" value={12} icon={Boxes} />)
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('Ver detalle')
  })

  it('conserva el estado desconocido y oculta la variación', () => {
    const html = renderToStaticMarkup(<KpiCard label="Existencias" value={999} delta={7} unknown icon={Boxes} testId="stock" />)
    expect(html).toContain('data-testid="stock-value">—</dd>')
    expect(html).toContain('No se pudo consultar')
    expect(html).not.toContain('999')
    expect(html).not.toContain('contra el periodo anterior')
  })

  it('muestra la procedencia también en la tarjeta destacada', () => {
    const html = renderToStaticMarkup(<KpiCard label="Existencias" value={12} icon={Boxes} emphasis source="Libro de movimientos" period="Hoy" />)
    expect(html).toContain('Libro de movimientos')
    expect(html).toContain('Hoy')
    expect(html).not.toContain('Datos simulados')
  })

  it('conserva el encabezado y las acciones de un panel', () => {
    const html = renderToStaticMarkup(<Panel title="Productos" description="Catálogo" action={<button>Crear</button>} testId="products"><p>Sin registros</p></Panel>)
    expect(html).toContain('data-testid="products"')
    expect(html).toContain('Productos</h2>')
    expect(html).toContain('<button>Crear</button>')
    expect(html).toContain('Sin registros')
  })
})
