import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useSession } from '../auth/SessionContext'
import { Button, Field, Select, TextArea } from '../components/Controls'
import { RecordDrawer } from '../components/RecordDrawer'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { CountForm } from '../components/StockForms'
import { callFunction } from '../lib/crud'
import { formatDate, formatNumber } from '../lib/format'

type Row = Record<string, unknown>
const nested = (row: Row, key: string, field: string) => String((row[key] as Record<string, unknown> | null)?.[field] ?? '—')

const STATUS_LABEL: Record<string, string> = { sin_diferencia: 'Sin diferencia', pendiente: 'Pendiente', ajustado: 'Ajustado', descartado: 'Descartado' }

function ResolveDrawer({ count, onClose, onSaved }: { count: Row; onClose: () => void; onSaved: () => void }) {
  const [action, setAction] = useState('ajustar')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const difference = Number(count.difference)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!reason.trim()) {
      setError('Escribe el motivo.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await callFunction('resolve_stock_count', { p_count_id: count.id, p_action: action, p_reason: reason.trim() })
      onSaved()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <RecordDrawer
      open
      title={nested(count, 'product', 'name')}
      subtitle={`Resolver diferencia de conteo · ${nested(count, 'location', 'code')}`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="resolve-form" disabled={saving} data-testid="save-record">{saving ? 'Guardando…' : 'Confirmar'}</Button>
        </div>
      }
    >
      <form id="resolve-form" onSubmit={(event) => { void submit(event) }} noValidate className="grid gap-4">
        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-mc-surface-2 p-3 text-sm">
          <div><dt className="text-xs text-mc-muted">Sistema</dt><dd className="font-bold tabular text-mc-ink">{formatNumber(Number(count.system_quantity))}</dd></div>
          <div><dt className="text-xs text-mc-muted">Contado</dt><dd className="font-bold tabular text-mc-ink">{formatNumber(Number(count.counted_quantity))}</dd></div>
          <div><dt className="text-xs text-mc-muted">Diferencia</dt><dd className="font-bold tabular text-mc-danger">{difference > 0 ? '+' : '−'}{formatNumber(Math.abs(difference))}</dd></div>
        </dl>
        <Field id="resolve-action" label="Qué hacer" required hint={action === 'ajustar' ? `Se registra un movimiento de ajuste de ${difference > 0 ? '+' : '−'}${formatNumber(Math.abs(difference))} ligado a este conteo.` : 'La existencia no cambia; el conteo queda como descartado.'}>
          <Select id="resolve-action" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="ajustar">Ajustar la existencia</option>
            <option value="descartar">Descartar el conteo</option>
          </Select>
        </Field>
        <Field id="resolve-reason" label="Motivo" required error={error ?? undefined}>
          <TextArea id="resolve-reason" value={reason} error={error ?? undefined} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </form>
    </RecordDrawer>
  )
}

export function CountsPage() {
  const { can } = useSession()
  const canResolve = can(['direccion', 'admin'])
  const [adding, setAdding] = useState(false)
  const [resolving, setResolving] = useState<Row | null>(null)
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((value) => value + 1)

  const config: ResourceConfig = {
    table: 'stock_counts',
    noun: 'conteo',
    title: 'Conteos',
    eyebrow: 'Bodega',
    description: 'Conteos físicos contra el sistema. Un conteo nunca sobrescribe la existencia: si hay diferencia queda pendiente hasta que dirección o administración la ajuste o la descarte, con motivo.',
    select: 'id,system_quantity,counted_quantity,difference,status,notes,counted_at,resolution_reason,product:products(sku,name),location:locations(code),counter:app_users!stock_counts_counted_by_fkey(display_name)',
    searchColumns: ['notes', 'resolution_reason'],
    searchPlaceholder: 'Buscar en notas…',
    orderBy: { column: 'counted_at', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: (row) => nested(row, 'product', 'name'),
    filters: [{ param: 'estado', column: 'status', label: 'Estado', options: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })) }],
    rowActions: canResolve
      ? (row) => (row.status === 'pendiente' ? <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => setResolving(row)} aria-label={`Resolver conteo de ${nested(row, 'product', 'name')}`}>Resolver</Button> : null)
      : undefined,
    columns: [
      { key: 'product', label: 'Producto', render: (row) => nested(row, 'product', 'name') },
      { key: 'location', label: 'Ubicación', render: (row) => nested(row, 'location', 'code') },
      { key: 'system_quantity', label: 'Sistema', align: 'right', render: (row) => formatNumber(Number(row.system_quantity)) },
      { key: 'counted_quantity', label: 'Contado', align: 'right', render: (row) => formatNumber(Number(row.counted_quantity)) },
      { key: 'difference', label: 'Diferencia', align: 'right', render: (row) => { const value = Number(row.difference); return value === 0 ? '0' : <span className="font-semibold text-mc-danger">{value > 0 ? '+' : '−'}{formatNumber(Math.abs(value))}</span> } },
      { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={STATUS_LABEL[String(row.status)] ?? String(row.status)} /> },
      { key: 'counter', label: 'Contó', render: (row) => (row.counter ? nested(row, 'counter', 'display_name') : '—') },
      { key: 'counted_at', label: 'Fecha', render: (row) => formatDate(String(row.counted_at), true) },
    ],
  }

  return (
    <>
      <ResourcePage
        key={version}
        config={config}
        headerActions={can(['direccion', 'admin', 'almacen']) ? <Button onClick={() => setAdding(true)} data-testid="new-count"><Plus size={16} aria-hidden="true" />Registrar conteo</Button> : undefined}
      />
      {adding && <CountForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh() }} />}
      {resolving && <ResolveDrawer count={resolving} onClose={() => setResolving(null)} onSaved={() => { setResolving(null); refresh() }} />}
    </>
  )
}
