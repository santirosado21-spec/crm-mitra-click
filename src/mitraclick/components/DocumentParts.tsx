import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { emptyLine, lineAmount, statusLabel, type DraftLine, type Totals } from '../lib/documents'
import { formatMoney } from '../lib/format'
import { Button, Field, Select, TextArea, TextInput } from './Controls'
import { StatusBadge } from './Primitives'
import { RecordDrawer } from './RecordDrawer'

export interface ProductOption {
  id: string
  name: string
  sku: string
  price: number | null
  cost: number | null
}

/** Encabezado de un documento: folio como h1, estado y link de regreso a su lista. */
export function DocumentHeader({ eyebrow, title, status, back, backLabel, actions }: { eyebrow: string; title: string; status?: string; back: string; backLabel: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <Link to={back} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-mc-muted hover:text-mc-ink"><ArrowLeft size={14} aria-hidden="true" />{backLabel}</Link>
        <p className="mt-1 text-xs font-semibold text-mc-yellow-ink">{eyebrow}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-mc-ink lg:text-[30px]">{title}</h1>
          {status && <span data-testid="document-status"><StatusBadge status={statusLabel(status)} /></span>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

const number = (text: string) => Number(text.replace(/[$,\s]/g, ''))

/**
 * Renglones editables. Al elegir un producto se llenan descripción y precio (o costo,
 * en compras); se pueden corregir a mano. Sin arrastrar: cada renglón tiene su botón.
 */
export function LineEditor({ lines, products, onChange, mode = 'venta', disabled = false }: { lines: DraftLine[]; products: ProductOption[]; onChange: (lines: DraftLine[]) => void; mode?: 'venta' | 'compra'; disabled?: boolean }) {
  const update = (index: number, changes: Partial<DraftLine>) => onChange(lines.map((line, position) => (position === index ? { ...line, ...changes } : line)))
  const pick = (index: number, productId: string) => {
    const product = products.find((item) => item.id === productId)
    if (!product) return update(index, { productId: '' })
    const price = mode === 'compra' ? product.cost : product.price
    update(index, { productId, description: product.name, unitPrice: price === null ? lines[index].unitPrice : String(price) })
  }
  const priceLabel = mode === 'compra' ? 'Costo unitario' : 'Precio unitario'

  return (
    <div className="space-y-3" data-testid="line-editor">
      {lines.map((line, index) => {
        const amount = lineAmount(number(line.quantity), number(line.unitPrice), mode === 'compra' ? 0 : number(line.discountPct || '0'))
        return (
          <fieldset key={index} className="rounded-xl border border-mc-line-soft bg-mc-surface-2/50 p-3" disabled={disabled}>
            <legend className="px-1 text-xs font-semibold text-mc-muted">Renglón {index + 1}</legend>
            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <Field id={`line-${index}-product`} label="Producto" required={mode === 'compra'}>
                  <Select id={`line-${index}-product`} value={line.productId} onChange={(event) => pick(index, event.target.value)}>
                    <option value="">{mode === 'compra' ? 'Selecciona…' : 'Texto libre (sin producto)'}</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
                  </Select>
                </Field>
              </div>
              {mode === 'venta' && (
                <div className="md:col-span-3">
                  <Field id={`line-${index}-description`} label="Descripción" required>
                    <TextInput id={`line-${index}-description`} value={line.description} onChange={(event) => update(index, { description: event.target.value })} />
                  </Field>
                </div>
              )}
              <div className={mode === 'venta' ? 'md:col-span-1' : 'md:col-span-2'}>
                <Field id={`line-${index}-quantity`} label="Cantidad" required>
                  <TextInput id={`line-${index}-quantity`} inputMode="decimal" value={line.quantity} onChange={(event) => update(index, { quantity: event.target.value })} />
                </Field>
              </div>
              <div className={mode === 'venta' ? 'md:col-span-2' : 'md:col-span-3'}>
                <Field id={`line-${index}-price`} label={priceLabel} required>
                  <TextInput id={`line-${index}-price`} inputMode="decimal" value={line.unitPrice} onChange={(event) => update(index, { unitPrice: event.target.value })} />
                </Field>
              </div>
              {mode === 'venta' && (
                <div className="md:col-span-1">
                  <Field id={`line-${index}-discount`} label="Desc. %">
                    <TextInput id={`line-${index}-discount`} inputMode="decimal" value={line.discountPct} onChange={(event) => update(index, { discountPct: event.target.value })} />
                  </Field>
                </div>
              )}
              <div className={`flex items-end justify-between gap-2 ${mode === 'venta' ? 'md:col-span-1' : 'md:col-span-3'}`}>
                <p className="pb-2 text-sm font-bold tabular text-mc-ink" aria-label={`Importe del renglón ${index + 1}`}>{Number.isFinite(amount) ? formatMoney(amount) : '—'}</p>
                {!disabled && lines.length > 1 && (
                  <button type="button" onClick={() => onChange(lines.filter((_, position) => position !== index))} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-mc-muted hover:bg-mc-danger-soft hover:text-mc-danger" aria-label={`Quitar renglón ${index + 1}`}><Trash2 size={16} aria-hidden="true" /></button>
                )}
              </div>
            </div>
          </fieldset>
        )
      })}
      {!disabled && <Button variant="outline" onClick={() => onChange([...lines, emptyLine()])} data-testid="add-line"><Plus size={16} aria-hidden="true" />Agregar renglón</Button>}
    </div>
  )
}

export function TotalsBox({ totals, showShipping = false }: { totals: Totals; showShipping?: boolean }) {
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1.5 text-sm" data-testid="document-totals">
      <div className="flex justify-between gap-4"><dt className="text-mc-muted">Subtotal</dt><dd className="tabular text-mc-ink">{formatMoney(totals.subtotal)}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-mc-muted">IVA 16 %</dt><dd className="tabular text-mc-ink">{formatMoney(totals.tax)}</dd></div>
      {showShipping && <div className="flex justify-between gap-4"><dt className="text-mc-muted">Envío</dt><dd className="tabular text-mc-ink">{formatMoney(totals.shipping)}</dd></div>}
      <div className="flex justify-between gap-4 border-t border-mc-line pt-2 text-base font-extrabold"><dt className="text-mc-ink">Total</dt><dd className="tabular text-mc-ink" data-testid="document-total">{formatMoney(totals.total)}</dd></div>
    </dl>
  )
}

/** Renglones de un documento ya guardado (solo lectura). */
export function LinesTable({ columns, rows, caption }: { caption: string; columns: { key: string; label: string; align?: 'right' }[]; rows: Record<string, ReactNode>[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-mc-line-soft bg-mc-surface-2 text-xs text-mc-muted">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-2.5 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-mc-line-soft">
          {rows.map((row, index) => (
            <tr key={index}>{columns.map((column) => <td key={column.key} className={`px-4 py-2.5 text-mc-gray-700 ${column.align === 'right' ? 'text-right tabular' : ''}`}>{row[column.key] ?? '—'}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mensaje de error o de éxito bajo las acciones de un documento. */
export function Notice({ tone, children }: { tone: 'error' | 'ok'; children: ReactNode }) {
  const className = tone === 'error' ? 'border-mc-danger/25 bg-mc-danger-soft text-mc-danger' : 'border-mc-success/30 bg-mc-success-soft text-mc-ink'
  return <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${className}`} role={tone === 'error' ? 'alert' : 'status'} data-testid={`notice-${tone}`}>{children}</p>
}

/**
 * Cajón para una acción que necesita un par de datos (motivo, quién recibió…).
 * `onSubmit` lanza un Error con el mensaje a mostrar si algo falla.
 */
export function ActionDrawer({ title, subtitle, submitLabel, onClose, onSubmit, children }: { title: string; subtitle?: string; submitLabel: string; onClose: () => void; onSubmit: () => Promise<void>; children: ReactNode }) {
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFailure(null)
    try {
      await onSubmit()
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
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
          <Button type="submit" form="action-form" disabled={saving} data-testid="save-record">{saving ? 'Guardando…' : submitLabel}</Button>
        </div>
      }
    >
      <form id="action-form" onSubmit={(event) => { void submit(event) }} noValidate className="grid gap-4">
        {children}
        {failure && <Notice tone="error">{failure}</Notice>}
      </form>
    </RecordDrawer>
  )
}

/** Campo de texto largo con etiqueta, para motivos y notas dentro de un ActionDrawer. */
export function ReasonField({ id, label, value, onChange, required = true, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean; hint?: string }) {
  return (
    <Field id={id} label={label} required={required} hint={hint}>
      <TextArea id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}
