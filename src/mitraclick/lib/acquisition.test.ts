import { describe, expect, it } from 'vitest'
import { clickRate, mapSearchConsoleCsv, trackedLinkUrl } from './acquisition'
import { parseCsv } from './csv'

describe('trackedLinkUrl', () => {
  it('arma el link que pasa por la función de redirección', () => {
    expect(trackedLinkUrl('https://abc.supabase.co/', 'Xy_9-k')).toBe('https://abc.supabase.co/functions/v1/go?c=Xy_9-k')
  })

  it('sin la URL del proyecto no hay link', () => {
    expect(trackedLinkUrl(undefined, 'abc')).toBe('')
  })
})

describe('mapSearchConsoleCsv', () => {
  it('lee la exportación de consultas en español', () => {
    const result = mapSearchConsoleCsv(parseCsv('Consultas principales,Clics,Impresiones,CTR,Posición\ntaladro percutor,42,"1,310",3.21%,"7,4"\nguantes nitrilo,5,200,2.5%,12.08\n'))
    expect(result.dimension).toBe('consulta')
    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { term: 'taladro percutor', clicks: 42, impressions: 1310, position: 7.4 },
      { term: 'guantes nitrilo', clicks: 5, impressions: 200, position: 12.08 },
    ])
  })

  it('lee la exportación de páginas en inglés', () => {
    const result = mapSearchConsoleCsv(parseCsv('Top pages,Clicks,Impressions,CTR,Position\nhttps://tienda.example/taladros,10,300,3.3%,5.5\n'))
    expect(result.dimension).toBe('pagina')
    expect(result.rows[0]).toEqual({ term: 'https://tienda.example/taladros', clicks: 10, impressions: 300, position: 5.5 })
  })

  it('reporta filas con cifras inválidas e ignora las vacías', () => {
    const result = mapSearchConsoleCsv(parseCsv('Top queries,Clicks,Impressions\ndisco,abc,10\n,1,1\nlija,2,20\n'))
    expect(result.rows).toEqual([{ term: 'lija', clicks: 2, impressions: 20, position: null }])
    expect(result.errors).toEqual([{ line: 2, message: 'disco: clics o impresiones no son números.' }])
  })

  it('rechaza un archivo que no es de Search Console', () => {
    expect(mapSearchConsoleCsv(parseCsv('nombre,precio\nA,1\n')).dimension).toBeNull()
  })
})

describe('clickRate', () => {
  it('divide clics entre impresiones', () => {
    expect(clickRate(5, 200)).toBe(0.025)
    expect(clickRate(0, 0)).toBeNull()
  })
})
