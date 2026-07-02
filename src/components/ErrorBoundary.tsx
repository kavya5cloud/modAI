import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--bg-base)',
        }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{
              width: 48, height: 48,
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.5rem',
            }}>
              ⚠
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              Something went wrong
            </h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {this.state.message}
            </p>
            <button
              type="button"
              className="pill-button"
              onClick={this.handleReset}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
