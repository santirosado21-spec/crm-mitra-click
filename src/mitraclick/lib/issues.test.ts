import { describe, expect, it } from 'vitest'
import { issueLink, ruleLabel } from './issues'

describe('issueLink', () => {
  it('lleva al documento cuando tiene pantalla propia', () => {
    expect(issueLink('pedido', 'abc')).toBe('/pedidos/abc')
    expect(issueLink('cotizacion', 'q1')).toBe('/cotizaciones/q1')
    expect(issueLink('compra', 'c1')).toBe('/compras/c1')
  })

  it('lleva a la lista cuando el registro se corrige ahí', () => {
    expect(issueLink('producto', 'p1')).toBe('/productos')
    expect(issueLink('categoria', 'c1')).toBe('/familias?vista=categorias')
    expect(issueLink('conteo', 'c1')).toBe('/conteos?estado=pendiente')
  })

  it('sin identificador lleva a la lista; un tipo desconocido no tiene link', () => {
    expect(issueLink('pedido', null)).toBe('/pedidos')
    expect(issueLink('otra_cosa', 'x')).toBeNull()
  })
})

describe('ruleLabel', () => {
  it('nombra las reglas fijas y hace legibles las demás', () => {
    expect(ruleLabel('remision_sin_verificar')).toBe('Remisión sin verificar')
    expect(ruleLabel('cliente_inactivo_90d')).toBe('Cliente inactivo 90d')
  })
})
