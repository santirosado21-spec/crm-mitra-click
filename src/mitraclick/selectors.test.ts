import { describe, expect, it } from 'vitest'
import type { Lead, Opportunity, Sale } from './domain'
import {
  buildAttributionJourneys,
  filterLeads,
  getExecutiveMetrics,
  getOpportunityStageNavigation,
  groupOpportunitiesByStage,
  moveOpportunity,
  selectAttributionChain,
} from './selectors'

const leads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Ana Torres',
    companyId: 'company-1',
    companyName: 'Casa Norte',
    email: 'ana@ejemplo.test',
    phone: '55 0000 0001',
    status: 'Calificado',
    owner: 'Mariana',
    source: 'Sitio web',
    interest: 'Producto Alfa',
    nextAction: 'Enviar propuesta',
    nextActionAt: '2026-08-28T16:00:00.000Z',
    createdAt: '2026-08-20T15:00:00.000Z',
    campaignId: 'campaign-1',
    tags: ['B2B'],
    score: 88,
  },
  {
    id: 'lead-2',
    name: 'Luis Vega',
    companyId: 'company-2',
    companyName: 'Punto Centro',
    email: 'luis@ejemplo.test',
    phone: '55 0000 0002',
    status: 'Nuevo',
    owner: 'Diego',
    source: 'Evento',
    interest: 'Producto Beta',
    nextAction: 'Llamar',
    nextActionAt: '2026-08-29T16:00:00.000Z',
    createdAt: '2026-08-22T15:00:00.000Z',
    campaignId: 'campaign-2',
    tags: ['B2C'],
    score: 51,
  },
]

const opportunities: Opportunity[] = [
  {
    id: 'opp-1',
    name: 'Expansión Casa Norte',
    leadId: 'lead-1',
    companyId: 'company-1',
    companyName: 'Casa Norte',
    owner: 'Mariana',
    stage: 'Negociación',
    value: 180000,
    probability: 70,
    expectedCloseAt: '2026-09-10T18:00:00.000Z',
    productIds: ['product-1'],
    campaignId: 'campaign-1',
    updatedAt: '2026-08-27T12:00:00.000Z',
  },
  {
    id: 'opp-2',
    name: 'Primera compra Punto Centro',
    leadId: 'lead-2',
    companyId: 'company-2',
    companyName: 'Punto Centro',
    owner: 'Diego',
    stage: 'Nuevo',
    value: 50000,
    probability: 15,
    expectedCloseAt: '2026-09-20T18:00:00.000Z',
    productIds: ['product-2'],
    campaignId: 'campaign-2',
    updatedAt: '2026-08-26T12:00:00.000Z',
  },
]

const sales: Sale[] = [
  {
    id: 'sale-1',
    opportunityId: 'opp-1',
    companyId: 'company-1',
    value: 175000,
    closedAt: '2026-08-25T18:00:00.000Z',
    campaignId: 'campaign-1',
    productIds: ['product-1'],
  },
]

