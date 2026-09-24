import { createContext, useContext } from 'react'
import type { Activity, Lead, MitraData, OpportunityStage } from './domain'

export interface MitraClickContextValue {
  data: MitraData | null
  loading: boolean
  error: string | null
  updateLead: (leadId: string, patch: Partial<Lead>) => void
  moveOpportunityStage: (opportunityId: string, stage: OpportunityStage) => void
  addActivity: (activity: Omit<Activity, 'id' | 'occurredAt'>) => void
  resetMocks: () => Promise<void>
}

export const MitraClickContext = createContext<MitraClickContextValue | null>(null)

export function useMitraClick() {
  const context = useContext(MitraClickContext)
  if (!context) throw new Error('useMitraClick debe usarse dentro de MitraClickProvider')
  return context
}
