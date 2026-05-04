import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './hooks/useToast'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { Login } from './pages/auth/Login'
import { HomePage } from './pages/home/HomePage'
import { WMSHome } from './pages/wms/WMSHome'
import { StorageBridgePage } from './pages/wms/StorageBridgePage'
import { CFDIGeneratorPage } from './pages/wms/CFDIGeneratorPage'
import { EmisorConfigPage } from './pages/wms/EmisorConfigPage'
import { AlmacenPage } from './pages/almacen/AlmacenPage'
import { TMSHome } from './pages/tms/TMSHome'
import { TMSDashboard } from './pages/tms/TMSDashboard'
import { VehiculosPage } from './pages/tms/VehiculosPage'
import { OperadoresPage } from './pages/tms/OperadoresPage'
import { ViajesPage } from './pages/tms/ViajesPage'
import { CostosTransportePage } from './pages/tms/CostosTransportePage'
import { CotizadorPage } from './pages/cotizador/CotizadorPage'
import { TramitesPage } from './pages/tramites/TramitesPage'
import { ClientsList } from './pages/clients/ClientsList'
import { ClientDetail } from './pages/clients/ClientDetail'
import { ProformasPage } from './pages/billing/ProformasPage'
import { RCPage } from './pages/billing/RCPage'
import { TarifariosPage } from './pages/tarifarios/TarifariosPage'
import { ServiciosPage } from './pages/servicios/ServiciosPage'
import { ValidadorSKUPage } from './pages/sac/ValidadorSKUPage'
import { ReceiptGeneratorPage } from './pages/sac/ReceiptGeneratorPage'
import { TaskInbox } from './pages/tasks/TaskInbox'
import { TaskCalendar } from './pages/tasks/TaskCalendar'
import { TaskCreate } from './pages/tasks/TaskCreate'
import { TaskDetail } from './pages/tasks/TaskDetail'
import { TaskTemplates } from './pages/tasks/TaskTemplates'
import { TeamSettings } from './pages/tasks/admin/TeamSettings'
import { Reports } from './pages/tasks/admin/Reports'

function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />

          {/* WMS */}
          <Route path="/wms" element={
            <ProtectedRoute><WMSHome /></ProtectedRoute>
          } />
          <Route path="/wms/storage-bridge" element={
            <ProtectedRoute><StorageBridgePage /></ProtectedRoute>
          } />
          <Route path="/wms/cfdi-generator" element={
            <ProtectedRoute><CFDIGeneratorPage /></ProtectedRoute>
          } />
          <Route path="/wms/emisor-config" element={
            <ProtectedRoute><EmisorConfigPage /></ProtectedRoute>
          } />

          {/* Almacén */}
          <Route path="/almacen" element={
            <ProtectedRoute><AlmacenPage /></ProtectedRoute>
          } />

          {/* TMS */}
          <Route path="/tms" element={
            <ProtectedRoute><TMSHome /></ProtectedRoute>
          } />
          <Route path="/tms/dashboard" element={
            <ProtectedRoute><TMSDashboard /></ProtectedRoute>
          } />
          <Route path="/tms/vehiculos" element={
            <ProtectedRoute><VehiculosPage /></ProtectedRoute>
          } />
          <Route path="/tms/operadores" element={
            <ProtectedRoute><OperadoresPage /></ProtectedRoute>
          } />
          <Route path="/tms/viajes" element={
            <ProtectedRoute><ViajesPage /></ProtectedRoute>
          } />
          <Route path="/tms/costos" element={
            <ProtectedRoute><CostosTransportePage /></ProtectedRoute>
          } />
          <Route path="/cotizador" element={
            <ProtectedRoute><CotizadorPage /></ProtectedRoute>
          } />
          <Route path="/tramites" element={
            <ProtectedRoute><TramitesPage /></ProtectedRoute>
          } />

          {/* Clientes */}
          <Route path="/clients" element={
            <ProtectedRoute><ClientsList /></ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute><ClientDetail /></ProtectedRoute>
          } />

          {/* WMS Billing */}
          <Route path="/proformas" element={
            <ProtectedRoute><ProformasPage /></ProtectedRoute>
          } />
          <Route path="/rc" element={
            <ProtectedRoute><RCPage /></ProtectedRoute>
          } />
          <Route path="/tarifarios" element={
            <ProtectedRoute><TarifariosPage /></ProtectedRoute>
          } />
          <Route path="/servicios" element={
            <ProtectedRoute><ServiciosPage /></ProtectedRoute>
          } />
          <Route path="/sac/validador" element={
            <ProtectedRoute><ValidadorSKUPage /></ProtectedRoute>
          } />
          <Route path="/sac/receipt-generator" element={
            <ProtectedRoute><ReceiptGeneratorPage /></ProtectedRoute>
          } />

          {/* Task Tracker */}
          <Route path="/tasks" element={
            <ProtectedRoute><TaskInbox /></ProtectedRoute>
          } />
          <Route path="/tasks/calendar" element={
            <ProtectedRoute><TaskCalendar /></ProtectedRoute>
          } />
          <Route path="/tasks/new" element={
            <ProtectedRoute><TaskCreate /></ProtectedRoute>
          } />
          <Route path="/tasks/templates" element={
            <ProtectedRoute><TaskTemplates /></ProtectedRoute>
          } />
          <Route path="/tasks/admin/team" element={
            <ProtectedRoute allowedRoles={['admin']}><TeamSettings /></ProtectedRoute>
          } />
          <Route path="/tasks/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>
          } />
          <Route path="/tasks/:id" element={
            <ProtectedRoute><TaskDetail /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  )
}

export default App
