import { useState, type ChangeEvent } from 'react'
import { ArrowLeft, CheckCircle2, FileUp, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/SessionContext'
import { Button, Field, Select, TextInput } from '../components/Controls'
import { EmptyState, PageHeader, Panel } from '../components/Primitives'
import { ViewTabs } from '../components/ViewTabs'
import { callFunction, selectRows } from '../lib/crud'
import { parseCsv } from '../lib/csv'
import { formatNumber } from '../lib/format'
import { useChoices } from '../lib/useChoices'
import { useQuery } from '../lib/useQuery'
import { useView } from '../lib/useView'

interface InitialRow {
  location: string
  sku: string
  quantity: number
}

interface LoadResult {
  loaded: number
  adjusted: number
  skipped: number
  errors: { key: string | null; message: string }[]
}

interface LoadedLine {
  location: { code: string } | null
  product: { sku: string; name: string } | null
  quantity_delta: number
  performed_at: string
}

const VIEWS: { key: 'capturar' | 'importar' | 'cargado'; label: string }[] = [
  { key: 'capturar', label: 'Capturar en bodega' },
  { key: 'importar', label: 'Importar CSV' },
  { key: 'cargado', label: 'Lo ya cargado' },
]

const TITLE = 'Carga inicial de existencias'
const DESCRIPTION =
  'Lo que ya está físicamente en la bodega, antes de la primera venta. Entra al libro de movimientos como todo lo demás. Volver a cargar la misma ubicación y producto no suma otra vez: corrige por la diferencia, así que un segundo conteo se puede repetir sin miedo.'

function Notice({ tone, children }: { tone: 'ok' | 'error'; children: React.ReactNode }) {
  const className = tone === 'error' ? 'border-mc-danger/25 bg-mc-danger-soft text-mc-danger' : 'border-mc-success/30 bg-mc-success-soft text-mc-ink'
  return <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${className}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>
}

function Result({ result }: { result: LoadResult }) {
  return (
    <div className="space-y-3" data-testid="load-result">
      <p className="flex items-center gap-2 text-sm font-semibold text-mc-ink">
        <CheckCircle2 size={18} className="text-mc-success" aria-hidden="true" />
        {result.loaded} cargadas · {result.adjusted} corregidas · {result.skipped} ya estaban igual
        {result.errors.length > 0 && ` · ${result.errors.length} con problema`}
      </p>
      {result.errors.length > 0 && (
        <ul className="max-h-56 list-disc space-y-1 overflow-y-auto rounded-xl border border-mc-danger/25 bg-mc-danger-soft py-3 pl-8 pr-3 text-xs text-mc-ink" role="alert">
          {result.errors.map((error, index) => <li key={index}><strong>{error.key ?? 'Fila sin datos'}</strong>: {error.message}</li>)}
        </ul>
      )}
    </div>
  )
}

/** Captura parada frente al anaquel: se elige la ubicación y se listan los productos. */
function CaptureView({ onDone }: { onDone: (result: LoadResult) => void }) {
  const locations = useChoices('locations', 'code')
  const [location, setLocation] = useState('')
  const [lines, setLines] = useState([{ sku: '', quantity: '' }])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // La función de la base busca por SKU, así que el select guarda el SKU, no el id.
  const skuOptions = useQuery('initial-skus', () =>
    selectRows<{ id: string; sku: string; name: string }>('products', 'id,sku,name', { filters: { active: true }, orderBy: { column: 'name' }, limit: 1000 }),
  )

  const set = (index: number, changes: Partial<{ sku: string; quantity: string }>) =>
    setLines((previous) => previous.map((line, position) => (position === index ? { ...line, ...changes } : line)))

  const submit = async () => {
    setError(null)
    const code = locations.find((item) => item.value === location)?.label
    if (!code) return setError('Elige la ubicación.')
    const rows: InitialRow[] = []
    for (const [index, line] of lines.entries()) {
      if (!line.sku && !line.quantity.trim()) continue
      const quantity = Number(line.quantity.replace(/[,\s]/g, ''))
      if (!line.sku) return setError(`Renglón ${index + 1}: elige el producto.`)
      if (!Number.isFinite(quantity) || quantity < 0) return setError(`Renglón ${index + 1}: la cantidad debe ser un número, cero o más.`)
      rows.push({ location: code, sku: line.sku, quantity })
    }
    if (!rows.length) return setError('Agrega al menos un producto.')

    setSaving(true)
    try {
      const result = await callFunction<LoadResult>('load_initial_stock', { p_rows: rows, p_notes: null })
      onDone(result)
      setLines([{ sku: '', quantity: '' }])
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title="Qué hay en esta ubicación" description="Pensado para usarse de pie frente al anaquel. También se llega desde la etiqueta NFC/QR.">
      <div className="space-y-4">
        <Field id="initial-location" label="Ubicación" required>
          <Select id="initial-location" value={location} onChange={(event) => setLocation(event.target.value)} disabled={saving}>
            <option value="">Selecciona…</option>
            {locations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </Field>

        {lines.map((line, index) => (
          <fieldset key={index} className="grid gap-3 sm:grid-cols-12" disabled={saving}>
            <legend className="sr-only">Producto {index + 1}</legend>
            <div className="sm:col-span-7">
              <Field id={`initial-sku-${index}`} label="Producto" required>
                <Select id={`initial-sku-${index}`} value={line.sku} onChange={(event) => set(index, { sku: event.target.value })}>
                  <option value="">Selecciona…</option>
                  {(skuOptions.data ?? []).map((product) => <option key={product.id} value={product.sku}>{product.name} · {product.sku}</option>)}
                </Select>
              </Field>
            </div>
            <div className="sm:col-span-4">
              <Field id={`initial-qty-${index}`} label="Cantidad contada" required>
                <TextInput id={`initial-qty-${index}`} inputMode="decimal" value={line.quantity} onChange={(event) => set(index, { quantity: event.target.value })} />
              </Field>
            </div>
            <div className="flex items-end sm:col-span-1">
              {lines.length > 1 && (
                <button type="button" onClick={() => setLines((previous) => previous.filter((_, position) => position !== index))} className="mb-1 grid h-11 w-11 place-items-center rounded-lg text-mc-muted hover:bg-mc-danger-soft hover:text-mc-danger" aria-label={`Quitar el producto ${index + 1}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </fieldset>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setLines((previous) => [...previous, { sku: '', quantity: '' }])} disabled={saving}><Plus size={16} aria-hidden="true" />Otro producto</Button>
          <Button onClick={() => { void submit() }} disabled={saving} data-testid="save-initial">{saving ? 'Guardando…' : 'Guardar lo contado'}</Button>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Panel>
  )
}

/** CSV `ubicacion, sku, cantidad`. Se revisa en el navegador antes de guardar. */
function ImportView({ onDone }: { onDone: (result: LoadResult) => void }) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<InitialRow[]>([])
  const [problems, setProblems] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setRows([])
    setProblems([])
    setFailure(null)
    if (!file) return
    setFileName(file.name)

    const parsed = parseCsv(await file.text())
    const first = parsed[0]
    if (!first || !('ubicacion' in first) || !('sku' in first) || !('cantidad' in first)) {
      setProblems(['El archivo debe tener las columnas ubicacion, sku y cantidad en el primer renglón.'])
      return
    }
    const found: string[] = []
    const good: InitialRow[] = []
    parsed.forEach((row, index) => {
      const line = index + 2
      const location = (row.ubicacion ?? '').trim()
      const sku = (row.sku ?? '').trim()
      const quantity = Number((row.cantidad ?? '').replace(/[,\s]/g, ''))
      if (!location && !sku) return
      if (!location || !sku) found.push(`Fila ${line}: falta la ubicación o el SKU.`)
      else if (!Number.isFinite(quantity) || quantity < 0) found.push(`Fila ${line}: la cantidad debe ser un número, cero o más.`)
      else good.push({ location, sku, quantity })
    })
    setRows(good)
    setProblems(found)
  }

  const submit = async () => {
    setSaving(true)
    setFailure(null)
    try {
      onDone(await callFunction<LoadResult>('load_initial_stock', { p_rows: rows, p_notes: `Carga inicial desde ${fileName}` }))
      setRows([])
      setFileName('')
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title="Importar un archivo" description="Una fila por ubicación y producto. Las columnas se llaman ubicacion, sku y cantidad.">
      <label htmlFor="initial-file" className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-mc-line bg-mc-surface-2 px-4 py-6 text-center text-sm text-mc-muted hover:border-mc-charcoal">
        <FileUp size={22} aria-hidden="true" />
        <span className="font-semibold text-mc-ink">{fileName || 'Seleccionar archivo CSV'}</span>
        <span className="text-xs">Se revisa en tu navegador; nada se guarda hasta que confirmes.</span>
      </label>
      <input id="initial-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { void onFile(event) }} disabled={saving} data-testid="initial-file" />

      {problems.length > 0 && (
        <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto rounded-xl border border-mc-danger/25 bg-mc-danger-soft py-3 pl-8 pr-3 text-xs text-mc-ink" role="alert">
          {problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      )}
      {rows.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-mc-line-soft pt-4">
          <p className="text-sm text-mc-ink" data-testid="initial-preview"><strong>{formatNumber(rows.length)}</strong> renglones por cargar{problems.length > 0 && `, ${problems.length} se omiten`}.</p>
          <Button onClick={() => { void submit() }} disabled={saving} data-testid="import-initial">{saving ? 'Cargando…' : `Cargar ${formatNumber(rows.length)} renglones`}</Button>
        </div>
      )}
      {failure && <div className="mt-3"><Notice tone="error">{failure}</Notice></div>}
    </Panel>
  )
}

/** Lo que ya entró como carga inicial, para revisar antes de dar por buena la bodega. */
function LoadedView({ version }: { version: number }) {
  const query = useQuery(`initial-loaded|${version}`, () =>
    selectRows<LoadedLine>('stock_movements', 'quantity_delta,performed_at,location:locations(code),product:products(sku,name)', {
      filters: { reference_type: 'carga_inicial' },
      orderBy: { column: 'performed_at', ascending: false },
      limit: 500,
    }),
  )
  const rows = query.data ?? []
  const total = rows.reduce((sum, row) => sum + Number(row.quantity_delta), 0)

  return (
    <Panel
      title="Lo ya cargado"
      description={rows.length ? `${formatNumber(rows.length)} movimientos de carga inicial · ${formatNumber(total)} unidades en total.` : undefined}
      padding={false}
      testId="initial-loaded"
    >
      {query.error ? (
        <p className="p-5 text-sm text-mc-danger" role="alert">{query.error}</p>
      ) : rows.length === 0 ? (
        <EmptyState title={query.loading ? 'Cargando…' : 'Todavía no se ha cargado nada'} description="Lo que captures o importes aparecerá aquí, con la corrección si vuelves a contar." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Movimientos de carga inicial</caption>
            <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Ubicación</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Producto</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Cantidad</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Cuándo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mc-line-soft">
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="px-4 py-2.5 font-semibold text-mc-ink">{row.location?.code ?? '—'}</td>
                  <td className="px-4 py-2.5 text-mc-gray-700">{row.product?.name ?? '—'}<span className="block text-xs text-mc-muted">{row.product?.sku}</span></td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular ${Number(row.quantity_delta) < 0 ? 'text-mc-danger' : 'text-mc-ink'}`}>{Number(row.quantity_delta) > 0 ? '+' : '−'}{formatNumber(Math.abs(Number(row.quantity_delta)))}</td>
                  <td className="px-4 py-2.5 text-mc-muted">{new Date(row.performed_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

export function InitialStockPage() {
  const { can } = useSession()
  const view = useView(VIEWS)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [version, setVersion] = useState(0)
  const allowed = can(['direccion', 'admin', 'almacen'])

  const done = (loaded: LoadResult) => {
    setResult(loaded)
    setVersion((value) => value + 1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Bodega"
        title={TITLE}
        description={DESCRIPTION}
        actions={<Link to="/inventario" className="inline-flex items-center gap-2 rounded-xl border border-mc-line bg-mc-surface px-4 py-2 text-sm font-semibold text-mc-ink hover:border-mc-charcoal"><ArrowLeft size={16} aria-hidden="true" />Inventario</Link>}
      />
      <ViewTabs options={VIEWS} current={view} label="Forma de cargar" />
      {result && <Result result={result} />}

      {!allowed ? (
        <Panel><p className="text-sm text-mc-muted" role="alert">Solo dirección, administración y almacén pueden cargar existencias.</p></Panel>
      ) : view === 'capturar' ? (
        <CaptureView onDone={done} />
      ) : view === 'importar' ? (
        <ImportView onDone={done} />
      ) : null}

      {view === 'cargado' && <LoadedView version={version} />}
    </div>
  )
}
