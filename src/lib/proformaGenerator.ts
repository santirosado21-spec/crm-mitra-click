// ─────────────────────────────────────────────────────────────────────────────
// P2 — Auto-generación de Proforma al aprobar en Cobranza
// Calcula las líneas (costo_cliente + servicios adicionales registrados),
// inserta un registro en `proformas` y devuelve el UUID para ligarlo en
// operations.proforma_id.
//
// Si la tabla `proformas` aún no existe en Supabase, cae al fallback local:
// genera un UUID y loguea el payload en consola para trazabilidad.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'
import type { Operation } from '../types'

export interface ProformaLinea {
  concepto:       string
  categoria:      string
  cantidad:       number
  unidad:         string
  precio_unitario:number
  subtotal:       number
}

export interface ProformaSnapshot {
  id:             string
  operacion_id:   string
  referencia:     string
  cliente_codigo: string
  cliente_nombre: string
  fecha:          string
  lineas:         ProformaLinea[]
  subtotal:       number
  total:          number
  moneda:         'MXN'
  aprobado_por:   string
  aprobado_at:    string
  estado:         'aprobada'
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'prof-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export async function generarProformaDesdeOperacion(
  op: Operation,
  aprobador: string
): Promise<string> {
  const lineas: ProformaLinea[] = []

  // Línea base: costo al cliente (bitácora)
  if (op.costo_cliente && op.costo_cliente > 0) {
    lineas.push({
      concepto:        `${op.tipo_operacion.replace('_', ' ')} — ${op.referencia}`,
      categoria:       op.incluye_transporte ? 'transporte' : 'almacenaje',
      cantidad:        1,
      unidad:          'servicio',
      precio_unitario: op.costo_cliente,
      subtotal:        op.costo_cliente,
    })
  }

  // Servicios adicionales ligados a la operación
  try {
    const { data: servicios } = await supabase
      .from('servicios_adicionales')
      .select('concepto, categoria, cantidad, unidad, precio_unitario, subtotal')
      .eq('operacion_id', op.id)

    for (const s of servicios ?? []) {
      lineas.push({
        concepto:        s.concepto,
        categoria:       s.categoria,
        cantidad:        s.cantidad,
        unidad:          s.unidad,
        precio_unitario: s.precio_unitario,
        subtotal:        s.subtotal,
      })
    }
  } catch {
    // tabla no disponible — se continúa solo con la línea base
  }

  const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0)
  const snapshot: ProformaSnapshot = {
    id:             uuid(),
    operacion_id:   op.id,
    referencia:     op.referencia,
    cliente_codigo: op.cliente_codigo,
    cliente_nombre: op.cliente_nombre,
    fecha:          new Date().toISOString().slice(0, 10),
    lineas,
    subtotal,
    total:          subtotal,
    moneda:         'MXN',
    aprobado_por:   aprobador,
    aprobado_at:    new Date().toISOString(),
    estado:         'aprobada',
  }

  // Intento de persistencia en Supabase (si la tabla existe)
  try {
    const { data, error } = await supabase
      .from('proformas')
      .insert({
        id:             snapshot.id,
        operacion_id:   snapshot.operacion_id,
        referencia:     snapshot.referencia,
        cliente_codigo: snapshot.cliente_codigo,
        cliente_nombre: snapshot.cliente_nombre,
        fecha:          snapshot.fecha,
        lineas:         snapshot.lineas,
        subtotal:       snapshot.subtotal,
        total:          snapshot.total,
        moneda:         snapshot.moneda,
        aprobado_por:   snapshot.aprobado_por,
        aprobado_at:    snapshot.aprobado_at,
        estado:         snapshot.estado,
      })
      .select('id')
      .single()
    if (!error && data?.id) return data.id as string
  } catch {
    // fallthrough al fallback local
  }

  // Fallback: log del snapshot (útil en modo demo / sin tabla)
  console.info('[proformaGenerator] snapshot generado (fallback local):', snapshot)
  return snapshot.id
}
