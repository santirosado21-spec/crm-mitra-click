import type { AgentProfile } from './buildReport'

/** Perfiles de los agentes de Grok Bot que operan la plataforma (entran con la cuenta de Google compartida). */
export const AGENT_PROFILES: Record<AgentProfile, { name: string; job: string; guide: string }> = {
  ejecutivo: {
    name: 'Agente Ejecutivo',
    job: 'Ventas del día y alertas diarias para dirección.',
    guide: 'docs/agents/ejecutivo.md',
  },
  vendedores: {
    name: 'Agente de Vendedores',
    job: 'Ranking semanal contra cuota y quién tiene que vender más.',
    guide: 'docs/agents/vendedores.md',
  },
  productos: {
    name: 'Agente de Productos',
    job: 'Material más y menos vendido, agotados y sin movimiento.',
    guide: 'docs/agents/productos.md',
  },
}
