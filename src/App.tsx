import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthGate } from './mitraclick/auth/AuthGate'
import { SessionProvider } from './mitraclick/auth/SessionProvider'
import { AppShell } from './mitraclick/components/AppShell'
import { ALL_MODULES } from './mitraclick/navigation'
import { AuditPage } from './mitraclick/pages/AuditPage'
import { ComingSoonPage } from './mitraclick/pages/ComingSoonPage'
import { CountsPage } from './mitraclick/pages/CountsPage'
import { CustomersPage } from './mitraclick/pages/CustomersPage'
import { OrdersPage, PurchasesPage, QuotesPage } from './mitraclick/pages/DocumentListPages'
import { FamiliesPage } from './mitraclick/pages/FamiliesPage'
import { InvoicesPage, PaymentsPage } from './mitraclick/pages/FinancePages'
import { HomePage } from './mitraclick/pages/HomePage'
import { ImportPage } from './mitraclick/pages/ImportPage'
import { InventoryPage } from './mitraclick/pages/InventoryPage'
import { LocationsPage } from './mitraclick/pages/LocationsPage'
import { RemissionsPage, ShipmentsPage } from './mitraclick/pages/LogisticsPages'
import { MovementsPage } from './mitraclick/pages/MovementsPage'
import { OrderPage } from './mitraclick/pages/OrderPage'
import { ProductsPage } from './mitraclick/pages/ProductsPage'
import { PurchasePage } from './mitraclick/pages/PurchasePage'
import { QuotePage } from './mitraclick/pages/QuotePage'
import { SalesRepsPage } from './mitraclick/pages/SalesRepsPage'
import { SuppliersPage } from './mitraclick/pages/SuppliersPage'
import { TagPage } from './mitraclick/pages/TagPage'
import { TagSheetPage } from './mitraclick/pages/TagSheetPage'
import { UsersPage } from './mitraclick/pages/UsersPage'

/** Pantalla de cada módulo terminado. Los que no están aquí se muestran "en construcción". */
const READY: Record<string, ReactNode> = {
  '/usuarios': <UsersPage />,
  '/bitacora': <AuditPage />,
  '/clientes': <CustomersPage />,
  '/vendedores': <SalesRepsPage />,
  '/proveedores': <SuppliersPage />,
  '/productos': <ProductsPage />,
  '/familias': <FamiliesPage />,
  '/inventario': <InventoryPage />,
  '/movimientos': <MovementsPage />,
  '/conteos': <CountsPage />,
  '/ubicaciones': <LocationsPage />,
  '/cotizaciones': <QuotesPage />,
  '/pedidos': <OrdersPage />,
  '/compras': <PurchasesPage />,
  '/envios': <ShipmentsPage />,
  '/remisiones': <RemissionsPage />,
  '/facturas': <InvoicesPage />,
  '/pagos': <PaymentsPage />,
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AuthGate>
          <Routes>
            {/* Fuera del menú: ficha de etiqueta para teléfono y hoja para imprimir. */}
            <Route path="b/:codigo" element={<TagPage />} />
            <Route path="etiquetas" element={<TagSheetPage />} />
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="productos/importar" element={<ImportPage key="productos" kind="productos" />} />
              <Route path="clientes/importar" element={<ImportPage key="clientes" kind="clientes" />} />
              <Route path="cotizaciones/:id" element={<QuotePage />} />
              <Route path="pedidos/:id" element={<OrderPage />} />
              <Route path="compras/:id" element={<PurchasePage />} />
              {ALL_MODULES.filter((module) => module.path !== '/').map((module) => (
                <Route key={module.path} path={module.path.slice(1)} element={READY[module.path] ?? <ComingSoonPage module={module} />} />
              ))}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </SessionProvider>
    </BrowserRouter>
  )
}
