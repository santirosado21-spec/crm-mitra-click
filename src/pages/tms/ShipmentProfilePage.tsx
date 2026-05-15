import { PieChart } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Sidebar } from '../../components/layout/Sidebar'

// Stub FASE 0 — se completa en su fase del sprint Techship.
export function ShipmentProfilePage() {
  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <h1 className="text-xl font-bold text-[#1e3a5f] inline-flex items-center gap-2">
            <PieChart size={20} /> Perfil de envíos
          </h1>
          <p className="text-xs text-gray-400 mt-1">En construcción — sprint Techship.</p>
        </main>
      </div>
    </div>
  )
}
