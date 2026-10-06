import { useState } from 'react'
import { Copy } from 'lucide-react'
import { ResourcePage, type ResourceConfig } from '../components/ResourcePage'
import { StatusBadge } from '../components/Primitives'
import { CHANNEL_LABEL, trackedLinkUrl } from '../lib/acquisition'
import { formatNumber } from '../lib/format'

type Row = Record<string, unknown>

const count = (row: Row, key: string) => Number((row[key] as { count: number }[] | null)?.[0]?.count ?? 0)
const urlOf = (row: Row) => trackedLinkUrl(import.meta.env.VITE_SUPABASE_URL, String(row.code))

export function LinksPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (row: Row) => {
    try {
      await navigator.clipboard.writeText(urlOf(row))
      setCopied(String(row.id))
    } catch {
      setCopied(null)
    }
  }

  const config: ResourceConfig = {
    table: 'tracked_links',
    noun: 'link',
    title: 'Links NFC / QR',
    eyebrow: 'Marketing',
    description: 'Enlaces medibles para tarjetas NFC, códigos QR y publicaciones. Cada uno redirige a su destino y cuenta los escaneos, sin guardar datos personales. El link corto es el que se graba en la tarjeta.',
    select: 'id,code,label,destination_url,channel,campaign,active,created_at,events:link_events(count),leads(count)',
    searchColumns: ['label', 'campaign', 'destination_url'],
    searchPlaceholder: 'Buscar por nombre, campaña o destino…',
    orderBy: { column: 'created_at', ascending: false },
    hasActive: true,
    writeRoles: ['direccion', 'admin', 'marketing', 'ventas'],
    rowTitle: (row) => String(row.label),
    filters: [{ param: 'canal', column: 'channel', label: 'Canal', options: Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label })) }],
    rowActions: (row) => (
      <button type="button" onClick={() => { void copy(row) }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-mc-muted hover:bg-mc-yellow-wash hover:text-mc-ink" aria-label={`Copiar el link de ${String(row.label)}`}>
        <Copy size={14} aria-hidden="true" />{copied === String(row.id) ? 'Copiado' : 'Copiar'}
      </button>
    ),
    columns: [
      { key: 'label', label: 'Link', render: (row) => <span><span className="block font-semibold text-mc-ink">{String(row.label)}</span><code className="block break-all text-[11px] font-normal text-mc-muted">{urlOf(row)}</code></span> },
      { key: 'channel', label: 'Canal', render: (row) => CHANNEL_LABEL[String(row.channel)] ?? String(row.channel) },
      { key: 'campaign', label: 'Campaña' },
      { key: 'scans', label: 'Escaneos', align: 'right', render: (row) => formatNumber(count(row, 'events')) },
      { key: 'leads', label: 'Leads', align: 'right', render: (row) => formatNumber(count(row, 'leads')) },
      { key: 'active', label: 'Estado', render: (row) => <StatusBadge status={row.active ? 'Activo' : 'Inactivo'} /> },
    ],
    fields: [
      { name: 'label', label: 'Nombre', type: 'text', required: true, wide: true, placeholder: 'Tarjeta de Ángel, QR en paquetes…' },
      { name: 'destination_url', label: 'Destino', type: 'text', required: true, wide: true, placeholder: 'https://…', hint: 'A dónde llega quien escanea. Debe empezar con https://.' },
      { name: 'channel', label: 'Canal', type: 'select', required: true, options: Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label })) },
      { name: 'campaign', label: 'Campaña', type: 'text' },
      { name: 'active', label: 'Activo', type: 'checkbox' },
    ],
    defaults: { channel: 'nfc', active: true },
    warn: async ({ payload }) => (String(payload.destination_url ?? '').startsWith('https://') ? null : 'El destino no empieza con https://. La base lo va a rechazar.'),
  }

  return <ResourcePage config={config} />
}
