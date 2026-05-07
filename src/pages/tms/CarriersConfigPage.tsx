import { useState } from 'react'
import {
  Settings, Plug, CheckCircle2, AlertCircle, Loader2, X, Trash2, Eye, EyeOff,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import {
  useCarrierCredentials,
  type CarrierProviderName,
  type CarrierCredential,
  type UpsertCarrierCredentialInput,
} from '../../hooks/useCarrierCredentials'

interface ProviderMeta {
  name:        CarrierProviderName
  label:       string
  description: string
  brandColor:  string
  needsSecret: boolean
}

const PROVIDERS: ProviderMeta[] = [
  { name: 'easypost',         label: 'EasyPost',          description: 'Agregador internacional · DHL, UPS, FedEx, USPS, Canada Post.', brandColor: '#5b32d6', needsSecret: false },
  { name: 'skydropx',         label: 'Skydropx',          description: 'Agregador México · Estafeta, Castores, FedEx MX, Redpack, DHL MX.', brandColor: '#0066ff', needsSecret: false },
  { name: 'direct_dhl',       label: 'DHL directo',       description: 'API XML/REST oficial. Convenio comercial DHL Express requerido.', brandColor: '#ffcc00', needsSecret: true },
  { name: 'direct_ups',       label: 'UPS directo',       description: 'API REST oficial. Cuenta UPS y Access License necesarios.', brandColor: '#7c3aed', needsSecret: false },
  { name: 'direct_fedex',     label: 'FedEx directo',     description: 'API REST OAuth2. Account Number + API Key + Secret.', brandColor: '#4d148c', needsSecret: true },
  { name: 'direct_estafeta',  label: 'Estafeta directo',  description: 'API SOAP. Convenio comercial Estafeta + cliente WSDL.', brandColor: '#dc3545', needsSecret: true },
]

export function CarriersConfigPage() {
  const toast = useToast()
  const { credentials, loading, error, upsert, remove, toggleActive } = useCarrierCredentials()
  const [editing, setEditing] = useState<ProviderMeta | null>(null)

  const credByProvider = new Map<string, CarrierCredential>(
    credentials.map(c => [c.provider, c]),
  )

  const handleToggle = async (cred: CarrierCredential) => {
    try {
      await toggleActive(cred.id, !cred.active)
      toast.success(`${cred.active ? 'Desactivado' : 'Activado'}`, cred.provider)
    } catch (e) {
      toast.error('No se pudo cambiar', e instanceof Error ? e.message : 'Error')
    }
  }

  const handleDelete = async (cred: CarrierCredential) => {
    if (!confirm(`¿Eliminar credenciales de ${cred.provider}? Esta acción no se puede deshacer.`)) return
    try {
      await remove(cred.id)
      toast.success('Credenciales eliminadas')
    } catch (e) {
      toast.error('No se pudo eliminar', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-10 touch-pan-y">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
              <Settings size={20} /> Configurar carriers
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Solo administradores · API keys de agregadores e integraciones directas con paqueterías.
            </p>
          </div>

          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 inline-flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <b>Modo demo activo</b> mientras no haya providers configurados.
              Una vez registres credenciales y las marques como <i>activas</i>, el rate shopping pasa a usar el provider real.
              Las APIs de los providers se conectarán en el siguiente sprint (sin costo extra de desarrollo del jefe — el plumbing ya está listo).
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Spinner size={20} /> Cargando credenciales…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROVIDERS.map(p => {
                const cred = credByProvider.get(p.name)
                const status = !cred
                  ? { text: 'Sin credenciales', color: '#94a3b8', icon: <Plug size={12} /> }
                  : !cred.active
                    ? { text: 'Inactivo',         color: '#94a3b8', icon: <EyeOff size={12} /> }
                    : cred.last_check_ok === false
                      ? { text: 'Error último check', color: '#dc3545', icon: <AlertCircle size={12} /> }
                      : { text: 'Activo',           color: '#28a745', icon: <CheckCircle2 size={12} /> }
                return (
                  <div key={p.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ background: p.brandColor }}
                      >
                        <Plug size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900">{p.label}</p>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-white"
                            style={{ background: status.color }}
                          >
                            {status.icon} {status.text}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{p.description}</p>
                        {cred?.last_check_at && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Último check: {new Date(cred.last_check_at).toLocaleString('es-MX')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        {cred?.test_mode && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold uppercase tracking-wide text-[9px]">
                            test
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cred && (
                          <button
                            type="button"
                            onClick={() => handleToggle(cred)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                              cred.active
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {cred.active ? <EyeOff size={11} className="inline mb-0.5" /> : <Eye size={11} className="inline mb-0.5" />}
                            {' '}{cred.active ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {cred && (
                          <button
                            type="button"
                            onClick={() => handleDelete(cred)}
                            className="p-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Eliminar credenciales"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          className="px-3 py-1 rounded bg-[#1e3a5f] text-white text-[11px] font-bold hover:bg-[#16304d]"
                        >
                          {cred ? 'Editar' : 'Conectar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-4">
            Las credenciales se guardan en la tabla <code className="bg-gray-100 px-1 py-0.5 rounded">carrier_credentials</code>.
            En producción se recomienda usar el vault de Supabase para cifrar `api_secret`.
            Solo usuarios con rol admin pueden ver / editar esta página.
          </p>
        </main>
      </div>

      {editing && (
        <CredentialModal
          provider={editing}
          existing={credByProvider.get(editing.name) ?? null}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            try {
              await upsert(input)
              toast.success('Credenciales guardadas', editing.label)
              setEditing(null)
            } catch (e) {
              toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Error')
            }
          }}
        />
      )}
    </div>
  )
}

function CredentialModal({
  provider, existing, onClose, onSave,
}: {
  provider: ProviderMeta
  existing: CarrierCredential | null
  onClose:  () => void
  onSave:   (input: UpsertCarrierCredentialInput) => Promise<void>
}) {
  const [apiKey, setApiKey]    = useState(existing?.api_key ?? '')
  const [apiSecret, setApiSecret] = useState(existing?.api_secret ?? '')
  const [accountId, setAccountId] = useState(existing?.account_id ?? '')
  const [baseUrl, setBaseUrl]  = useState(existing?.base_url ?? '')
  const [testMode, setTestMode] = useState(existing?.test_mode ?? true)
  const [active, setActive]    = useState(existing?.active ?? true)
  const [notas, setNotas]      = useState(existing?.notas ?? '')
  const [saving, setSaving]    = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      await onSave({
        provider:   provider.name,
        api_key:    apiKey.trim(),
        api_secret: apiSecret.trim() || null,
        account_id: accountId.trim() || null,
        base_url:   baseUrl.trim() || null,
        test_mode:  testMode,
        active,
        notas,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1e3a5f] inline-flex items-center gap-2">
            <Plug size={18} /> {existing ? 'Editar' : 'Conectar'} {provider.label}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">{provider.description}</p>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">API Key *</label>
            <input
              type="text" value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={`API key de ${provider.label}`}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono"
            />
          </div>

          {provider.needsSecret && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">API Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={e => setApiSecret(e.target.value)}
                  placeholder="API secret"
                  className="w-full px-3 py-2 pr-9 text-sm border border-gray-200 rounded-lg outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Account ID</label>
              <input
                type="text" value={accountId}
                onChange={e => setAccountId(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Base URL</label>
              <input
                type="text" value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="Opcional · default del provider"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={testMode} onChange={e => setTestMode(e.target.checked)} />
              Modo de prueba
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              Activo (usar para cotizaciones)
            </label>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Notas</label>
            <textarea
              value={notas} onChange={e => setNotas(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
              placeholder="Para uso interno (opcional)"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="px-5 py-2 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : null} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
