export const OPPORTUNITY_STAGES = [
  'Nuevo',
  'Contactado',
  'Calificado',
  'Cotización',
  'Negociación',
  'Ganado',
  'Perdido',
] as const

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number]
export type LeadStatus = OpportunityStage
export type QuoteStatus = 'Borrador' | 'Enviada' | 'Vista' | 'Aceptada' | 'Rechazada' | 'Vencida'
export type ActivityType =
  | 'lead'
  | 'llamada'
  | 'nota'
  | 'seguimiento'
  | 'cotización'
  | 'etapa'
  | 'oportunidad'

export interface Lead {
  id: string
  name: string
  companyId: string
  companyName: string
  email: string
  phone: string
  status: LeadStatus
  owner: string
  source: string
  interest: string
  nextAction: string
  nextActionAt: string
  createdAt: string
  campaignId: string
  tags: string[]
  score: number
  notes?: string
}

export interface Contact {
  id: string
  name: string
  role: string
  email: string
  phone: string
  isPrimary?: boolean
}

export interface Company {
  id: string
  name: string
  segment: 'B2B' | 'B2C'
  industry: string
  city: string
  owner: string
  website: string
  status: 'Prospecto' | 'Cliente' | 'Inactivo'
  annualPotential: number
  contacts: Contact[]
  lastActivityAt: string
}

export interface Opportunity {
  id: string
  name: string
  leadId: string
  companyId: string
  companyName: string
  owner: string
  stage: OpportunityStage
  value: number
  probability: number
  expectedCloseAt: string
  productIds: string[]
  campaignId: string
  updatedAt: string
  lostReason?: string
}

export interface Quote {
  id: string
  folio: string
  customerName: string
  companyId: string
  companyName: string
  value: number
  owner: string
  status: QuoteStatus
  opportunityId: string
  opportunityName: string
  createdAt: string
  expiresAt: string
  itemCount: number
}

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  brand: string
  price: number
  salesValue: number
  unitsSold: number
  leadCount: number
  opportunityCount: number
  demandIndex: number
  trend: number
}

export interface Campaign {
  id: string
  name: string
  channel: string
  spend: number
  impressions: number
  clicks: number
}

export interface Sale {
  id: string
  opportunityId: string
  companyId: string
  value: number
  closedAt: string
  campaignId: string
  productIds: string[]
}

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string
  actor: string
  occurredAt: string
  leadId?: string
  companyId?: string
  opportunityId?: string
  quoteId?: string
  status?: 'Pendiente' | 'Completado'
}

// ── Inteligencia comercial: vendedores, productos y ventas ──────────────────
// Fechas de negocio en formato 'YYYY-MM-DD' (día calendario de México).

/** Mitra = mayorista B2B con vendedores; Mitra Click = e-commerce B2C. */
export type BusinessUnit = 'mitra' | 'mitraclick'

export const BUSINESS_UNIT_LABEL: Record<BusinessUnit, string> = {
  mitra: 'Mitra mayorista',
  mitraclick: 'Mitra Click',
}

/** Semáforo de vendedores: cumple su cuota, va en riesgo o no ha vendido en el periodo. */
export type PerformanceStatus = 'cumple' | 'riesgo' | 'sin-ventas'

export type PeriodKey = 'hoy' | 'semana' | 'mes' | '30d' | '90d'

export interface SalesRep {
  id: string
  name: string
  zone: string
  /** Cuota mensual en MXN. */
  monthlyQuota: number
  active: boolean
}

export interface CommercialProduct {
  id: string
  sku: string
  name: string
  brand: string
  category: string
  businessUnit: BusinessUnit
  unitPrice: number
  /** Unidad de venta: pieza, tramo, rollo, caja… */
  unit: string
  stock: number
  reorderPoint: number
}

export interface OrderLine {
  productId: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface WholesaleClient {
  id: string
  name: string
  /** Tipo de cliente del ERP (p. ej. Constructora, Industria, Taller, Revendedor). */
  type: string
  repId: string
}

export interface WholesaleOrder {
  id: string
  date: string
  clientId: string
  repId: string
  amount: number
  status: 'pendiente' | 'surtido'
  lines: OrderLine[]
}

/** Canal de origen normalizado (Google, Redes sociales, Directo, Email, Referido…); Shopify puede traer otros. */
export type RetailChannel = string

export interface RetailOrder {
  id: string
  date: string
  channel: RetailChannel
  amount: number
  status: 'pendiente' | 'enviado' | 'entregado'
  lines: OrderLine[]
}

export interface WholesaleQuote {
  id: string
  date: string
  clientId: string
  repId: string
  amount: number
  status: 'enviada' | 'negociacion' | 'ganada' | 'perdida'
  closedDate?: string
}

export interface TrafficDay {
  date: string
  visits: number
  productViews: number
  carts: number
  checkouts: number
  orders: number
}

export interface MonthlyGoal {
  /** 'YYYY-MM' */
  month: string
  businessUnit: BusinessUnit
  amount: number
}

export interface CommercialData {
  source: 'demo' | 'erp'
  /** Último día con datos ('YYYY-MM-DD'). Todos los periodos se calculan contra esta fecha. */
  asOf: string
  generatedAt: string
  reps: SalesRep[]
  products: CommercialProduct[]
  clients: WholesaleClient[]
  wholesaleOrders: WholesaleOrder[]
  retailOrders: RetailOrder[]
  quotes: WholesaleQuote[]
  traffic: TrafficDay[]
  goals: MonthlyGoal[]
}

export interface MitraData {
  leads: Lead[]
  companies: Company[]
  opportunities: Opportunity[]
  quotes: Quote[]
  products: Product[]
  campaigns: Campaign[]
  sales: Sale[]
  activities: Activity[]
  commercial: CommercialData
}

export interface LeadFilters {
  query: string
  status: LeadStatus | 'Todos'
  owner: string
  source: string
}

export interface ExecutiveMetrics {
  totalLeads: number
  activeCustomers: number
  openOpportunities: number
  openQuotes: number
  pipelineValue: number
  salesValue: number
  averageTicket: number
  conversionRate: number
}

export interface AttributionJourney {
  campaignId: string
  channel: string
  campaignName: string
  leadCount: number
  opportunityCount: number
  saleCount: number
  revenue: number
  spend: number
  roi: number
}
