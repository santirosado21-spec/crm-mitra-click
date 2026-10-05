import { useState, type FormEvent, type ReactNode } from 'react'
import { useSession } from '../auth/SessionContext'
import { callFunction, listOptions, saveRow, selectRows } from '../lib/crud'
import { INCIDENT_KINDS, MOVEMENT_LABEL, countOutcome, parseQuantity, toMovementRow, validateMovement, type MovementDraft, type MovementKind } from '../lib/inventory'
import { useQuery } from '../lib/useQuery'
import { Button, Field, Select, TextArea, TextInput } from './Controls'
import { RecordDrawer } from './RecordDrawer'

/** Producto y ubicación ya conocidos (p. ej. al abrir desde una etiqueta). */
export interface StockPreset {
  productId?: string
  locationId?: string
}

interface FormProps {
  preset?: StockPreset
  onClose: () => void
  onSaved: () => void
}

function useStockOptions() {
  return useQuery('stock-options', async () => {
    const [products, locations] = await Promise.all([listOptions('products', 'name', ['sku']), listOptions('locations', 'code', ['description'])])
    return {
      products: products.map((item) => ({ value: String(item.id), label: `${String(item.name)} · ${String(item.sku)}` })),
      locations: locations.map((item) => ({ value: String(item.id), label: item.description ? `${String(item.code)} · ${String(item.description)}` : String(item.code) })),
    }
  })
}

/** Existencia registrada de un producto en una ubicación (null mientras no se conoce). */
function useAvailable(productId: string, locationId: string): number | null {
  const query = useQuery(`available|${productId}|${locationId}`, async () => {
    if (!productId || !locationId) return null
    const rows = await selectRows<{ quantity: number }>('stock_levels', 'quantity', { filters: { product_id: productId, location_id: locationId }, limit: 1 })
    return Number(rows[0]?.quantity ?? 0)
  })
  return query.loading ? null : query.data
}

function Options({ items, placeholder }: { items: { value: string; label: string }[]; placeholder: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </>
  )
}

