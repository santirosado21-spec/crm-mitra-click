import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'
import { supabase } from '../../lib/supabase'
import { REGIMENES_FISCAL } from '../../lib/satCatalogs'

interface EmisorConfig {
  rfc:                 string
  razon_social:        string
  regimen_fiscal_sat:  string
  cp_expedicion:       string
  serie_default:       string
  folio_proximo:       number
  certificado_numero:  string | null
}

export function EmisorConfigPage() {
  const navigate = useNavigate()
  const [cfg, setCfg] = useState<EmisorConfig>({
    rfc: '',
    razon_social: '',
    regimen_fiscal_sat: '601',
    cp_expedicion: '',
    serie_default: 'A',
    folio_proximo: 1,
    certificado_numero: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('emisor_config').select('*').eq('id', 1).single().then(({ data, error }) => {
      if (data && !error) setCfg(data as EmisorConfig)
      setLoading(false)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      // Basic validation
      if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(cfg.rfc.toUpperCase())) {
        throw new Error('RFC inválido')
      }
      if (!/^\d{5}$/.test(cfg.cp_expedicion)) {
        throw new Error('Código postal debe ser de 5 dígitos')
      }

      const { error: err } = await supabase.from('emisor_config').upsert({
        id: 1,
        ...cfg,
        rfc: cfg.rfc.toUpperCase(),
        updated_at: new Date().toISOString(),
      })
      if (err) throw err
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <p className="text-sm text-gray-400">Cargando configuración...</p>
        </main>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <button
            onClick={() => navigate('/wms')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1e3a5f] mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Volver a WMS
          </button>

          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#1e3a5f]">Datos fiscales del Emisor</h1>
            <p className="text-xs text-gray-500 mt-1">
              Información de Supply Chain MX que va en el XML CFDI como emisor. Esto solo se configura una vez.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          {saved && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} /> Guardado correctamente
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="RFC"
                required
                value={cfg.rfc}
                onChange={v => setCfg(c => ({ ...c, rfc: v.toUpperCase() }))}
                placeholder="XAXX010101000"
                maxLength={13}
                mono
              />
              <Field
                label="Código Postal de Expedición"
                required
                value={cfg.cp_expedicion}
                onChange={v => setCfg(c => ({ ...c, cp_expedicion: v.replace(/\D/g, '').slice(0, 5) }))}
                placeholder="52004"
                maxLength={5}
                mono
              />
              <div className="md:col-span-2">
                <Field
                  label="Razón Social"
                  required
                  value={cfg.razon_social}
                  onChange={v => setCfg(c => ({ ...c, razon_social: v }))}
                  placeholder="SUPPLY CHAIN MEXICO SA DE CV"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Régimen Fiscal SAT <span className="text-red-500">*</span>
                </label>
                <select
                  value={cfg.regimen_fiscal_sat}
                  onChange={e => setCfg(c => ({ ...c, regimen_fiscal_sat: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                >
                  {Object.entries(REGIMENES_FISCAL).map(([code, label]) => (
                    <option key={code} value={code}>{code} — {label}</option>
                  ))}
                </select>
              </div>
              <Field
                label="Serie (default)"
                value={cfg.serie_default}
                onChange={v => setCfg(c => ({ ...c, serie_default: v.toUpperCase() }))}
                placeholder="A"
                maxLength={10}
                mono
              />
              <Field
                label="Próximo Folio"
                type="number"
                value={String(cfg.folio_proximo)}
                onChange={v => setCfg(c => ({ ...c, folio_proximo: Number(v) || 1 }))}
                mono
              />
              <div className="md:col-span-2">
                <Field
                  label="Número de Certificado (opcional)"
                  value={cfg.certificado_numero ?? ''}
                  onChange={v => setCfg(c => ({ ...c, certificado_numero: v || null }))}
                  placeholder="30001000000500003416"
                  mono
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">
                El CFDI generado queda como borrador. ContPAQ se encarga de timbrarlo.
              </p>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium hover:bg-[#16304d] disabled:opacity-60"
              >
                <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, required, maxLength, type, mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  maxLength?: number
  type?: string
  mono?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}
