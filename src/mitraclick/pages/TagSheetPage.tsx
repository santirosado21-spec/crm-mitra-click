import { ArrowLeft, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Controls'
import { EmptyState } from '../components/Primitives'
import { selectRows } from '../lib/crud'
import { useQuery } from '../lib/useQuery'

interface TagRow {
  id: string
  code: string
  label: string | null
  product: { sku: string; name: string } | null
  location: { code: string } | null
}

/**
 * Hoja imprimible de etiquetas. Cada una lleva el link que se graba en la etiqueta NFC.
 * El código QR se dibuja con la dependencia `qrcode`, que todavía no está instalada:
 * por ahora la hoja muestra el link en texto.
 */
export function TagSheetPage() {
  const query = useQuery('tag-sheet', () => selectRows<TagRow>('tags', 'id,code,label,product:products(sku,name),location:locations(code)', { filters: { active: true }, orderBy: { column: 'created_at' }, limit: 500 }))
  const origin = window.location.origin
  const tags = query.data ?? []

  return (
    <div className="min-h-dvh bg-white p-4 text-mc-ink">
      <header className="no-print mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Hoja de etiquetas</h1>
          <p className="mt-1 max-w-2xl text-sm text-mc-muted">Cada etiqueta lleva el link que se graba en el chip NFC. <strong className="text-mc-ink">El código QR está pendiente:</strong> falta instalar la librería que lo dibuja; por ahora se imprime el link en texto.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/ubicaciones?vista=etiquetas" className="inline-flex items-center gap-2 rounded-xl border border-mc-line bg-white px-4 py-2 text-sm font-semibold hover:border-mc-charcoal"><ArrowLeft size={16} aria-hidden="true" />Volver</Link>
          <Button onClick={() => window.print()} disabled={!tags.length}><Printer size={16} aria-hidden="true" />Imprimir</Button>
        </div>
      </header>

      {query.error ? (
        <p className="text-center text-sm font-semibold text-mc-danger" role="alert">{query.error}</p>
      ) : query.loading ? (
        <p className="text-center text-sm text-mc-muted" role="status">Cargando…</p>
      ) : tags.length === 0 ? (
        <EmptyState title="No hay etiquetas activas" description="Crea etiquetas en Ubicaciones y etiquetas para imprimirlas aquí." />
      ) : (
        <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-3" data-testid="tag-sheet">
          {tags.map((tag) => (
            <li key={tag.id} className="break-inside-avoid rounded-xl border border-mc-gray-400 p-3">
              <p className="text-sm font-extrabold leading-tight">{tag.product ? tag.product.name : `Ubicación ${tag.location?.code ?? ''}`}</p>
              <p className="mt-0.5 text-xs text-mc-gray-700">{[tag.product?.sku, tag.product ? tag.location?.code : null, tag.label].filter(Boolean).join(' · ') || '—'}</p>
              <p className="mt-2 break-all font-mono text-[11px]">{origin}/b/{tag.code}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
