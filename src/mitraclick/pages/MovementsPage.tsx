import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSession } from '../auth/SessionContext'
import { Button } from '../components/Controls'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { MovementForm } from '../components/StockForms'
import { MOVEMENT_LABEL } from '../lib/inventory'
import { formatDate, formatNumber } from '../lib/format'

type Row = Record<string, unknown>
const nested = (row: Row, key: string, field: string) => String((row[key] as Record<string, unknown> | null)?.[field] ?? '—')

const REFERENCE_LABEL: Record<string, string> = {
  manual: 'Captura manual', pedido: 'Pedido', compra: 'Compra', recepcion: 'Recepción', envio: 'Envío',
  remision: 'Remisión', conteo: 'Conteo', incidencia: 'Incidencia', shopify: 'Shopify', carga_inicial: 'Carga inicial',
}

const config: ResourceConfig = {
  table: 'stock_movements',
  noun: 'movimiento',
  title: 'Movimientos',
  eyebrow: 'Bodega',
  description: 'Libro de entradas, salidas, traspasos y ajustes. Cada renglón guarda quién, cuándo y por qué; no se edita ni se borra: un error se corrige con otro movimiento.',
  select: 'id,movement_type,quantity_delta,reference_type,reason,performed_at,product:products(sku,name),location:locations(code),user:app_users(display_name)',
  searchColumns: ['reason'],
  searchPlaceholder: 'Buscar en el motivo…',
  orderBy: { column: 'performed_at', ascending: false },
  writeRoles: [],
  fields: [],
  rowTitle: (row) => `${MOVEMENT_LABEL[String(row.movement_type)] ?? String(row.movement_type)} · ${nested(row, 'product', 'name')}`,
  filters: [
    { param: 'tipo', column: 'movement_type', label: 'Tipo', options: ['entrada', 'salida', 'traspaso_entrada', 'traspaso_salida', 'ajuste'].map((value) => ({ value, label: MOVEMENT_LABEL[value] })) },
    { param: 'ubicacion', column: 'location_id', label: 'Ubicación', relation: { table: 'locations', labelColumn: 'code' } },
  ],
  columns: [
    { key: 'product', label: 'Producto', render: (row) => nested(row, 'product', 'name') },
    { key: 'sku', label: 'SKU', render: (row) => nested(row, 'product', 'sku') },
    { key: 'movement_type', label: 'Tipo', render: (row) => MOVEMENT_LABEL[String(row.movement_type)] ?? String(row.movement_type) },
    { key: 'quantity_delta', label: 'Cantidad', align: 'right', render: (row) => { const value = Number(row.quantity_delta); return <span className={value < 0 ? 'text-mc-danger' : 'text-mc-success'}>{value > 0 ? '+' : '−'}{formatNumber(Math.abs(value))}</span> } },
    { key: 'location', label: 'Ubicación', render: (row) => nested(row, 'location', 'code') },
    { key: 'reference_type', label: 'Origen', render: (row) => REFERENCE_LABEL[String(row.reference_type)] ?? String(row.reference_type) },
    { key: 'reason', label: 'Motivo' },
    { key: 'user', label: 'Registró', render: (row) => (row.user ? nested(row, 'user', 'display_name') : 'Sistema') },
    { key: 'performed_at', label: 'Fecha', render: (row) => formatDate(String(row.performed_at), true) },
  ],
}

export function MovementsPage() {
  const { can } = useSession()
  const [adding, setAdding] = useState(false)
  const [version, setVersion] = useState(0)
  return (
    <>
      <ResourcePage
        key={version}
        config={config}
        headerActions={can(['direccion', 'admin', 'almacen', 'logistica', 'compras']) ? <Button onClick={() => setAdding(true)} data-testid="new-movement"><Plus size={16} aria-hidden="true" />Registrar movimiento</Button> : undefined}
      />
      {adding && <MovementForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); setVersion((value) => value + 1) }} />}
    </>
  )
}
