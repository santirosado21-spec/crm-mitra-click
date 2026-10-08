import { useState, type ChangeEvent } from 'react'
import { ArrowLeft, CheckCircle2, FileUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import type { AppRole } from '../auth/roles'
import { Button } from '../components/Controls'
import { PageHeader, Panel } from '../components/Primitives'
import { callFunction } from '../lib/crud'
import { parseCsv } from '../lib/csv'
import { mapShopifyCustomers, mapShopifyProducts, type ImportError, type ImportResult } from '../lib/shopifyCsv'

type Kind = 'productos' | 'clientes'
type PreviewRow = Record<string, unknown>

interface KindDef {
  title: string
  back: string
  eyebrow: string
  description: string
  steps: string
  rpc: string
  roles: AppRole[]
  map: (rows: ReturnType<typeof parseCsv>) => ImportResult<PreviewRow>
  columns: { key: string; label: string }[]
  noun: [string, string]
}

const KINDS: Record<Kind, KindDef> = {
  productos: {
    title: 'Importar productos',
    back: '/productos',
    eyebrow: 'Catálogo',
    description: 'Carga el catálogo desde la exportación CSV de Shopify. Los productos se identifican por SKU: los nuevos se crean y los existentes se actualizan, sin duplicar.',
    steps: 'En Shopify: Productos → Exportar → Todos los productos → CSV sin formato.',
    rpc: 'import_products',
    roles: ['direccion', 'admin', 'compras'],
    map: (rows) => mapShopifyProducts(rows) as unknown as ImportResult<PreviewRow>,
    columns: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Nombre' }, { key: 'family_name', label: 'Tipo en Shopify' }, { key: 'price', label: 'Precio' }, { key: 'cost', label: 'Costo' }],
    noun: ['producto', 'productos'],
  },
  clientes: {
    title: 'Importar clientes',
    back: '/clientes',
    eyebrow: 'Ventas',
    description: 'Carga los clientes desde la exportación CSV de Shopify. Se identifican por su ID de Shopify o por correo: los nuevos se crean y los existentes se actualizan.',
    steps: 'En Shopify: Clientes → Exportar → Todos los clientes → CSV sin formato.',
    rpc: 'import_customers',
    roles: ['direccion', 'admin', 'ventas', 'finanzas'],
    map: (rows) => mapShopifyCustomers(rows) as unknown as ImportResult<PreviewRow>,
    columns: [{ key: 'name', label: 'Nombre' }, { key: 'kind', label: 'Tipo' }, { key: 'email', label: 'Correo' }, { key: 'phone', label: 'Teléfono' }, { key: 'city', label: 'Ciudad' }],
    noun: ['cliente', 'clientes'],
  },
}

interface Outcome {
  created: number
  updated: number
  errors: { key: string; message: string }[]
}

const BATCH = 200
const show = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value))

function ErrorList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft p-4" role="alert" data-testid="import-errors">
      <p className="text-sm font-bold text-mc-danger">{title}</p>
      <ul className="mt-2 max-h-56 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-mc-ink">
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  )
}

