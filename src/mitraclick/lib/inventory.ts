// Reglas de captura de bodega. Funciones puras; la base vuelve a validar todo.

export type MovementKind = 'entrada' | 'salida' | 'traspaso' | 'ajuste'

export const MOVEMENT_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  traspaso: 'Traspaso',
  ajuste: 'Ajuste',
  traspaso_entrada: 'Traspaso (entrada)',
  traspaso_salida: 'Traspaso (salida)',
}

export const INCIDENT_KINDS: { value: string; label: string }[] = [
  { value: 'dañado', label: 'Producto dañado' },
  { value: 'faltante', label: 'Faltante' },
  { value: 'sobrante', label: 'Sobrante' },
  { value: 'ubicacion_incorrecta', label: 'Ubicación incorrecta' },
  { value: 'etiqueta', label: 'Problema con la etiqueta' },
  { value: 'otro', label: 'Otro' },
]

export interface MovementDraft {
  type: MovementKind
  productId: string
  locationId: string
  toLocationId?: string
  quantity: string
  reason: string
}

export const parseQuantity = (text: string) => Number(text.replace(/[,\s]/g, ''))
const round3 = (value: number) => Math.round(value * 1000) / 1000

/**
 * `available` es la existencia registrada en la ubicación de origen (null si no se conoce).
 * Una salida mayor a la existencia no se bloquea: se avisa, porque el producto está
 * físicamente ahí y la diferencia debe quedar a la vista, no esconderse.
 */
export function validateMovement(draft: MovementDraft, available: number | null): { errors: Record<string, string>; warning: string | null } {
  const errors: Record<string, string> = {}
  if (!draft.productId) errors.productId = 'Elige un producto.'
  if (!draft.locationId) errors.locationId = 'Elige una ubicación.'

  const quantity = parseQuantity(draft.quantity)
  if (draft.quantity.trim() === '' || !Number.isFinite(quantity)) errors.quantity = 'La cantidad debe ser un número.'
  else if (draft.type === 'ajuste' && quantity === 0) errors.quantity = 'La cantidad no puede ser cero.'
  else if (draft.type !== 'ajuste' && quantity <= 0) errors.quantity = 'La cantidad debe ser mayor que cero.'

  if (draft.type === 'traspaso') {
    if (!draft.toLocationId) errors.toLocationId = 'Elige la ubicación de destino.'
    else if (draft.toLocationId === draft.locationId) errors.toLocationId = 'El destino debe ser distinto del origen.'
  }
  if (draft.type === 'ajuste' && !draft.reason.trim()) errors.reason = 'El ajuste necesita un motivo.'

  let warning: string | null = null
  if (!errors.quantity && available !== null && (draft.type === 'salida' || draft.type === 'traspaso') && quantity > available) {
    warning = `La existencia registrada es ${round3(available)}; quedaría en ${round3(available - quantity)}.`
  }
  return { errors, warning }
}

/** Fila para el libro de movimientos. El traspaso no pasa por aquí: lo registra la base como dos movimientos atómicos. */
export function toMovementRow(draft: MovementDraft): { product_id: string; location_id: string; movement_type: string; quantity_delta: number; reason: string | null } {
  const quantity = parseQuantity(draft.quantity)
  const delta = draft.type === 'salida' ? -Math.abs(quantity) : draft.type === 'entrada' ? Math.abs(quantity) : quantity
  return { product_id: draft.productId, location_id: draft.locationId, movement_type: draft.type, quantity_delta: round3(delta), reason: draft.reason.trim() || null }
}

/** Resultado de un conteo físico: nunca cambia la existencia, solo expone la diferencia. */
export function countOutcome(counted: number, system: number): { difference: number; status: 'sin_diferencia' | 'pendiente'; label: string } {
  const difference = round3(counted - system)
  if (difference === 0) return { difference, status: 'sin_diferencia', label: 'Sin diferencia' }
  return { difference, status: 'pendiente', label: difference < 0 ? `Faltan ${Math.abs(difference)}` : `Sobran ${difference}` }
}
