import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthGate } from './mitraclick/auth/AuthGate'
import { SessionProvider } from './mitraclick/auth/SessionProvider'
import { AppShell } from './mitraclick/components/AppShell'
import { ALL_MODULES } from './mitraclick/navigation'
import { AuditPage } from './mitraclick/pages/AuditPage'
import { ComingSoonPage } from './mitraclick/pages/ComingSoonPage'
import { HomePage } from './mitraclick/pages/HomePage'
import { UsersPage } from './mitraclick/pages/UsersPage'

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AuthGate>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="bitacora" element={<AuditPage />} />
              {ALL_MODULES.filter((module) => !module.ready).map((module) => (
                <Route key={module.path} path={module.path.slice(1)} element={<ComingSoonPage module={module} />} />
              ))}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </SessionProvider>
    </BrowserRouter>
  )
}