export function ImportPage({ kind }: { kind: Kind }) {
  const def = KINDS[kind]
  const { can } = useSession()
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<ImportResult<PreviewRow> | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setOutcome(null)
    setFailure(null)
    setReadError(null)
    setPreview(null)
    if (!file) return
    setFileName(file.name)
    try {
      const rows = parseCsv(await file.text())
      if (!rows.length) setReadError('El archivo está vacío o no tiene filas debajo del encabezado.')
      else setPreview(def.map(rows))
    } catch {
      setReadError('No se pudo leer el archivo. Verifica que sea un CSV.')
    }
  }

  const run = async () => {
    if (!preview) return
    setFailure(null)
    const total: Outcome = { created: 0, updated: 0, errors: [] }
    try {
      // Por lotes: un archivo grande no se pierde completo si falla la conexión a la mitad.
      for (let start = 0; start < preview.rows.length; start += BATCH) {
        setProgress(start)
        const result = await callFunction<Outcome>(def.rpc, { p_rows: preview.rows.slice(start, start + BATCH) })
        total.created += result.created
        total.updated += result.updated
        total.errors.push(...result.errors)
      }
      setOutcome(total)
    } catch (error) {
      setFailure(`${error instanceof Error ? error.message : String(error)} Se guardaron ${total.created + total.updated} registros antes del error; puedes volver a importar el mismo archivo sin duplicar.`)
    } finally {
      setProgress(null)
    }
  }

  const header = (
    <PageHeader
      eyebrow={def.eyebrow}
      title={def.title}
      description={def.description}
      actions={<Link to={def.back} className="inline-flex items-center gap-2 rounded-xl border border-mc-line bg-mc-surface px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-charcoal"><ArrowLeft size={16} aria-hidden="true" />Volver</Link>}
    />
  )

  if (!can(def.roles)) {
    return <div className="space-y-5">{header}<Panel><p className="text-sm text-mc-muted" role="alert">Tu rol no tiene permiso para importar {def.noun[1]}.</p></Panel></div>
  }

  const fileErrors = (preview?.errors ?? []).map((error: ImportError) => `Fila ${error.line}: ${error.message}`)
  const running = progress !== null
  const count = preview?.rows.length ?? 0

  return (
    <div className="space-y-5">
      {header}

      <Panel title="1. Elige el archivo" description={def.steps}>
        <label htmlFor="import-file" className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-mc-line bg-mc-surface-2 px-4 py-6 text-center text-sm text-mc-muted hover:border-mc-charcoal">
          <FileUp size={22} aria-hidden="true" />
          <span className="font-semibold text-mc-ink">{fileName || 'Seleccionar archivo CSV'}</span>
          <span className="text-xs">El archivo se revisa en tu navegador; nada se guarda hasta que confirmes.</span>
        </label>
        <input id="import-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { void onFile(event) }} disabled={running} data-testid="import-file" />
        {readError && <p className="mt-3 text-sm font-semibold text-mc-danger" role="alert">{readError}</p>}
      </Panel>

      {preview && (
        <Panel title="2. Revisa antes de guardar" padding={false} testId="import-preview">
          <div className="space-y-4 p-5">
            <p className="text-sm text-mc-ink" data-testid="import-summary">
              <strong>{count}</strong> {count === 1 ? def.noun[0] : def.noun[1]} por importar
              {preview.skipped > 0 && <> · {preview.skipped} filas sin registro (imágenes adicionales)</>}
              {preview.errors.length > 0 && <> · <span className="font-semibold text-mc-danger">{preview.errors.length} con problema, no se importarán</span></>}
            </p>
            <ErrorList title="Filas con problema" items={fileErrors} />
            {kind === 'productos' && count > 0 && <p className="text-xs leading-5 text-mc-muted">La familia solo se asigna si ya existe una con el mismo nombre que el tipo de Shopify. Los demás productos quedan sin familia para clasificarlos después; al importar no se crean familias.</p>}
          </div>
          {count > 0 && (
            <div className="overflow-x-auto border-t border-mc-line-soft">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Vista previa de los primeros registros</caption>
                <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
                  <tr>{def.columns.map((column) => <th key={column.key} scope="col" className="px-4 py-2.5 font-semibold">{column.label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-mc-line-soft">
                  {preview.rows.slice(0, 20).map((row, index) => (
                    <tr key={index}>{def.columns.map((column) => <td key={column.key} className="max-w-64 truncate px-4 py-2 text-mc-gray-700">{show(row[column.key])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              {count > 20 && <p className="border-t border-mc-line-soft px-4 py-2 text-xs text-mc-muted">Se muestran los primeros 20 de {count}.</p>}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-mc-line-soft p-4">
            {running && <p className="text-xs text-mc-muted" role="status">Guardando… {progress} de {count}</p>}
            <Button onClick={() => { void run() }} disabled={running || count === 0 || outcome !== null} data-testid="import-run">Importar {count} {count === 1 ? def.noun[0] : def.noun[1]}</Button>
          </div>
        </Panel>
      )}

      {failure && <p className="rounded-xl border border-mc-danger/25 bg-mc-danger-soft px-4 py-3 text-sm text-mc-danger" role="alert">{failure}</p>}

      {outcome && (
        <Panel title="3. Resultado" testId="import-result">
          <p className="flex items-center gap-2 text-sm font-semibold text-mc-ink"><CheckCircle2 size={18} className="text-mc-success" aria-hidden="true" />{outcome.created} creados · {outcome.updated} actualizados{outcome.errors.length > 0 && ` · ${outcome.errors.length} rechazados`}</p>
          <div className="mt-4"><ErrorList title="Registros que la base rechazó" items={outcome.errors.map((error) => `${error.key}: ${error.message}`)} /></div>
        </Panel>
      )}
    </div>
  )
}