describe('selectores de MitraClick', () => {
  it('filtra leads combinando búsqueda, estado y responsable', () => {
    expect(
      filterLeads(leads, {
        query: 'casa',
        status: 'Calificado',
        owner: 'Mariana',
        source: 'Todos',
      }).map((lead) => lead.id),
    ).toEqual(['lead-1'])
  })

  it('calcula métricas ejecutivas sin mezclar pipeline perdido', () => {
    const metrics = getExecutiveMetrics({ leads, opportunities, sales })

    expect(metrics.totalLeads).toBe(2)
    expect(metrics.pipelineValue).toBe(230000)
    expect(metrics.salesValue).toBe(175000)
    expect(metrics.averageTicket).toBe(175000)
    expect(metrics.conversionRate).toBe(50)
  })

  it('calcula conversión por leads únicos aunque una oportunidad tenga varias ventas', () => {
    const metrics = getExecutiveMetrics({
      leads,
      opportunities,
      sales: [
        sales[0],
        {
          ...sales[0],
          id: 'sale-2',
          value: 25000,
        },
      ],
    })

    expect(metrics.conversionRate).toBe(50)
  })

  it('ignora en conversión las ventas históricas sin oportunidad relacionada', () => {
    const metrics = getExecutiveMetrics({
      leads,
      opportunities,
      sales: [
        {
          ...sales[0],
          id: 'sale-historica',
          opportunityId: 'opp-ausente',
        },
      ],
    })

    expect(metrics.conversionRate).toBe(0)
  })

  it('reporta conversión cero cuando no hay leads', () => {
    const metrics = getExecutiveMetrics({ leads: [], opportunities, sales })

    expect(metrics.conversionRate).toBe(0)
  })

  it('crea todas las columnas del pipeline aunque estén vacías', () => {
    const grouped = groupOpportunitiesByStage(opportunities)

    expect(Object.keys(grouped)).toEqual([
      'Nuevo',
      'Contactado',
      'Calificado',
      'Cotización',
      'Negociación',
      'Ganado',
      'Perdido',
    ])
    expect(grouped.Negociación).toHaveLength(1)
    expect(grouped.Ganado).toEqual([])
  })

  it('mueve una oportunidad de etapa de forma inmutable', () => {
    const moved = moveOpportunity(opportunities, 'opp-2', 'Contactado')

    expect(moved[1].stage).toBe('Contactado')
    expect(opportunities[1].stage).toBe('Nuevo')
  })

  it('trata Ganado y Perdido como terminales alternativas en la navegación', () => {
    expect(getOpportunityStageNavigation('Ganado')).toEqual({
      previous: 'Negociación',
      next: undefined,
    })
    expect(getOpportunityStageNavigation('Perdido')).toEqual({
      previous: 'Negociación',
      next: undefined,
    })
    expect(getOpportunityStageNavigation('Negociación')).toEqual({
      previous: 'Cotización',
      next: undefined,
    })
  })

  it('selecciona una cadena de atribución completa siguiendo los IDs relacionados', () => {
    const campaign = {
      id: 'campaign-1',
      name: 'Colección Otoño',
      channel: 'Búsqueda',
      spend: 12000,
      impressions: 50000,
      clicks: 2100,
    }
    const secondLead = {
      ...leads[1],
      campaignId: campaign.id,
    }
    const secondOpportunity = {
      ...opportunities[1],
      campaignId: campaign.id,
    }
    const historicalSale = {
      ...sales[0],
      id: 'sale-historical',
      opportunityId: 'opp-no-disponible',
    }
    const linkedSale = {
      ...sales[0],
      id: 'sale-linked',
      opportunityId: secondOpportunity.id,
    }

    const chain = selectAttributionChain(
      campaign,
      [leads[0], secondLead],
      [secondOpportunity, opportunities[0]],
      [historicalSale, linkedSale],
    )

    expect(chain.lead?.id).toBe('lead-2')
    expect(chain.opportunity?.id).toBe('opp-2')
    expect(chain.sale?.id).toBe('sale-linked')
  })

  it('no presenta una venta histórica sin opportunityId resoluble como parte de la cadena', () => {
    const campaign = {
      id: 'campaign-1',
      name: 'Colección Otoño',
      channel: 'Búsqueda',
      spend: 12000,
      impressions: 50000,
      clicks: 2100,
    }
    const historicalSale = {
      ...sales[0],
      id: 'sale-historical',
      opportunityId: 'opp-no-disponible',
    }

    const chain = selectAttributionChain(campaign, leads, opportunities, [historicalSale])

    expect(chain.lead?.id).toBe('lead-1')
    expect(chain.opportunity?.id).toBe('opp-1')
    expect(chain.sale).toBeUndefined()
  })

  it('agrega atribución solo para oportunidades y ventas con una cadena de IDs íntegra', () => {
    const campaign = {
      id: 'campaign-1',
      name: 'Colección Otoño',
      channel: 'Búsqueda',
      spend: 12000,
      impressions: 50000,
      clicks: 2100,
    }
    const orphanOpportunity = {
      ...opportunities[0],
      id: 'opp-sin-lead',
      leadId: 'lead-no-disponible',
    }
    const historicalSale = {
      ...sales[0],
      id: 'sale-historical',
      opportunityId: 'opp-no-disponible',
    }

    const [journey] = buildAttributionJourneys(
      [campaign],
      leads,
      [opportunities[0], orphanOpportunity],
      [historicalSale],
    )

    expect(journey.opportunityCount).toBe(1)
    expect(journey.saleCount).toBe(0)
    expect(journey.revenue).toBe(0)
  })

  it('construye el recorrido Canal → Campaña → Lead → Oportunidad → Venta', () => {
    const campaigns = [
      {
        id: 'campaign-1',
        name: 'Colección Otoño',
        channel: 'Búsqueda',
        spend: 12000,
        impressions: 50000,
        clicks: 2100,
      },
      {
        id: 'campaign-2',
        name: 'Expo Retail',
        channel: 'Evento',
        spend: 30000,
        impressions: 0,
        clicks: 0,
      },
    ]

    const journeys = buildAttributionJourneys(campaigns, leads, opportunities, sales)

    expect(journeys[0]).toMatchObject({
      channel: 'Búsqueda',
      campaignName: 'Colección Otoño',
      leadCount: 1,
      opportunityCount: 1,
      saleCount: 1,
      revenue: 175000,
    })
  })
})
