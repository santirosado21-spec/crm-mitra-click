// Tipos para Seko 365 movements (importados desde Excel)

export type SekoTipo = 'entrada' | 'salida'

export interface SekoMovement {
  id:              string
  cliente_id:      string | null
  cliente_codigo:  string | null
  fecha:           string                  // YYYY-MM-DD
  tipo:            SekoTipo
  referencia:      string | null
  sku:             string | null
  cantidad:        number
  imported_at:     string
  imported_by:     string | null
  source_file:     string | null
  source_row:      number | null
  billed:          boolean
  billed_at:       string | null
  notas:           string
  raw:             Record<string, unknown> | null
  created_at:      string
}

export type CreateSekoMovementData = Omit<SekoMovement, 'id' | 'imported_at' | 'created_at'>

export interface SekoMovementFilters {
  clienteId?:  string
  tipo?:       SekoTipo | ''
  fechaDesde?: string
  fechaHasta?: string
  billed?:     boolean | undefined
  search?:     string                       // referencia o SKU
}
