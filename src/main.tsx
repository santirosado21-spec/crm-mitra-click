import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './mitraclick/components/ErrorBoundary'
import { ThemeProvider } from './mitraclick/theme/ThemeProvider'
import { applyTheme, readInitialTheme } from './mitraclick/theme/theme'

const initialTheme = readInitialTheme()
applyTheme(initialTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider initialTheme={initialTheme}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
