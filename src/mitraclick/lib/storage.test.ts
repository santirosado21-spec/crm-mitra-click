import { describe, expect, it } from 'vitest'
import { evidenceProblem, safeFileName } from './storage'

describe('evidenceProblem', () => {
  it('acepta fotos y PDF dentro del límite', () => {
    expect(evidenceProblem({ name: 'remision.jpg', size: 2_000_000, type: 'image/jpeg' })).toBeNull()
    expect(evidenceProblem({ name: 'remision.pdf', size: 500_000, type: 'application/pdf' })).toBeNull()
  })

  it('rechaza otros tipos de archivo', () => {
    expect(evidenceProblem({ name: 'nota.docx', size: 1000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe('nota.docx: solo se aceptan fotos (JPG, PNG, WebP) o PDF.')
  })

  it('rechaza archivos de más de 10 MB', () => {
    expect(evidenceProblem({ name: 'video.png', size: 10 * 1024 * 1024 + 1, type: 'image/png' })).toBe('video.png: pesa más de 10 MB.')
  })
})

describe('safeFileName', () => {
  it('quita acentos, espacios y símbolos', () => {
    expect(safeFileName('Remisión firmada (cliente #3).JPG')).toBe('remision-firmada-cliente-3-.jpg')
  })

  it('nunca queda vacío', () => {
    expect(safeFileName('¿¡!?')).toBe('archivo')
  })
})
