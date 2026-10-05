import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react'
import { useSession } from '../auth/SessionContext'
import { Button, Field, Select } from '../components/Controls'
import { EmptyState, PageHeader, Panel } from '../components/Primitives'
import { changedFields, formatAuditValue, type AuditAction } from '../lib/audit'
import { listOptions, listRows } from '../lib/crud'
import { formatDate } from '../lib/format'
import { useQuery } from '../lib/useQuery'

interface AuditRow {
  id: number
  table_name: string
  record_id: string | null
  action: AuditAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by_user: string | null
  changed_at: string
}

const PAGE_SIZE = 30
const ACTION_LABEL: Record<AuditAction, string> = { INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja' }
const ACTION_TONE: Record<AuditAction, string> = {
  INSERT: 'bg-mc-success-soft text-mc-success',
  UPDATE: 'bg-mc-yellow-wash text-mc-yellow-ink',
  DELETE: 'bg-mc-danger-soft text-mc-danger',
}

/** Nombre legible de las tablas que ya tienen pantalla; las demás muestran su nombre técnico. */
const TABLE_LABEL: Record<string, string> = {
  app_users: 'Usuarios',
}
const tableLabel = (table: string) => TABLE_LABEL[table] ?? table

function Entry({ row, author }: { row: AuditRow; author: string }) {
  const [open, setOpen] = useState(false)
  const changes = changedFields(row.action, row.old_data, row.new_data)
  const subject = String(row.new_data?.display_name ?? row.new_data?.name ?? row.new_data?.folio ?? row.old_data?.display_name ?? row.old_data?.name ?? row.old_data?.folio ?? row.record_id ?? '')

  return (
    <li data-testid={`audit-${row.id}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-mc-surface-2/60">
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${ACTION_TONE[row.action]}`}>{ACTION_LABEL[row.action]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-mc-ink">{tableLabel(row.table_name)} · {subject}</span>
          <span className="block truncate text-xs text-mc-muted">{author} · {formatDate(row.changed_at, true)} · {changes.length} {changes.length === 1 ? 'campo' : 'campos'}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-mc-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-mc-line-soft bg-mc-surface-2/50 px-4 py-3">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Detalle del cambio</caption>
            <thead className="text-mc-muted">
              <tr><th scope="col" className="py-1 pr-4 font-semibold">Campo</th><th scope="col" className="py-1 pr-4 font-semibold">Antes</th><th scope="col" className="py-1 font-semibold">Después</th></tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.field} className="align-top">
                  <th scope="row" className="py-1 pr-4 font-semibold text-mc-gray-700">{change.field}</th>
                  <td className="break-all py-1 pr-4 text-mc-muted">{formatAuditValue(change.before)}</td>
                  <td className="break-all py-1 text-mc-ink">{formatAuditValue(change.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  )
}

export function AuditPage() {
  const { can } = useSession()
  const allowed = can(['direccion', 'admin'])
  const [params, setParams] = useSearchParams()
  const action = params.get('accion') ?? ''
  const user = params.get('usuario') ?? ''
  const page = Math.max(0, Number(params.get('pagina') ?? '1') - 1)

  const setParam = (changes: Record<string, string | null>) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace: true })
  }

  const users = useQuery(`audit-users|${allowed}`, async () => (allowed ? listOptions('app_users', 'display_name', [], false) : []))
  const query = useQuery(`audit|${allowed}|${action}|${user}|${page}`, async () =>
    allowed
      ? listRows<AuditRow>({
          table: 'audit_log',
          select: 'id,table_name,record_id,action,old_data,new_data,changed_by_user,changed_at',
          filters: { action, changed_by_user: user },
          orderBy: { column: 'changed_at', ascending: false },
          page,
          pageSize: PAGE_SIZE,
        })
      : { rows: [], total: 0 },
  )

  const header = <PageHeader eyebrow="Sistema" title="Bitácora" description="Registro automático de cada alta, cambio y baja: quién, cuándo, y el valor antes y después. Nadie puede editarla ni borrarla." />

  if (!allowed) {
    return (
      <div className="space-y-5">
        {header}
        <Panel testId="audit-forbidden">
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mc-warning-soft text-mc-warning"><ShieldAlert size={22} aria-hidden="true" /></span>
            <p className="mt-4 text-base font-extrabold text-mc-ink">Solo dirección y administración</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-mc-muted">Tu rol no tiene acceso a la bitácora.</p>
          </div>
        </Panel>
      </div>
    )
  }

  const names = new Map((users.data ?? []).map((item) => [String(item.id), String(item.display_name)]))
  const rows = query.data?.rows ?? []
  const total = query.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-5">
      {header}
      <Panel padding={false} testId="audit-log">
        <div className="grid gap-3 border-b border-mc-line-soft p-4 sm:grid-cols-[200px_240px_1fr] sm:items-end">
          <Field id="audit-action" label="Tipo de cambio">
            <Select id="audit-action" value={action} onChange={(event) => setParam({ accion: event.target.value || null, pagina: null })}>
              <option value="">Todos</option>
              {(Object.keys(ACTION_LABEL) as AuditAction[]).map((key) => <option key={key} value={key}>{ACTION_LABEL[key]}</option>)}
            </Select>
          </Field>
          <Field id="audit-user" label="Usuario">
            <Select id="audit-user" value={user} onChange={(event) => setParam({ usuario: event.target.value || null, pagina: null })}>
              <option value="">Todos</option>
              {(users.data ?? []).map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.display_name)}</option>)}
            </Select>
          </Field>
          <p className="text-xs text-mc-muted tabular sm:text-right" data-testid="result-count" aria-live="polite">{query.loading ? 'Cargando…' : `${total} ${total === 1 ? 'registro' : 'registros'}`}</p>
        </div>

        {query.error ? (
          <div className="p-6 text-center" role="alert">
            <p className="text-sm font-semibold text-mc-danger">{query.error}</p>
            <Button variant="outline" className="mt-3" onClick={query.reload}>Reintentar</Button>
          </div>
        ) : !query.loading && rows.length === 0 ? (
          <EmptyState title="Sin cambios registrados" description="Cuando alguien cree o modifique un registro aparecerá aquí." />
        ) : (
          <ul className={`divide-y divide-mc-line-soft ${query.loading ? 'opacity-60' : ''}`}>
            {rows.map((row) => <Entry key={row.id} row={row} author={row.changed_by_user ? names.get(row.changed_by_user) ?? 'Usuario eliminado' : 'Sistema'} />)}
          </ul>
        )}

        {pages > 1 && (
          <nav className="flex items-center justify-between gap-3 border-t border-mc-line-soft px-4 py-3" aria-label="Paginación">
            <Button variant="outline" disabled={page === 0} onClick={() => setParam({ pagina: page <= 1 ? null : String(page) })}><ChevronLeft size={15} aria-hidden="true" />Anterior</Button>
            <p className="text-xs text-mc-muted tabular">Página {page + 1} de {pages}</p>
            <Button variant="outline" disabled={page + 1 >= pages} onClick={() => setParam({ pagina: String(page + 2) })}>Siguiente<ChevronRight size={15} aria-hidden="true" /></Button>
          </nav>
        )}
      </Panel>
    </div>
  )
}
