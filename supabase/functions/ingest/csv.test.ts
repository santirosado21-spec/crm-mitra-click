import { describe, expect, it } from 'vitest'
import { detectDelimiter, normalizeHeader, parseCsv } from './csv.ts'

describe('normalizeHeader', () => {
  it('convierte encabezados de Excel a los nombres del contrato', () => {
    expect(normalizeHeader('Folio Pedido')).toBe('folio_pedido')
    expect(normalizeHeader(' Categoría ')).toBe('categoria')
    expect(normalizeHeader('Precio Unitario ($)')).toBe('precio_unitario')
  })
})

describe('detectDelimiter', () => {
  it('reconoce coma, punto y coma y tabulador', () => {
    expect(detectDelimiter('folio,fecha,importe')).toBe(',')
    expect(detectDelimiter('folio;fecha;importe')).toBe(';')
    expect(detectDelimiter('folio\tfecha\timporte')).toBe('\t')
  })

  it('no cuenta separadores dentro de comillas', () => {
    expect(detectDelimiter('"a;b;c",x,y')).toBe(',')
  })
})

describe('parseCsv', () => {
  it('lee una exportación de Excel con BOM, punto y coma y montos con comas', () => {
    const csv = '﻿Folio;Fecha;Importe;Estatus\r\nPED-1;20/09/2026;"$64,300.50";Surtido\r\n'
    expect(parseCsv(csv)).toEqual([{ folio: 'PED-1', fecha: '20/09/2026', importe: '$64,300.50', estatus: 'Surtido' }])
  })

  it('respeta comillas escapadas y saltos de línea dentro de un campo', () => {
    const csv = 'id,nombre\nP1,"Taladro 1/2"" con ""caja"""\nP2,"Línea 1\nLínea 2"\n'
    expect(parseCsv(csv)).toEqual([
      { id: 'P1', nombre: 'Taladro 1/2" con "caja"' },
      { id: 'P2', nombre: 'Línea 1\nLínea 2' },
    ])
  })

  it('ignora filas vacías y completa columnas faltantes con texto vacío', () => {
    const csv = 'id,nombre,zona\nV1,Ana\n\n,,\nV2,Beto,Sur'
    expect(parseCsv(csv)).toEqual([
      { id: 'V1', nombre: 'Ana', zona: '' },
      { id: 'V2', nombre: 'Beto', zona: 'Sur' },
    ])
  })

  it('regresa lista vacía para un archivo vacío', () => {
    expect(parseCsv('')).toEqual([])
  })
})
