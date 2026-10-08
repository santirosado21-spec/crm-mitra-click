import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { Button, Field, Select, TextInput } from '../components/Controls'
import { ActionDrawer, ReasonField } from '../components/DocumentParts'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { callFunction } from '../lib/crud'
import { statusLabel } from '../lib/documents'
import { formatDate } from '../lib/format'
import { evidenceProblem, evidenceUrl, uploadEvidence } from '../lib/storage'

type Row = Record<string, unknown>

const nested = (row: Row, key: string, field: string) => String((row[key] as Record<string, unknown> | null)?.[field] ?? '—')
const orderLink = (row: Row) => (row.order ? <Link to={`/pedidos/${nested(row, 'order', 'id')}`} className="font-semibold text-mc-ink underline">{nested(row, 'order', 'folio')}</Link> : '—')
const smallButton = '!px-3 !py-1.5 !text-xs'
const statusOptions = (values: string[]) => values.map((value) => ({ value, label: statusLabel(value) }))

/** Entrega: quién recibió y la evidencia (fotos o PDF) que respalda la remisión. */
function DeliveryDrawer({ shipment, onClose, onSaved }: { shipment: Row; onClose: () => void; onSaved: () => void }) {
  const [receivedBy, setReceivedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [problems, setProblems] = useState<string[]>([])

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(event.target.files ?? [])]
    setProblems(picked.map(evidenceProblem).filter((item): item is string => item !== null))
    setFiles(picked.filter((file) => evidenceProblem(file) === null))
  }

  const submit = async () => {
    if (!receivedBy.trim()) throw new Error('Escribe quién recibió.')
    const paths = await uploadEvidence(String(shipment.id), files)
    await callFunction('register_delivery', { p_shipment_id: shipment.id, p_received_by_name: receivedBy, p_evidence_paths: paths, p_notes: notes })
    onSaved()
  }

  return (
    <ActionDrawer title="Registrar entrega" subtitle={`Envío ${String(shipment.folio)} · La remisión queda entregada y pendiente de verificación.`} submitLabel="Registrar entrega" onClose={onClose} onSubmit={submit}>
      <Field id="delivery-name" label="Recibió" required hint="Nombre de quien firmó de recibido.">
        <TextInput id="delivery-name" value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} />
      </Field>
      <Field id="delivery-files" label="Evidencia" hint="Foto de la remisión firmada o de la entrega. JPG, PNG, WebP o PDF, hasta 10 MB cada uno.">
        <input id="delivery-files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={pick} className="block w-full text-sm text-mc-ink file:mr-3 file:rounded-lg file:border-0 file:bg-mc-surface-2 file:px-3 file:py-2 file:text-sm file:font-semibold" />
      </Field>
      {files.length > 0 && <p className="text-xs text-mc-muted" role="status">{files.length} {files.length === 1 ? 'archivo listo' : 'archivos listos'} para subir.</p>}
      {problems.length > 0 && <ul className="list-disc pl-5 text-xs text-mc-danger" role="alert">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
      {files.length === 0 && <p className="rounded-xl border border-mc-warning/25 bg-mc-warning-soft px-3 py-2 text-xs text-mc-ink">Sin evidencia, quien verifique la remisión no tendrá con qué comprobar la entrega.</p>}
      <ReasonField id="delivery-notes" label="Notas" required={false} value={notes} onChange={setNotes} />
    </ActionDrawer>
  )
}

