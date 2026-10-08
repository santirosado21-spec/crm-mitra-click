import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

/**
 * Error boundary global: evita que una excepción de render deje la app en blanco.
 * Usa estilos inline para funcionar aunque la hoja de estilos no haya cargado.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] error de render no controlado:', error, info.componentStack)
  }

  private handleReload = () => { window.location.reload() }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div role="alert" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--color-mc-bg)', fontFamily: "'Poppins', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420, width: '100%', background: 'var(--color-mc-surface)', borderRadius: 16, border: '1px solid var(--color-mc-line)', padding: 32, textAlign: 'center', boxShadow: 'var(--shadow-mc-card)' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-mc-ink)', margin: '0 0 8px' }}>Algo salió mal</h1>
          <p style={{ fontSize: 13, color: 'var(--color-mc-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Ocurrió un error inesperado. Recarga la página para continuar.
          </p>
          <button type="button" onClick={this.handleReload} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#454a49', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Recargar página
          </button>
          {this.state.error?.message && (
            <p style={{ fontSize: 11, color: 'var(--color-mc-subtle)', marginTop: 16, wordBreak: 'break-word', fontFamily: 'monospace' }}>{this.state.error.message}</p>
          )}
        </div>
      </div>
    )
  }
}
