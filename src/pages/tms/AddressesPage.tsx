import { useMemo, useState } from 'react'
import { MapPin, Plus, Search, Pencil, Trash2, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { AddressForm } from '../../components/parcel/AddressForm'
import { useParcelAddresses } from '../../hooks/useParcelAddresses'
import { useToast } from '../../hooks/useToast'
import type { ParcelAddress, AddressTipo, CreateParcelAddressData } from '../../types/techship'

const TIPO_LABEL: Record<AddressTipo, string> = {
  sender: 'Remitente', recipient: 'Destinatario', ambos: 'Ambos',
}

export function AddressesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { addresses, loading, create, update, remove } = useParcelAddresses()

  const [search, setSearch]   = useState('')
  const [tipoF, setTipoF]     = useState<AddressTipo | ''>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ParcelAddress | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return addresses.filter(a => {
      if (tipoF && a.tipo !== tipoF) return false
      if (!q) return true
      return `${a.alias} ${a.nombre} ${a.empresa} ${a.ciudad} ${a.estado} ${a.codigo_postal}`
        .toLowerCase().includes(q)
    })
  }, [addresses, search, tipoF])

  const handleSave = async (data: CreateParcelAddressData) => {
    try {
      if (editing) { await update(editing.id, data); toast.success('Dirección actualizada') }
      else { await create(data); toast.success('Dirección creada') }
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : '')
      throw e
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta dirección?')) return
    try { await remove(id); toast.success('Dirección eliminada') }
    catch (e) { toast.error('Error', e instanceof Error ? e.message : '') }
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 touch-pan-y">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
                <MapPin size={20} /> {t('addresses.title')}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{t('addresses.subtitle')}</p>
            </div>
            <button onClick={() => { setEditing(null); setFormOpen(true) }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--brand-navy)' }}>
              <Plus size={13} /> Nueva dirección
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search')}
                className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none w-56" />
            </div>
            <select value={tipoF} onChange={e => setTipoF(e.target.value as AddressTipo | '')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none">
              <option value="">{t('common.all')}</option>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} direcciones</span>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Spinner size={28} /></div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">{t('common.noData')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1e3a5f] inline-flex items-center gap-1.5">
                        {a.es_default && <Star size={12} className="text-amber-500 fill-amber-500" />}
                        {a.alias}
                      </p>
                      <span className="text-[10px] uppercase font-bold text-gray-400">{TIPO_LABEL[a.tipo]}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditing(a); setFormOpen(true) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#1e3a5f]">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(a.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                    <p className="font-semibold text-gray-700">{a.nombre}{a.empresa && ` · ${a.empresa}`}</p>
                    <p>{a.calle1}{a.calle2 && `, ${a.calle2}`}</p>
                    <p>{a.ciudad}, {a.estado} {a.codigo_postal} · {a.pais}</p>
                    {a.telefono && <p className="text-gray-400">{a.telefono}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <AddressForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
