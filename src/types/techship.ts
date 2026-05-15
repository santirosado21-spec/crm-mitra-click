// Tipos del TMS de paquetería — Techship replica.
// Cubre markup profiles, addresses, manifests, templates y print queue.

// ── Markup Profiles ─────────────────────────────────────────────────────────
export interface MarkupProfile {
  id:          string
  nombre:      string
  descripcion: string
  activo:      boolean
  prioridad:   number
  created_at:  string
  updated_at:  string
}

export interface MarkupProfileRule {
  id:          string
  profile_id:  string
  cliente_id:  string | null
  carrier:     string | null
  service:     string | null
  markup_pct:  number
  min_markup:  number | null
  max_markup:  number | null
  prioridad:   number
  created_at:  string
}

export type CreateMarkupProfileData = Omit<MarkupProfile, 'id' | 'created_at' | 'updated_at'>
export type CreateMarkupRuleData    = Omit<MarkupProfileRule, 'id' | 'created_at'>

// ── Addresses ───────────────────────────────────────────────────────────────
export type AddressTipo = 'sender' | 'recipient' | 'ambos'

export interface ParcelAddress {
  id:            string
  alias:         string
  tipo:          AddressTipo
  nombre:        string
  empresa:       string
  calle1:        string
  calle2:        string
  ciudad:        string
  estado:        string
  codigo_postal: string
  pais:          string
  telefono:      string
  email:         string
  referencia:    string
  cliente_id:    string | null
  es_default:    boolean
  created_at:    string
  updated_at:    string
}

export type CreateParcelAddressData = Omit<ParcelAddress, 'id' | 'created_at' | 'updated_at'>

// ── Manifests ───────────────────────────────────────────────────────────────
export type ManifestStatus = 'abierto' | 'finalizado' | 'cancelado'

export interface Manifest {
  id:                   string
  folio:                string
  carrier:              string
  provider:             string
  status:               ManifestStatus
  fecha:                string
  total_guias:          number
  pdf_url:              string | null
  provider_manifest_id: string | null
  notas:                string
  creado_por:           string | null
  finalized_at:         string | null
  created_at:           string
  updated_at:           string
}

export interface ManifestGuia {
  id:          string
  manifest_id: string
  guia_id:     string
  created_at:  string
}

export type CreateManifestData = Omit<
  Manifest,
  'id' | 'created_at' | 'updated_at' | 'finalized_at' | 'pdf_url' | 'provider_manifest_id'
>

// ── Order Templates ─────────────────────────────────────────────────────────
export interface OrderTemplatePayload {
  carrier?:        string
  service?:        string
  from_postal?:    string
  to_postal?:      string
  weight_kg?:      number
  length_cm?:      number
  width_cm?:       number
  height_cm?:      number
  cliente_id?:     string
  notas?:          string
}

export interface OrderTemplate {
  id:           string
  nombre:       string
  descripcion:  string
  cliente_id:   string | null
  payload:      OrderTemplatePayload
  use_count:    number
  last_used_at: string | null
  creado_por:   string | null
  created_at:   string
  updated_at:   string
}

export type CreateOrderTemplateData = Omit<
  OrderTemplate, 'id' | 'use_count' | 'last_used_at' | 'created_at' | 'updated_at'
>

// ── Print Queue ─────────────────────────────────────────────────────────────
export type PrintQueueStatus = 'pendiente' | 'impreso' | 'error'

export interface PrintQueueItem {
  id:              string
  guia_id:         string | null
  user_email:      string
  label_url:       string | null
  tracking_number: string | null
  carrier:         string | null
  status:          PrintQueueStatus
  printed_at:      string | null
  created_at:      string
}

export type CreatePrintQueueData = Omit<PrintQueueItem, 'id' | 'printed_at' | 'created_at'>
