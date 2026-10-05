import { Hammer } from 'lucide-react'
import type { ModuleDef } from '../navigation'
import { PageHeader, Panel } from '../components/Primitives'

const PHASE_NAME: Record<ModuleDef['phase'], string> = {
  A: 'Fundación',
  B: 'Catálogo, clientes y proveedores',
  C: 'Inventario y bodega',
  D: 'Ciclo comercial y trazabilidad',
  E: 'Conector de Shopify',
  F: 'Calidad de datos, pendientes y alertas',
  G: 'KPIs y dashboard ejecutivo',
  H: 'Agentes y reportes',
  I: 'Adquisición medible',
}

/** Módulo definido en el plan que todavía no se construye. */
export function ComingSoonPage({ module }: { module: ModuleDef }) {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={`Fase ${module.phase} · ${PHASE_NAME[module.phase]}`} title={module.label} description={module.summary} />
      <Panel testId="module-pending">
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mc-yellow-wash text-mc-ink"><Hammer size={22} aria-hidden="true" /></span>
          <p className="mt-4 text-base font-extrabold text-mc-ink">Módulo en construcción</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-mc-muted">Se entrega en la fase {module.phase} del plan. Todavía no guarda ni muestra información.</p>
        </div>
      </Panel>
    </div>
  )
}
