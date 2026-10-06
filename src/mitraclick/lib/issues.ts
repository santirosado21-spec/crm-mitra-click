// Pendientes de calidad de datos: a dónde lleva cada uno y cómo se nombran sus reglas.

/** Pantalla donde se corrige el registro señalado; null si no hay una pantalla directa. */
export function issueLink(entityType: string, entityId: string | null): string | null {
  switch (entityType) {
    case 'cotizacion':
      return entityId ? `/cotizaciones/${entityId}` : '/cotizaciones'
    case 'pedido':
      return entityId ? `/pedidos/${entityId}` : '/pedidos'
    case 'compra':
      return entityId ? `/compras/${entityId}` : '/compras'
    case 'cliente':
      return '/clientes'
    case 'producto':
      return '/productos'
    case 'categoria':
      return '/familias?vista=categorias'
    case 'remision':
      return '/remisiones'
    case 'conteo':
      return '/conteos?estado=pendiente'
    case 'factura':
      return '/facturas'
    default:
      return null
  }
}

export const RULE_LABEL: Record<string, string> = {
  cliente_incompleto: 'Cliente incompleto',
  producto_sin_clasificar: 'Producto sin familia o categoría',
  producto_incompleto: 'Producto sin precio o costo',
  clasificacion_obsoleta: 'Clasificación dada de baja',
  categoria_duplicada: 'Categoría duplicada',
  cotizacion_sin_seguimiento: 'Cotización sin seguimiento',
  pedido_incompleto: 'Pedido con información pendiente',
  remision_sin_verificar: 'Remisión sin verificar',
  remision_sin_evidencia: 'Remisión sin evidencia',
  pedido_sin_factura: 'Pedido entregado sin factura',
  existencia_negativa: 'Existencia negativa',
  pedido_sin_salida: 'Pedido sin salida de bodega',
  conteo_sin_resolver: 'Conteo sin resolver',
  pedido_detenido: 'Pedido sin movimiento',
  compra_atrasada: 'Compra atrasada',
}

/** Las reglas que no están en la lista (p. ej. creadas por un agente) muestran su código legible. */
export const ruleLabel = (code: string) => RULE_LABEL[code] ?? code.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())

export const ISSUE_STATUS_LABEL: Record<string, string> = { abierto: 'Abierto', en_proceso: 'En proceso', resuelto: 'Resuelto', descartado: 'Descartado' }
export const SEVERITY_LABEL: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }
