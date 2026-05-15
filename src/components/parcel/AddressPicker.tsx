import { MapPin } from 'lucide-react'
import { useParcelAddresses } from '../../hooks/useParcelAddresses'
import type { AddressTipo, ParcelAddress } from '../../types/techship'

interface Props {
  tipo:       AddressTipo
  value:      string | null
  onChange:   (id: string | null, address: ParcelAddress | null) => void
  label?:     string
}

// Selector de dirección de la libreta. Filtra por tipo (sender/recipient).
export function AddressPicker({ tipo, value, onChange, label }: Props) {
  const { addresses, loading } = useParcelAddresses(tipo)

  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block inline-flex items-center gap-1">
        <MapPin size={11} /> {label ?? (tipo === 'sender' ? 'Remitente' : 'Destinatario')}
      </label>
      <select
        value={value ?? ''}
        disabled={loading}
        onChange={e => {
          const id = e.target.value || null
          onChange(id, addresses.find(a => a.id === id) ?? null)
        }}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none disabled:opacity-50"
      >
        <option value="">— Selecciona de la libreta —</option>
        {addresses.map(a => (
          <option key={a.id} value={a.id}>
            {a.alias} · {a.ciudad}, {a.estado} {a.codigo_postal}
          </option>
        ))}
      </select>
    </div>
  )
}