export function ShipmentsPage() {
  const { can } = useSession()
  const canWrite = can(['direccion', 'admin', 'logistica', 'almacen'])
  const [delivering, setDelivering] = useState<Row | null>(null)
  const [version, setVersion] = useState(0)
  const [failure, setFailure] = useState<string | null>(null)
  const refresh = () => setVersion((value) => value + 1)

  const move = async (row: Row, status: string) => {
    setFailure(null)
    try {
      await callFunction('set_shipment_status', { p_id: row.id, p_status: status })
      refresh()
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    }
  }

  const config: ResourceConfig = {
    table: 'shipments',
    noun: 'envío',
    title: 'Envíos y rutas',
    eyebrow: 'Logística',
    description: 'Entregas programadas y en ruta. Un envío nace al surtir un pedido: en ese momento sale la mercancía de bodega y se crea su remisión.',
    select: 'id,folio,status,carrier,route,driver,tracking_number,scheduled_on,delivered_at,order:sales_orders(id,folio)',
    searchColumns: ['folio', 'carrier', 'route', 'driver', 'tracking_number'],
    searchPlaceholder: 'Buscar por folio, ruta, chofer o guía…',
    orderBy: { column: 'created_at', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: (row) => String(row.folio),
    filters: [{ param: 'estado', column: 'status', label: 'Estado', options: statusOptions(['programado', 'en_ruta', 'incidencia', 'entregado', 'cancelado']) }],
    rowActions: canWrite
      ? (row) => (
          <>
            {row.status === 'programado' && <Button variant="outline" className={smallButton} onClick={() => { void move(row, 'en_ruta') }} aria-label={`Marcar el envío ${String(row.folio)} en ruta`}>Salió a ruta</Button>}
            {row.status === 'en_ruta' && <Button variant="outline" className={smallButton} onClick={() => { void move(row, 'incidencia') }} aria-label={`Reportar incidencia en el envío ${String(row.folio)}`}>Incidencia</Button>}
            {row.status === 'incidencia' && <Button variant="outline" className={smallButton} onClick={() => { void move(row, 'en_ruta') }} aria-label={`Reanudar el envío ${String(row.folio)}`}>Reanudar</Button>}
            {['programado', 'en_ruta', 'incidencia'].includes(String(row.status)) && <Button className={smallButton} onClick={() => setDelivering(row)} aria-label={`Registrar la entrega del envío ${String(row.folio)}`}>Entregado</Button>}
          </>
        )
      : undefined,
    columns: [
      { key: 'folio', label: 'Envío' },
      { key: 'order', label: 'Pedido', render: orderLink },
      { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={statusLabel(row.status)} /> },
      { key: 'scheduled_on', label: 'Programado', render: (row) => (row.scheduled_on ? formatDate(String(row.scheduled_on)) : '—') },
      { key: 'carrier', label: 'Transporte' },
      { key: 'route', label: 'Ruta' },
      { key: 'driver', label: 'Chofer' },
      { key: 'tracking_number', label: 'Guía' },
    ],
  }

  return (
    <>
      <ResourcePage
        key={version}
        config={config}
        headerActions={<Link to="/fletes" className="mc-press inline-flex min-h-11 items-center justify-center rounded-xl border border-mc-line bg-white px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-charcoal">Cotizar flete o crear viaje</Link>}
        toolbar={failure ? <p className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft px-4 py-3 text-sm font-semibold text-mc-danger" role="alert">{failure}</p> : undefined}
      />
      {delivering && <DeliveryDrawer shipment={delivering} onClose={() => setDelivering(null)} onSaved={() => { setDelivering(null); refresh() }} />}
    </>
  )
}

function VerifyDrawer({ remission, onClose, onSaved }: { remission: Row; onClose: () => void; onSaved: () => void }) {
  const [decision, setDecision] = useState('aprobar')
  const [notes, setNotes] = useState('')
  const submit = async () => {
    if (decision === 'rechazar' && !notes.trim()) throw new Error('Escribe por qué se rechaza.')
    await callFunction('verify_remission', { p_id: remission.id, p_approved: decision === 'aprobar', p_notes: notes })
    onSaved()
  }
  return (
    <ActionDrawer title="Verificar remisión" subtitle={`${String(remission.folio)} · Recibió: ${String(remission.received_by_name ?? '—')}`} submitLabel="Confirmar" onClose={onClose} onSubmit={submit}>
      <EvidenceLinks paths={(remission.evidence_paths as string[] | null) ?? []} />
      <Field id="verify-decision" label="Resultado" required>
        <Select id="verify-decision" value={decision} onChange={(event) => setDecision(event.target.value)}>
          <option value="aprobar">La evidencia respalda la entrega</option>
          <option value="rechazar">Rechazar: falta evidencia o no coincide</option>
        </Select>
      </Field>
      <ReasonField id="verify-notes" label="Notas" required={decision === 'rechazar'} value={notes} onChange={setNotes} />
    </ActionDrawer>
  )
}

/** Abre cada archivo con un link temporal: el bucket es privado. */
function EvidenceLinks({ paths }: { paths: string[] }) {
  const [error, setError] = useState<string | null>(null)
  if (!paths.length) return <p className="text-sm text-mc-muted">Sin evidencia adjunta.</p>
  const openFile = async (path: string) => {
    setError(null)
    try {
      window.open(await evidenceUrl(path), '_blank', 'noopener')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {paths.map((path, index) => <Button key={path} variant="outline" className={smallButton} onClick={() => { void openFile(path) }}>Ver evidencia {index + 1}</Button>)}
      {error && <span className="text-xs text-mc-danger" role="alert">{error}</span>}
    </div>
  )
}

export function RemissionsPage() {
  const { can } = useSession()
  const canVerify = can(['direccion', 'admin', 'finanzas'])
  const [verifying, setVerifying] = useState<Row | null>(null)
  const [version, setVersion] = useState(0)

  const config: ResourceConfig = {
    table: 'remissions',
    noun: 'remisión',
    title: 'Remisiones',
    eyebrow: 'Logística',
    description: 'Comprobante de cada entrega: quién recibió, con qué evidencia y quién lo verificó. La verificación la hace alguien distinto de quien entrega.',
    select: 'id,folio,status,delivered_at,received_by_name,evidence_paths,verified_at,notes,order:sales_orders(id,folio),shipment:shipments(folio),verifier:app_users(display_name)',
    searchColumns: ['folio', 'received_by_name', 'notes'],
    searchPlaceholder: 'Buscar por folio o quién recibió…',
    orderBy: { column: 'created_at', ascending: false },
    writeRoles: [],
    fields: [],
    rowTitle: (row) => String(row.folio),
    filters: [{ param: 'estado', column: 'status', label: 'Estado', options: statusOptions(['pendiente', 'entregada', 'verificada', 'rechazada']) }],
    rowActions: (row) => (
      <>
        {((row.evidence_paths as string[] | null) ?? []).length > 0 && row.status !== 'entregada' && <EvidenceLinks paths={row.evidence_paths as string[]} />}
        {canVerify && row.status === 'entregada' && <Button className={smallButton} onClick={() => setVerifying(row)} aria-label={`Verificar la remisión ${String(row.folio)}`}>Verificar</Button>}
      </>
    ),
    columns: [
      { key: 'folio', label: 'Remisión' },
      { key: 'order', label: 'Pedido', render: orderLink },
      { key: 'shipment', label: 'Envío', render: (row) => nested(row, 'shipment', 'folio') },
      { key: 'status', label: 'Estado', render: (row) => <StatusBadge status={statusLabel(row.status)} /> },
      { key: 'received_by_name', label: 'Recibió' },
      { key: 'delivered_at', label: 'Entregada', render: (row) => (row.delivered_at ? formatDate(String(row.delivered_at), true) : '—') },
      { key: 'evidence', label: 'Evidencia', render: (row) => { const count = ((row.evidence_paths as string[] | null) ?? []).length; return count ? `${count} ${count === 1 ? 'archivo' : 'archivos'}` : 'Sin evidencia' } },
      { key: 'verifier', label: 'Verificó', render: (row) => (row.verifier ? nested(row, 'verifier', 'display_name') : '—') },
    ],
  }

  return (
    <>
      <ResourcePage key={version} config={config} />
      {verifying && <VerifyDrawer remission={verifying} onClose={() => setVerifying(null)} onSaved={() => { setVerifying(null); setVersion((value) => value + 1) }} />}
    </>
  )
}
