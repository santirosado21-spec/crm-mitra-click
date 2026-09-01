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

export interface AutomationRule {
  id: string
  name: string
  trigger: string
  condition: string
  action: string
  enabled: boolean
  lastRunAt?: string
  runCount: number
}

export interface AiAgent {
  id: 'executive' | 'sales' | 'followup' | 'reports'
  name: string
  role: string
  description: string
  capabilities: string[]
  examplePrompts: string[]
  accent: string
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
  automations: AutomationRule[]
  agents: AiAgent[]
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