function FormShell({ title, subtitle, submitLabel, saving, failure, warning, onClose, onSubmit, children }: { title: string; subtitle: string; submitLabel: string; saving: boolean; failure: string | null; warning?: string | null; onClose: () => void; onSubmit: () => void; children: ReactNode }) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }
  return (
    <RecordDrawer
      open
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="stock-form" disabled={saving} data-testid="save-record">{saving ? 'Guardando…' : submitLabel}</Button>
        </div>
      }
    >
      <form id="stock-form" onSubmit={submit} noValidate className="grid gap-4">
        {children}
        {warning && <p className="rounded-xl border border-mc-warning/25 bg-mc-warning-soft px-3 py-2 text-sm text-mc-ink" role="status" data-testid="stock-warning">{warning}</p>}
        {failure && <p className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft px-3 py-2 text-sm text-mc-danger" role="alert">{failure}</p>}
      </form>
    </RecordDrawer>
  )
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function MovementForm({ type, preset, onClose, onSaved }: FormProps & { type?: MovementKind }) {
  const { can } = useSession()
  const options = useStockOptions()
  const kinds: MovementKind[] = can(['direccion', 'admin']) ? ['entrada', 'salida', 'traspaso', 'ajuste'] : ['entrada', 'salida', 'traspaso']
  const [draft, setDraft] = useState<MovementDraft>({ type: type ?? 'entrada', productId: preset?.productId ?? '', locationId: preset?.locationId ?? '', toLocationId: '', quantity: '', reason: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const available = useAvailable(draft.productId, draft.locationId)
  const live = validateMovement(draft, available)
  const set = (changes: Partial<MovementDraft>) => setDraft((previous) => ({ ...previous, ...changes }))

  const submit = async () => {
    setErrors(live.errors)
    if (Object.keys(live.errors).length) return
    setSaving(true)
    setFailure(null)
    try {
      if (draft.type === 'traspaso') {
        await callFunction('record_transfer', { p_product_id: draft.productId, p_from_location_id: draft.locationId, p_to_location_id: draft.toLocationId, p_quantity: parseQuantity(draft.quantity), p_reason: draft.reason.trim() || null })
      } else {
        await saveRow('stock_movements', null, toMovementRow(draft))
      }
      onSaved()
    } catch (error) {
      setFailure(message(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormShell title={`Registrar ${MOVEMENT_LABEL[draft.type].toLowerCase()}`} subtitle="Queda en el libro de movimientos; no se puede editar ni borrar." submitLabel="Registrar" saving={saving} failure={failure} warning={live.warning} onClose={onClose} onSubmit={() => { void submit() }}>
      {!type && (
        <Field id="mov-type" label="Tipo de movimiento" required>
          <Select id="mov-type" value={draft.type} onChange={(event) => set({ type: event.target.value as MovementKind })}>
            {kinds.map((kind) => <option key={kind} value={kind}>{MOVEMENT_LABEL[kind]}</option>)}
          </Select>
        </Field>
      )}
      <Field id="mov-product" label="Producto" required error={errors.productId}>
        <Select id="mov-product" value={draft.productId} error={errors.productId} disabled={Boolean(preset?.productId)} onChange={(event) => set({ productId: event.target.value })}>
          <Options items={options.data?.products ?? []} placeholder="Selecciona…" />
        </Select>
      </Field>
      <Field id="mov-location" label={draft.type === 'traspaso' ? 'Ubicación de origen' : 'Ubicación'} required error={errors.locationId} hint={available !== null ? `Existencia registrada: ${available}` : undefined}>
        <Select id="mov-location" value={draft.locationId} error={errors.locationId} onChange={(event) => set({ locationId: event.target.value })}>
          <Options items={options.data?.locations ?? []} placeholder="Selecciona…" />
        </Select>
      </Field>
      {draft.type === 'traspaso' && (
        <Field id="mov-destination" label="Ubicación de destino" required error={errors.toLocationId}>
          <Select id="mov-destination" value={draft.toLocationId} error={errors.toLocationId} onChange={(event) => set({ toLocationId: event.target.value })}>
            <Options items={options.data?.locations ?? []} placeholder="Selecciona…" />
          </Select>
        </Field>
      )}
      <Field id="mov-quantity" label="Cantidad" required error={errors.quantity} hint={draft.type === 'ajuste' ? 'Positiva para sumar, negativa para restar.' : undefined}>
        <TextInput id="mov-quantity" inputMode="decimal" value={draft.quantity} error={errors.quantity} onChange={(event) => set({ quantity: event.target.value })} />
      </Field>
      <Field id="mov-reason" label="Motivo o referencia" required={draft.type === 'ajuste'} error={errors.reason} hint="Pedido, compra, devolución, merma…">
        <TextArea id="mov-reason" value={draft.reason} error={errors.reason} onChange={(event) => set({ reason: event.target.value })} />
      </Field>
    </FormShell>
  )
}

export function CountForm({ preset, onClose, onSaved }: FormProps) {
  const options = useStockOptions()
  const [productId, setProductId] = useState(preset?.productId ?? '')
  const [locationId, setLocationId] = useState(preset?.locationId ?? '')
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const available = useAvailable(productId, locationId)
  const quantity = parseQuantity(counted)
  const valid = counted.trim() !== '' && Number.isFinite(quantity) && quantity >= 0
  const outcome = valid && available !== null ? countOutcome(quantity, available) : null

  const submit = async () => {
    const found: Record<string, string> = {}
    if (!productId) found.productId = 'Elige un producto.'
    if (!locationId) found.locationId = 'Elige una ubicación.'
    if (!valid) found.counted = 'Escribe la cantidad contada (cero o más).'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setFailure(null)
    try {
      // La existencia del sistema y la diferencia las fija la base al guardar.
      await saveRow('stock_counts', null, { product_id: productId, location_id: locationId, counted_quantity: quantity, notes: notes.trim() || null })
      onSaved()
    } catch (error) {
      setFailure(message(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormShell
      title="Registrar conteo"
      subtitle="El conteo no cambia la existencia: si hay diferencia, queda pendiente de revisión."
      submitLabel="Guardar conteo"
      saving={saving}
      failure={failure}
      warning={outcome && outcome.difference !== 0 ? `${outcome.label} contra el sistema (${available}). Dirección o administración decidirá si se ajusta.` : null}
      onClose={onClose}
      onSubmit={() => { void submit() }}
    >
      <Field id="count-product" label="Producto" required error={errors.productId}>
        <Select id="count-product" value={productId} error={errors.productId} disabled={Boolean(preset?.productId)} onChange={(event) => setProductId(event.target.value)}>
          <Options items={options.data?.products ?? []} placeholder="Selecciona…" />
        </Select>
      </Field>
      <Field id="count-location" label="Ubicación" required error={errors.locationId}>
        <Select id="count-location" value={locationId} error={errors.locationId} onChange={(event) => setLocationId(event.target.value)}>
          <Options items={options.data?.locations ?? []} placeholder="Selecciona…" />
        </Select>
      </Field>
      <Field id="count-quantity" label="Cantidad contada" required error={errors.counted}>
        <TextInput id="count-quantity" inputMode="decimal" value={counted} error={errors.counted} onChange={(event) => setCounted(event.target.value)} />
      </Field>
      <Field id="count-notes" label="Notas">
        <TextArea id="count-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </FormShell>
  )
}

export function IncidentForm({ preset, onClose, onSaved }: FormProps) {
  const options = useStockOptions()
  const [productId, setProductId] = useState(preset?.productId ?? '')
  const [locationId, setLocationId] = useState(preset?.locationId ?? '')
  const [kind, setKind] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const submit = async () => {
    const found: Record<string, string> = {}
    const amount = quantity.trim() === '' ? null : parseQuantity(quantity)
    if (!kind) found.kind = 'Elige el tipo de incidencia.'
    if (!description.trim()) found.description = 'Describe qué pasó.'
    if (amount !== null && !Number.isFinite(amount)) found.quantity = 'La cantidad debe ser un número.'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setFailure(null)
    try {
      await saveRow('incidents', null, { product_id: productId || null, location_id: locationId || null, kind, description: description.trim(), quantity: amount })
      onSaved()
    } catch (error) {
      setFailure(message(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormShell title="Reportar incidencia" subtitle="No mueve inventario: deja el aviso para que alguien lo revise." submitLabel="Reportar" saving={saving} failure={failure} onClose={onClose} onSubmit={() => { void submit() }}>
      <Field id="inc-kind" label="Tipo" required error={errors.kind}>
        <Select id="inc-kind" value={kind} error={errors.kind} onChange={(event) => setKind(event.target.value)}>
          <Options items={INCIDENT_KINDS} placeholder="Selecciona…" />
        </Select>
      </Field>
      <Field id="inc-product" label="Producto">
        <Select id="inc-product" value={productId} disabled={Boolean(preset?.productId)} onChange={(event) => setProductId(event.target.value)}>
          <Options items={options.data?.products ?? []} placeholder="Sin producto" />
        </Select>
      </Field>
      <Field id="inc-location" label="Ubicación">
        <Select id="inc-location" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
          <Options items={options.data?.locations ?? []} placeholder="Sin ubicación" />
        </Select>
      </Field>
      <Field id="inc-quantity" label="Cantidad afectada" error={errors.quantity}>
        <TextInput id="inc-quantity" inputMode="decimal" value={quantity} error={errors.quantity} onChange={(event) => setQuantity(event.target.value)} />
      </Field>
      <Field id="inc-description" label="Descripción" required error={errors.description}>
        <TextArea id="inc-description" value={description} error={errors.description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
    </FormShell>
  )
}
