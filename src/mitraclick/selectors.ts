import {
  OPPORTUNITY_STAGES,
  type AttributionJourney,
  type Campaign,
  type ExecutiveMetrics,
  type Lead,
  type LeadFilters,
  type Opportunity,
  type OpportunityStage,
  type Sale,
} from './domain'

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')

export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  const query = normalize(filters.query.trim())

  return leads.filter((lead) => {
    const searchable = normalize(
      [lead.name, lead.companyName, lead.email, lead.phone, lead.interest, ...lead.tags].join(' '),
    )

    return (
      (!query || searchable.includes(query)) &&
      (filters.status === 'Todos' || lead.status === filters.status) &&
      (filters.owner === 'Todos' || lead.owner === filters.owner) &&
      (filters.source === 'Todos' || lead.source === filters.source)
    )
  })
}

export function getExecutiveMetrics({
  leads,
  opportunities,
  sales,
  activeCustomers = 0,
  openQuotes = 0,
}: {
  leads: Lead[]
  opportunities: Opportunity[]
  sales: Sale[]
  activeCustomers?: number
  openQuotes?: number
}): ExecutiveMetrics {
  const activeOpportunities = opportunities.filter(
    (opportunity) => !['Ganado', 'Perdido'].includes(opportunity.stage),
  )
  const salesValue = sales.reduce((sum, sale) => sum + sale.value, 0)
  const leadIds = new Set(leads.map((lead) => lead.id))
  const opportunityLeadIds = new Map(
    opportunities
      .filter((opportunity) => leadIds.has(opportunity.leadId))
      .map((opportunity) => [opportunity.id, opportunity.leadId]),
  )
  const convertedLeadIds = new Set(
    sales
      .map((sale) => opportunityLeadIds.get(sale.opportunityId))
      .filter((leadId): leadId is string => Boolean(leadId)),
  )

  return {
    totalLeads: leads.length,
    activeCustomers,
    openOpportunities: activeOpportunities.length,
    openQuotes,
    pipelineValue: activeOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0),
    salesValue,
    averageTicket: sales.length ? Math.round(salesValue / sales.length) : 0,
    conversionRate: leads.length
      ? Math.round((convertedLeadIds.size / leads.length) * 1000) / 10
      : 0,
  }
}

export function groupOpportunitiesByStage(
  opportunities: Opportunity[],
): Record<OpportunityStage, Opportunity[]> {
  return OPPORTUNITY_STAGES.reduce(
    (grouped, stage) => {
      grouped[stage] = opportunities.filter((opportunity) => opportunity.stage === stage)
      return grouped
    },
    {} as Record<OpportunityStage, Opportunity[]>,
  )
}

export function moveOpportunity(
  opportunities: Opportunity[],
  opportunityId: string,
  stage: OpportunityStage,
): Opportunity[] {
  return opportunities.map((opportunity) =>
    opportunity.id === opportunityId ? { ...opportunity, stage } : opportunity,
  )
}

const OPEN_OPPORTUNITY_STAGES = OPPORTUNITY_STAGES.slice(0, -2) as readonly OpportunityStage[]

export function getOpportunityStageNavigation(stage: OpportunityStage): {
  previous: OpportunityStage | undefined
  next: OpportunityStage | undefined
} {
  if (stage === 'Ganado' || stage === 'Perdido') {
    return { previous: 'Negociación', next: undefined }
  }

  const index = OPEN_OPPORTUNITY_STAGES.indexOf(stage)

  return {
    previous: index > 0 ? OPEN_OPPORTUNITY_STAGES[index - 1] : undefined,
    next: index < OPEN_OPPORTUNITY_STAGES.length - 1
      ? OPEN_OPPORTUNITY_STAGES[index + 1]
      : undefined,
  }
}

function getCampaignRelations(
  campaign: Campaign,
  leads: Lead[],
  opportunities: Opportunity[],
  sales: Sale[],
) {
  const campaignLeads = leads.filter((lead) => lead.campaignId === campaign.id)
  const leadIds = new Set(campaignLeads.map((lead) => lead.id))
  const campaignOpportunities = opportunities.filter(
    (opportunity) =>
      opportunity.campaignId === campaign.id && leadIds.has(opportunity.leadId),
  )
  const opportunityIds = new Set(campaignOpportunities.map((opportunity) => opportunity.id))
  const campaignSales = sales.filter(
    (sale) => sale.campaignId === campaign.id && opportunityIds.has(sale.opportunityId),
  )

  return { campaignLeads, campaignOpportunities, campaignSales }
}

export function selectAttributionChain(
  campaign: Campaign,
  leads: Lead[],
  opportunities: Opportunity[],
  sales: Sale[],
): {
  campaign: Campaign
  lead: Lead | undefined
  opportunity: Opportunity | undefined
  sale: Sale | undefined
} {
  const { campaignLeads, campaignOpportunities, campaignSales } = getCampaignRelations(
    campaign,
    leads,
    opportunities,
    sales,
  )
  const opportunityById = new Map(
    campaignOpportunities.map((opportunity) => [opportunity.id, opportunity]),
  )
  const leadById = new Map(campaignLeads.map((lead) => [lead.id, lead]))
  const sale = campaignSales[0]
  const opportunity = sale
    ? opportunityById.get(sale.opportunityId)
    : campaignOpportunities[0]
  const lead = opportunity ? leadById.get(opportunity.leadId) : campaignLeads[0]

  return { campaign, lead, opportunity, sale }
}

export function buildAttributionJourneys(
  campaigns: Campaign[],
  leads: Lead[],
  opportunities: Opportunity[],
  sales: Sale[],
): AttributionJourney[] {
  return campaigns.map((campaign) => {
    const { campaignLeads, campaignOpportunities, campaignSales } = getCampaignRelations(
      campaign,
      leads,
      opportunities,
      sales,
    )
    const revenue = campaignSales.reduce((sum, sale) => sum + sale.value, 0)

    return {
      campaignId: campaign.id,
      channel: campaign.channel,
      campaignName: campaign.name,
      leadCount: campaignLeads.length,
      opportunityCount: campaignOpportunities.length,
      saleCount: campaignSales.length,
      revenue,
      spend: campaign.spend,
      roi: campaign.spend ? Math.round(((revenue - campaign.spend) / campaign.spend) * 10) / 10 : 0,
    }
  })
}
