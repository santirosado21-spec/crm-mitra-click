import type { Operador } from '../types/tms'

export const BASE_OPERADORES = [
  'Ruben Rodarte Martinez',
  'Estanislao Valverde Gonzalez',
  'Jose Luis Martinez Gonzalez',
  'Luis Manuel Lopez Celis',
]

export const BASE_MANIOBRISTAS = [
  'Guadalupe Hernadez Jimenez',
  'Roberto Jimenez',
]

export const BASE_TMS_PERSONAL = [
  ...BASE_OPERADORES.map(nombre => ({ nombre, notas: 'Operador de transporte' })),
  ...BASE_MANIOBRISTAS.map(nombre => ({ nombre, notas: 'Maniobrista' })),
]

export const isBaseManiobrista = (nombre: string, notas?: string | null) =>
  /maniobrista/i.test(notas ?? '') || BASE_MANIOBRISTAS.some(m => m.toLowerCase() === nombre.toLowerCase())

export function mergeBaseOperadores(operadores: Operador[]) {
  const existing = new Set(operadores.map(o => o.nombre.toLowerCase()))
  const fallback: Operador[] = BASE_TMS_PERSONAL
    .filter(item => !existing.has(item.nombre.toLowerCase()))
    .map((item, index) => ({
      id: `catalogo-${index}-${item.nombre.toLowerCase().replace(/\s+/g, '-')}`,
      nombre: item.nombre,
      telefono: '',
      email: '',
      licencia_tipo: '',
      licencia_numero: '',
      licencia_vigencia: null,
      es_propio: true,
      proveedor_nombre: null,
      motive_user_id: null,
      sueldo_diario: 420,
      activo: true,
      notas: item.notas,
      created_at: '',
      updated_at: '',
    }))

  return [...operadores, ...fallback].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export const isCatalogOperador = (id: string) => id.startsWith('catalogo-')
