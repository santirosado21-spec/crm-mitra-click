import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MitraClickProvider } from './mitraclick/MitraClickProvider'
import { useMitraClick } from './mitraclick/MitraClickContext'
import { AppShell } from './mitraclick/components/AppShell'
import { ErrorScreen, LoadingScreen } from './mitraclick/components/Primitives'
import { DashboardPage } from './mitraclick/pages/DashboardPage'
import { LeadsPage } from './mitraclick/pages/LeadsPage'
import { CompaniesPage } from './mitraclick/pages/CompaniesPage'
import { OpportunitiesPage } from './mitraclick/pages/OpportunitiesPage'
import { QuotesPage } from './mitraclick/pages/QuotesPage'
import { ProductsPage } from './mitraclick/pages/ProductsPage'
import { AttributionPage } from './mitraclick/pages/AttributionPage'
import { ActivityPage } from './mitraclick/pages/ActivityPage'
import { AutomationsPage } from './mitraclick/pages/AutomationsPage'
import { AgentsPage } from './mitraclick/pages/AgentsPage'
import { ReportsPage } from './mitraclick/pages/ReportsPage'

function DataGate() {
  const { data, error, loading, resetMocks } = useMitraClick()
  if (error) return <ErrorScreen onRetry={() => { void resetMocks() }} />
  if (loading || !data) return <LoadingScreen />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="empresas" element={<CompaniesPage />} />
        <Route path="oportunidades" element={<OpportunitiesPage />} />
        <Route path="cotizaciones" element={<QuotesPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="atribucion" element={<AttributionPage />} />
        <Route path="actividad" element={<ActivityPage />} />
        <Route path="automatizaciones" element={<AutomationsPage />} />
        <Route path="agentes" element={<AgentsPage />} />
        <Route path="reportes" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MitraClickProvider>
        <DataGate />
      </MitraClickProvider>
    </BrowserRouter>
  )
}
