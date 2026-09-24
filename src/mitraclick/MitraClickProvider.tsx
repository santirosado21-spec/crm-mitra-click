import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Activity,
  Lead,
  MitraData,
  OpportunityStage,
} from './domain'
import {
  mitraRepository,
  type MitraRepository,
} from './data/repository'
import {
  MitraClickContext,
  type MitraClickContextValue,
} from './MitraClickContext'

const nowIso = () => new Date().toISOString()
const localId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`

export function MitraClickProvider({
  children,
  repository = mitraRepository,
}: {
  children: ReactNode
  repository?: MitraRepository
}) {
  const [data, setData] = useState<MitraData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resetMocks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const snapshot = await repository.load()
      setData(snapshot)
    } catch {
      setData(null)
      setError('No fue posible cargar la fuente de datos.')
    } finally {
      setLoading(false)
    }
  }, [repository])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void repository
      .load()
      .then((snapshot) => {
        if (!active) return
        setData(snapshot)
      })
      .catch(() => {
        if (!active) return
        setData(null)
        setError('No fue posible cargar la fuente de datos.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [repository])

  const updateLead = useCallback((leadId: string, patch: Partial<Lead>) => {
    setData((current) =>
      current
        ? {
            ...current,
            leads: current.leads.map((lead) =>
              lead.id === leadId ? { ...lead, ...patch } : lead,
            ),
          }
        : current,
    )
  }, [])

  const addActivity = useCallback(
    (activity: Omit<Activity, 'id' | 'occurredAt'>) => {
      setData((current) =>
        current
          ? {
              ...current,
              activities: [
                {
                  ...activity,
                  id: localId('activity-local'),
                  occurredAt: nowIso(),
                },
                ...current.activities,
              ],
            }
          : current,
      )
    },
    [],
  )

  const moveOpportunityStage = useCallback(
    (opportunityId: string, stage: OpportunityStage) => {
      setData((current) => {
        if (!current) return current
        const opportunity = current.opportunities.find((item) => item.id === opportunityId)
        if (!opportunity || opportunity.stage === stage) return current

        return {
          ...current,
          opportunities: current.opportunities.map((item) =>
            item.id === opportunityId ? { ...item, stage, updatedAt: nowIso() } : item,
          ),
          activities: [
            {
              id: localId('activity-stage'),
              type: 'etapa',
              title: `Oportunidad movida a ${stage}`,
              description: `${opportunity.name}: ${opportunity.stage} → ${stage}. Cambio local sobre datos simulados.`,
              actor: 'Usuario demo',
              occurredAt: nowIso(),
              leadId: opportunity.leadId,
              companyId: opportunity.companyId,
              opportunityId,
              status: 'Completado',
            },
            ...current.activities,
          ],
        }
      })
    },
    [],
  )

  const value = useMemo<MitraClickContextValue>(
    () => ({
      data,
      error,
      loading,
      updateLead,
      moveOpportunityStage,
      addActivity,
      resetMocks,
    }),
    [
      addActivity,
      data,
      error,
      loading,
      moveOpportunityStage,
      resetMocks,
      updateLead,
    ],
  )

  return <MitraClickContext.Provider value={value}>{children}</MitraClickContext.Provider>
}
