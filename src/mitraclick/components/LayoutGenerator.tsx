import { useState } from 'react'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { Button, Field, Select, TextInput } from './Controls'
import { ActionDrawer } from './DocumentParts'
import { callFunction } from '../lib/crud'
import { useChoices } from '../lib/useChoices'
import {
  LOCATION_KINDS,
  MAX_LEVEL,
  MAX_POSITION,
  SMALL_WAREHOUSE,
  describeLayout,
  validateLayout,
  type LocationKind,
  type ZonePlan,
} from '../lib/warehouse'

interface DraftZone {
  zone: string
  positions: string
  levels: string
  kind: '' | LocationKind
  description: string
}

const toDraft = (plan: ZonePlan): DraftZone => ({
  zone: plan.zone,
  positions: String(plan.positions),
  levels: String(plan.levels),
  kind: plan.kind ?? '',
  description: plan.description ?? '',
})

const toPlan = (draft: DraftZone): ZonePlan => ({
  zone: draft.zone,
  positions: Number(draft.positions) || 0,
  levels: Number(draft.levels) || 0,
  kind: draft.kind || undefined,
  description: draft.description || undefined,
})

const emptyZone = (): DraftZone => ({ zone: '', positions: '8', levels: '4', kind: '', description: '' })

/**
 * Crea las ubicaciones de una bodega de golpe, por zonas. Sustituye al import de Excel:
 * se describe la estructura (anaquel A de 8 posiciones por 4 niveles) y la base genera
 * los códigos. Volver a generar una zona existente la actualiza, no la duplica.
 */
export function LayoutGenerator({ onClose, onDone }: { onClose: () => void; onDone: (summary: string) => void }) {
  const warehouses = useChoices('warehouses', 'name')
  const [warehouseId, setWarehouseId] = useState('')
  const [zones, setZones] = useState<DraftZone[]>(() => SMALL_WAREHOUSE.map(toDraft))

  const plans = zones.map(toPlan)
  const problems = validateLayout(plans)
  const set = (index: number, changes: Partial<DraftZone>) =>
    setZones((previous) => previous.map((zone, position) => (position === index ? { ...zone, ...changes } : zone)))

  const submit = async () => {
    if (!warehouseId) throw new Error('Elige el almacén.')
    if (problems.length) throw new Error(problems.join(' '))
    const result = await callFunction<{ created: number; updated: number; total: number }>('generate_locations', {
      p_warehouse_id: warehouseId,
      p_zones: plans.map((plan) => ({ zone: plan.zone, positions: plan.positions, levels: plan.levels, kind: plan.kind ?? null, description: plan.description ?? null })),
    })
    onDone(`${result.created} ubicaciones nuevas y ${result.updated} actualizadas. El almacén quedó con ${result.total}.`)
  }

  return (
    <ActionDrawer
      title="Generar ubicaciones"
      subtitle="Describe la estructura y el sistema crea los códigos. Las zonas que ya existan se actualizan, no se duplican."
      submitLabel="Generar"
      onClose={onClose}
      onSubmit={submit}
    >
      <Field id="layout-warehouse" label="Almacén" required>
        <Select id="layout-warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
          <option value="">Selecciona…</option>
          {warehouses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
      </Field>

      {zones.map((zone, index) => (
        <fieldset key={index} className="rounded-xl border border-mc-line-soft bg-mc-surface-2/50 p-3">
          <legend className="px-1 text-xs font-semibold text-mc-muted">Zona {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <Field id={`zone-${index}-name`} label="Nombre" required>
                <TextInput id={`zone-${index}-name`} value={zone.zone} placeholder="A" onChange={(event) => set(index, { zone: event.target.value.toUpperCase() })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id={`zone-${index}-pos`} label="Posiciones" hint="0 = zona suelta">
                <TextInput id={`zone-${index}-pos`} inputMode="numeric" value={zone.positions} onChange={(event) => set(index, { positions: event.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id={`zone-${index}-lvl`} label="Niveles">
                <TextInput id={`zone-${index}-lvl`} inputMode="numeric" value={zone.levels} onChange={(event) => set(index, { levels: event.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-4">
              <Field id={`zone-${index}-kind`} label="Tipo" hint="Vacío: nivel 1 es picking y el resto almacenaje.">
                <Select id={`zone-${index}-kind`} value={zone.kind} onChange={(event) => set(index, { kind: event.target.value as DraftZone['kind'] })}>
                  <option value="">Automático</option>
                  {Object.entries(LOCATION_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="flex items-end sm:col-span-1">
              {zones.length > 1 && (
                <button type="button" onClick={() => setZones((previous) => previous.filter((_, position) => position !== index))} className="mb-1 grid h-10 w-10 place-items-center rounded-lg text-mc-muted hover:bg-mc-danger-soft hover:text-mc-danger" aria-label={`Quitar la zona ${index + 1}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="sm:col-span-12">
              <Field id={`zone-${index}-desc`} label="Descripción">
                <TextInput id={`zone-${index}-desc`} value={zone.description} onChange={(event) => set(index, { description: event.target.value })} />
              </Field>
            </div>
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setZones((previous) => [...previous, emptyZone()])}><Plus size={16} aria-hidden="true" />Agregar zona</Button>
        <Button variant="outline" onClick={() => setZones(SMALL_WAREHOUSE.map(toDraft))}><Wand2 size={16} aria-hidden="true" />Bodega chica estándar</Button>
      </div>

      <p className="rounded-xl bg-mc-surface-2 px-3 py-2 text-sm text-mc-ink" role="status" data-testid="layout-summary">{describeLayout(plans)}</p>
      {problems.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-mc-danger" role="alert">
          {problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      )}
      <p className="text-xs leading-5 text-mc-muted">
        Los códigos salen como <code>A-01-1</code>: zona, posición y nivel. Máximo {MAX_POSITION} posiciones
        y {MAX_LEVEL} niveles por zona. El recorrido de surtido sigue ese orden, y las zonas sin
        posiciones (recepción, embarque) quedan al final.
      </p>
    </ActionDrawer>
  )
}
