import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { ALL_ROLES, ROLE_LABEL, type AppRole } from '../auth/roles'
import { Button, Field, Select } from '../components/Controls'
import { ActionDrawer, ReasonField } from '../components/DocumentParts'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { ViewTabs } from '../components/ViewTabs'
import { callFunction, saveRow } from '../lib/crud'
import { formatDate } from '../lib/format'
import { ISSUE_STATUS_LABEL, RULE_LABEL, SEVERITY_LABEL, issueLink, ruleLabel } from '../lib/issues'
import { useView } from '../lib/useView'

type Row = Record<string, unknown>

const VIEWS: { key: 'pendientes' | 'alertas' | 'umbrales'; label: string }[] = [
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'alertas', label: 'Alertas' },
  { key: 'umbrales', label: 'Umbrales' },
]
const smallButton = '!px-3 !py-1.5 !text-xs'
const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }))
const shared = {
  title: 'Pendientes',
  eyebrow: 'Dirección',
  description: 'Solo las excepciones que requieren atención: qué falta, dónde está, a quién le toca y si ya quedó resuelto. Se revisa cada hora; lo que se corrige en el sistema se cierra solo.',
}

/** Cerrar un pendiente a mano: resuelto (ya se atendió) o descartado (no aplica). Siempre con nota. */
function CloseDrawer({ issue, userId, onClose, onSaved }: { issue: Row; userId: string; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState('resuelto')
  const [note, setNote] = useState('')
  const submit = async () => {
    if (!note.trim()) throw new Error('Escribe una nota: qué se hizo o por qué no aplica.')
    await saveRow('issues', String(issue.id), { status, resolution_note: note.trim(), resolved_at: new Date().toISOString(), resolved_by: userId })
    onSaved()
  }
  return (
    <ActionDrawer title="Cerrar pendiente" subtitle={String(issue.title)} submitLabel="Cerrar pendiente" onClose={onClose} onSubmit={submit}>
      <Field id="close-status" label="Resultado" required hint={status === 'descartado' ? 'Un pendiente descartado no vuelve a aparecer para este registro.' : 'Si el problema sigue en el sistema, volverá a abrirse en la siguiente revisión.'}>
        <Select id="close-status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="resuelto">Resuelto: ya se atendió</option>
          <option value="descartado">Descartado: no aplica</option>
        </Select>
      </Field>
      <ReasonField id="close-note" label="Nota" value={note} onChange={setNote} />
    </ActionDrawer>
  )
}

export function PendingPage() {
  const { can, profile } = useSession()
  const view = useView(VIEWS)
  const [closing, setClosing] = useState<Row | null>(null)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const refresh = () => setVersion((value) => value + 1)
  const userId = profile?.id ?? ''

  const act = async (action: () => Promise<unknown>) => {
    setNotice(null)
    try {
      await action()
      refresh()
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) })
    }
  }

  const check = async () => {
    setChecking(true)
    setNotice(null)
    try {
      const result = await callFunction<{ created: number; resolved: number; alerts: number }>('run_data_quality_check', {})
      setNotice({ tone: 'ok', text: `Revisión terminada: ${result.created} pendientes nuevos, ${result.resolved} cerrados porque ya se corrigieron, ${result.alerts} alertas nuevas.` })
      refresh()
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setChecking(false)
    }
  }

  const issues: ResourceConfig = {
    ...shared,
    table: 'issues',
    noun: 'pendiente',
    select: 'id,rule_code,entity_type,entity_id,title,detail,severity,status,assigned_role,assigned_to,detected_at,resolution_note,assignee:app_users!issues_assigned_to_fkey(display_name)',
    searchColumns: ['title', 'detail'],
    searchPlaceholder: 'Buscar en pendientes…',
    orderBy: { column: 'detected_at', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: (row) => String(row.title),
    filters: [
      { param: 'estado', column: 'status', label: 'Estado', options: options(ISSUE_STATUS_LABEL) },
      { param: 'severidad', column: 'severity', label: 'Severidad', options: options(SEVERITY_LABEL) },
      { param: 'area', column: 'assigned_role', label: 'Área', options: ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] })) },
      { param: 'regla', column: 'rule_code', label: 'Regla', options: options(RULE_LABEL) },
    ],
    rowActions: (row) => {
      const open = ['abierto', 'en_proceso'].includes(String(row.status))
      const link = issueLink(String(row.entity_type), row.entity_id ? String(row.entity_id) : null)
      return (
        <>
          {link && <Link to={link} className="inline-flex items-center rounded-xl border border-mc-line bg-white px-3 py-1.5 text-xs font-semibold text-mc-ink hover:border-mc-charcoal" aria-label={`Ir a corregir: ${String(row.title)}`}>Ir a corregir</Link>}
          {open && row.assigned_to !== userId && <Button variant="outline" className={smallButton} onClick={() => { void act(() => saveRow('issues', String(row.id), { assigned_to: userId, status: 'en_proceso' })) }} aria-label={`Tomar el pendiente: ${String(row.title)}`}>Lo tomo</Button>}
          {open && <Button className={smallButton} onClick={() => setClosing(row)} aria-label={`Cerrar el pendiente: ${String(row.title)}`}>Cerrar</Button>}
        </>
      )
    },
    columns: [
      { key: 'title', label: 'Qué falta', render: (row) => <span><span className="block font-semibold text-mc-ink">{String(row.title)}</span><span className="block text-xs font-normal text-mc-muted">{String(row.detail ?? '')}</span></span> },
      { key: 'rule_code', label: 'Regla', render: (row) => ruleLabel(String(row.rule_code)) },
      { key: 'severity', label: 'Severidad', render: (row) => <StatusBadge status={SEVERITY_LABEL[String(row.severity)] ?? String(row.severity)} /> },
      { key: 'assigned', label: 'Responsable', render: (row) => (row.assignee ? String((row.assignee as { display_name: string }).display_name) : row.assigned_role ? `Área: ${ROLE_LABEL[row.assigned_role as AppRole]}` : 'Sin asignar') },
      { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={ISSUE_STATUS_LABEL[String(row.status)] ?? String(row.status)} /> },
      { key: 'detected_at', label: 'Detectado', render: (row) => formatDate(String(row.detected_at)) },
    ],
  }

  const alerts: ResourceConfig = {
    ...shared,
    title: 'Pendientes',
    description: 'Alertas por excepción: facturas vencidas, productos en punto de reorden y acumulación de pendientes graves. Cada situación avisa una sola vez.',
    table: 'alerts',
    noun: 'alerta',
    select: 'id,alert_code,title,detail,severity,status,created_at',
    searchColumns: ['title', 'detail'],
    searchPlaceholder: 'Buscar en alertas…',
    orderBy: { column: 'created_at', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: (row) => String(row.title),
    filters: [
      { param: 'estado', column: 'status', label: 'Estado', options: [{ value: 'nueva', label: 'Nueva' }, { value: 'vista', label: 'Vista' }, { value: 'atendida', label: 'Atendida' }] },
      { param: 'severidad', column: 'severity', label: 'Severidad', options: options(SEVERITY_LABEL) },
    ],
    rowActions: can(['direccion', 'admin'])
      ? (row) => (
          <>
            {row.status === 'nueva' && <Button variant="outline" className={smallButton} onClick={() => { void act(() => saveRow('alerts', String(row.id), { status: 'vista' })) }} aria-label={`Marcar como vista: ${String(row.title)}`}>Vista</Button>}
            {row.status !== 'atendida' && <Button className={smallButton} onClick={() => { void act(() => saveRow('alerts', String(row.id), { status: 'atendida' })) }} aria-label={`Marcar como atendida: ${String(row.title)}`}>Atendida</Button>}
          </>
        )
      : undefined,
    columns: [
      { key: 'title', label: 'Alerta', render: (row) => <span><span className="block font-semibold text-mc-ink">{String(row.title)}</span><span className="block text-xs font-normal text-mc-muted">{String(row.detail ?? '')}</span></span> },
      { key: 'severity', label: 'Severidad', render: (row) => <StatusBadge status={SEVERITY_LABEL[String(row.severity)] ?? String(row.severity)} /> },
      { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={{ nueva: 'Nueva', vista: 'Vista', atendida: 'Atendida' }[String(row.status)] ?? String(row.status)} /> },
      { key: 'created_at', label: 'Fecha', render: (row) => formatDate(String(row.created_at), true) },
    ],
  }

  const settings: ResourceConfig = {
    ...shared,
    description: 'Cuánto se espera antes de que una situación se vuelva un pendiente. Los ajusta dirección o administración; cada cambio queda en la bitácora.',
    table: 'control_settings',
    noun: 'umbral',
    // La llave de la tabla es `key`; se expone como `id` para la lista genérica.
    select: 'id:key,label,value,unit',
    searchColumns: ['label'],
    orderBy: { column: 'label' },
    writeRoles: [],
    fields: [],
    rowTitle: (row) => String(row.label),
    rowActions: can(['direccion', 'admin'])
      ? (row) => (
          <span className="flex items-center gap-1">
            <Button variant="outline" className={smallButton} disabled={Number(row.value) <= 0} onClick={() => { void act(() => callSetting(String(row.id), Number(row.value) - 1)) }} aria-label={`Reducir un día: ${String(row.label)}`}>−1</Button>
            <Button variant="outline" className={smallButton} onClick={() => { void act(() => callSetting(String(row.id), Number(row.value) + 1)) }} aria-label={`Aumentar un día: ${String(row.label)}`}>+1</Button>
          </span>
        )
      : undefined,
    columns: [
      { key: 'label', label: 'Regla' },
      { key: 'value', label: 'Umbral', align: 'right', render: (row) => `${String(row.value)} ${String(row.unit)}` },
    ],
  }

  const config = view === 'pendientes' ? issues : view === 'alertas' ? alerts : settings

  return (
    <>
      <ResourcePage
        key={`${view}-${version}`}
        config={config}
        headerActions={<Button variant="outline" onClick={() => { void check() }} disabled={checking} data-testid="run-check"><RefreshCw size={16} aria-hidden="true" />{checking ? 'Revisando…' : 'Revisar ahora'}</Button>}
        toolbar={
          <div className="space-y-3">
            <ViewTabs options={VIEWS} current={view} label="Vista de control" />
            {notice && <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${notice.tone === 'error' ? 'border-mc-danger/25 bg-mc-danger-soft text-mc-danger' : 'border-mc-success/30 bg-mc-success-soft text-mc-ink'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
          </div>
        }
      />
      {closing && <CloseDrawer issue={closing} userId={userId} onClose={() => setClosing(null)} onSaved={() => { setClosing(null); refresh() }} />}
    </>
  )
}

// control_settings tiene `key` como llave, no `id`: se actualiza con una función propia.
async function callSetting(key: string, value: number) {
  await callFunction('set_control_setting', { p_key: key, p_value: value })
}
