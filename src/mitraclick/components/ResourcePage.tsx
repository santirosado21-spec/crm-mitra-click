import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search } from 'lucide-react'
import { useSession } from '../auth/SessionContext'
import type { AppRole } from '../auth/roles'
import { listOptions, listRows, saveRow } from '../lib/crud'
import { fromRow, toRow, validateValues, type FieldDef, type FormValue, type FormValues } from '../lib/forms'
import { useQuery } from '../lib/useQuery'
import { Button, Checkbox, Field, Select, TextArea, TextInput } from './Controls'
import { EmptyState, PageHeader, Panel } from './Primitives'
import { RecordDrawer } from './RecordDrawer'

type Row = Record<string, unknown>

export interface ColumnDef {
  key: string
  label: string
  render?: (row: Row) => ReactNode
  align?: 'right'
  /** En teléfono se muestra como subtítulo de la tarjeta en lugar de columna. */
  secondary?: boolean
}

export interface ResourceConfig {
  table: string
  /** Singular en minúsculas: "cliente", "producto". */
  noun: string
  title: string
  eyebrow?: string
  description: string
  select: string
  searchColumns: string[]
  searchPlaceholder?: string
  orderBy: { column: string; ascending?: boolean }
  columns: ColumnDef[]
  fields: FieldDef[]
  defaults?: FormValues
  writeRoles: AppRole[]
  /** La tabla tiene columna `active`: permite ocultar o mostrar inactivos. */
  hasActive?: boolean
  rowTitle: (row: Row) => string
  pageSize?: number
}

const PAGE_SIZE = 25
const text = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value))

function useRelationOptions(fields: FieldDef[], open: boolean) {
  const relations = useMemo(() => fields.filter((field) => field.relation), [fields])
  const key = open ? relations.map((field) => field.relation!.table).join('|') : 'closed'
  return useQuery(`relations:${key}`, async () => {
    if (!open) return {} as Record<string, Row[]>
    const entries = await Promise.all(
      relations.map(async (field) => {
        const relation = field.relation!
        const extra = relation.filterBy ? [relation.filterBy.column] : []
        return [field.name, await listOptions(relation.table, relation.labelColumn, extra, relation.onlyActive ?? true)] as const
      }),
    )
    return Object.fromEntries(entries) as Record<string, Row[]>
  })
}

function FieldControl({ field, value, error, disabled, options, onChange }: { field: FieldDef; value: FormValue; error?: string; disabled: boolean; options: { value: string; label: string }[]; onChange: (value: FormValue) => void }) {
  const id = `field-${field.name}`
  if (field.type === 'checkbox') return <Checkbox id={id} label={field.label} checked={Boolean(value)} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />

  let control: ReactNode
  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : []
    control = (
      <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label={field.label}>
        {options.map((option) => (
          <Checkbox key={option.value} label={option.label} checked={selected.includes(option.value)} disabled={disabled} onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} />
        ))}
      </div>
    )
  } else if (field.type === 'select') {
    control = (
      <Select id={id} value={String(value ?? '')} disabled={disabled} error={error} onChange={(event) => onChange(event.target.value)}>
        <option value="">{field.required ? 'Selecciona…' : 'Sin asignar'}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    )
  } else if (field.type === 'textarea') {
    control = <TextArea id={id} value={String(value ?? '')} disabled={disabled} error={error} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />
  } else {
    const numeric = field.type === 'number' || field.type === 'money'
    control = <TextInput id={id} type={numeric ? 'text' : field.type} inputMode={numeric ? 'decimal' : undefined} value={String(value ?? '')} disabled={disabled} error={error} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />
  }
  return <Field id={id} label={field.label} required={field.required} hint={field.hint} error={error}>{control}</Field>
}

