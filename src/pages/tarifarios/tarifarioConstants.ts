// Categorías de servicio para tarifarios y servicios adicionales
export const CATEGORIAS_SERVICIO = {
  almacenaje:     'Almacenaje',
  transporte:     'Transporte',
  maniobra:       'Maniobras',
  valor_agregado: 'Valor Agregado',
  otro:           'Otro',
} as const

export type CategoriaServicio = keyof typeof CATEGORIAS_SERVICIO

// Conceptos predefinidos por categoría
export const CONCEPTOS_PREDEFINIDOS: Record<CategoriaServicio, string[]> = {
  almacenaje: [
    'Almacenaje mensual por tarima',
    'Almacenaje mensual por m²',
    'Almacenaje mensual fijo',
  ],
  transporte: [
    'Flete local',
    'Flete foráneo',
    'Recolección',
  ],
  maniobra: [
    'Maniobra con montacargas',
    'Carga/descarga manual',
    'Maniobra especial',
  ],
  valor_agregado: [
    'Reempaque',
    'Reetiquetado',
    'Inspección de calidad',
    'Preparación de pedidos',
  ],
  otro: [
    'Entrada de mercancía',
    'Salida de mercancía',
    'Inventario físico',
    'Servicio especial',
  ],
}

// Unidades disponibles por categoría
export const UNIDADES_POR_CATEGORIA: Record<CategoriaServicio, string[]> = {
  almacenaje:     ['TARIMA', 'M2', 'FIJO_MENSUAL'],
  transporte:     ['VIAJE', 'KM'],
  maniobra:       ['HORA', 'SERVICIO'],
  valor_agregado: ['PIEZA', 'HORA', 'SERVICIO'],
  otro:           ['SERVICIO', 'PIEZA', 'HORA'],
}

// Etiquetas para las unidades
export const UNIT_LABELS: Record<string, string> = {
  TARIMA:       'Tarima',
  PIEZA:        'Pieza',
  HORA:         'Hora',
  FIJO_MENSUAL: 'Fijo mensual',
  M2:           'M²',
  SERVICIO:     'Servicio',
  KG:           'Kg',
  VIAJE:        'Viaje',
  KM:           'Km',
}

// Colores por categoría
export const CATEGORIA_COLORS: Record<CategoriaServicio, { bg: string; text: string; border: string }> = {
  almacenaje:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  transporte:     { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  maniobra:       { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  valor_agregado: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  otro:           { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200' },
}