function ResourceForm({ config, row, onClose, onSaved }: { config: ResourceConfig; row: Row | null; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<FormValues>(() => fromRow(config.fields, row, config.defaults))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const relations = useRelationOptions(config.fields, true)
  const editing = row !== null

  const optionsFor = (field: FieldDef) => {
    if (field.options) return field.options
    const relation = field.relation
    if (!relation) return []
    const rows = relations.data?.[field.name] ?? []
    const filter = relation.filterBy
    const visible = filter ? rows.filter((item) => String(item[filter.column] ?? '') === String(values[filter.field] ?? '')) : rows
    return visible.map((item) => ({ value: String(item.id), label: String(item[relation.labelColumn]) }))
  }

  const change = (field: FieldDef, value: FormValue) => {
    setValues((previous) => {
      const next = { ...previous, [field.name]: value }
      // Si cambia el campo del que depende otro (familia → categoría), se limpia el dependiente.
      for (const other of config.fields) {
        if (other.relation?.filterBy?.field === field.name) next[other.name] = ''
      }
      return next
    })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validateValues(config.fields, values)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setFailure(null)
    try {
      const payload = toRow(config.fields.filter((field) => !(editing && field.lockedOnEdit)), values)
      await saveRow(config.table, editing ? String(row.id) : null, payload)
      onSaved()
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <RecordDrawer
      open
      title={editing ? config.rowTitle(row) : `Nuevo ${config.noun}`}
      subtitle={editing ? `Editar ${config.noun}` : undefined}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="resource-form" disabled={saving} data-testid="save-record">{saving ? 'Guardando…' : editing ? 'Guardar cambios' : `Crear ${config.noun}`}</Button>
        </div>
      }
    >
      <form id="resource-form" onSubmit={(event) => { void submit(event) }} noValidate className="grid gap-4 sm:grid-cols-2">
        {config.fields.map((field) => (
          <div key={field.name} className={field.wide || field.type === 'textarea' || field.type === 'multiselect' ? 'sm:col-span-2' : ''}>
            <FieldControl field={field} value={values[field.name]} error={errors[field.name]} disabled={saving || (editing && Boolean(field.lockedOnEdit))} options={optionsFor(field)} onChange={(value) => change(field, value)} />
          </div>
        ))}
        {failure && <p className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft px-3 py-2 text-sm text-mc-danger sm:col-span-2" role="alert">{failure}</p>}
      </form>
    </RecordDrawer>
  )
}

/** Lista con búsqueda, paginación y formulario lateral para una tabla. */
export function ResourcePage({ config }: { config: ResourceConfig }) {
  const { can } = useSession()
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const showInactive = params.get('inactivos') === '1'
  const page = Math.max(0, Number(params.get('pagina') ?? '1') - 1)
  const pageSize = config.pageSize ?? PAGE_SIZE
  const [draft, setDraft] = useState(search)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const canWrite = can(config.writeRoles)

  const setParam = (changes: Record<string, string | null>) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      return next
    }, { replace: true })
  }

  // La búsqueda se aplica al dejar de escribir, y siempre regresa a la primera página.
  useEffect(() => {
    if (draft === search) return
    const timer = window.setTimeout(() => setParam({ q: draft.trim() || null, pagina: null }), 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const query = useQuery(`${config.table}|${search}|${showInactive}|${page}`, () =>
    listRows<Row>({
      table: config.table,
      select: config.select,
      searchColumns: config.searchColumns,
      search,
      filters: config.hasActive && !showInactive ? { active: true } : undefined,
      orderBy: config.orderBy,
      page,
      pageSize,
    }),
  )

  const rows = query.data?.rows ?? []
  const total = query.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const [primary, ...rest] = config.columns
  const cell = (column: ColumnDef, row: Row) => (column.render ? column.render(row) : text(row[column.key]))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        actions={canWrite ? <Button onClick={() => setEditing('new')} data-testid="new-record"><Plus size={16} aria-hidden="true" />Nuevo {config.noun}</Button> : undefined}
      />

      <Panel padding={false} testId={`resource-${config.table}`}>
        <div className="flex flex-col gap-3 border-b border-mc-line-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mc-gray-400" aria-hidden="true" />
            <TextInput type="search" aria-label={`Buscar ${config.title.toLowerCase()}`} placeholder={config.searchPlaceholder ?? 'Buscar…'} value={draft} onChange={(event) => setDraft(event.target.value)} className="pl-9" data-testid="search-input" />
          </div>
          <div className="flex items-center gap-4">
            {config.hasActive && <Checkbox label="Mostrar inactivos" checked={showInactive} onChange={(event) => setParam({ inactivos: event.target.checked ? '1' : null, pagina: null })} />}
            <p className="text-xs text-mc-muted tabular" data-testid="result-count" aria-live="polite">{query.loading ? 'Cargando…' : `${total} ${total === 1 ? 'registro' : 'registros'}`}</p>
          </div>
        </div>

        {query.error ? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm font-semibold text-mc-danger">{query.error}</p>
            <Button variant="outline" className="mt-3" onClick={query.reload}>Reintentar</Button>
          </div>
        ) : !query.loading && rows.length === 0 ? (
          <EmptyState title={search ? 'Sin resultados' : `Todavía no hay ${config.title.toLowerCase()}`} description={search ? 'Prueba con otra búsqueda.' : canWrite ? `Crea el primero con "Nuevo ${config.noun}".` : 'Cuando se registren aparecerán aquí.'} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{config.title}</caption>
                <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
                  <tr>
                    {config.columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-2.5 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</th>)}
                    {canWrite && <th scope="col" className="w-12 px-4 py-2.5"><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody className={`divide-y divide-mc-line-soft ${query.loading ? 'opacity-60' : ''}`}>
                  {rows.map((row) => (
                    <tr key={String(row.id)} className="hover:bg-mc-surface-2/60" data-testid={`row-${String(row.id)}`}>
                      {config.columns.map((column, index) => (
                        <td key={column.key} className={`px-4 py-2.5 ${index === 0 ? 'font-semibold text-mc-ink' : 'text-mc-gray-700'} ${column.align === 'right' ? 'text-right tabular' : ''}`}>{cell(column, row)}</td>
                      ))}
                      {canWrite && (
                        <td className="px-4 py-2.5 text-right">
                          <button type="button" onClick={() => setEditing(row)} className="grid h-9 w-9 place-items-center rounded-lg text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink" aria-label={`Editar ${config.rowTitle(row)}`}><Pencil size={15} aria-hidden="true" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={`divide-y divide-mc-line-soft md:hidden ${query.loading ? 'opacity-60' : ''}`}>
              {rows.map((row) => (
                <li key={String(row.id)} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-mc-ink">{cell(primary, row)}</p>
                    <dl className="mt-1 grid gap-0.5 text-xs text-mc-muted">
                      {rest.map((column) => <div key={column.key} className="flex gap-1.5"><dt className="shrink-0">{column.label}:</dt><dd className="min-w-0 truncate text-mc-gray-700">{cell(column, row)}</dd></div>)}
                    </dl>
                  </div>
                  {canWrite && <button type="button" onClick={() => setEditing(row)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-mc-line text-mc-muted" aria-label={`Editar ${config.rowTitle(row)}`}><Pencil size={16} aria-hidden="true" /></button>}
                </li>
              ))}
            </ul>
          </>
        )}

        {pages > 1 && (
          <nav className="flex items-center justify-between gap-3 border-t border-mc-line-soft px-4 py-3" aria-label="Paginación">
            <Button variant="outline" disabled={page === 0} onClick={() => setParam({ pagina: page <= 1 ? null : String(page) })}><ChevronLeft size={15} aria-hidden="true" />Anterior</Button>
            <p className="text-xs text-mc-muted tabular">Página {page + 1} de {pages}</p>
            <Button variant="outline" disabled={page + 1 >= pages} onClick={() => setParam({ pagina: String(page + 2) })}>Siguiente<ChevronRight size={15} aria-hidden="true" /></Button>
          </nav>
        )}
      </Panel>

      {editing && (
        <ResourceForm
          key={editing === 'new' ? 'new' : String(editing.id)}
          config={config}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); query.reload() }}
        />
      )}
    </div>
  )
}
