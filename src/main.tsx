import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Riga Transit render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, color: '#f5f2ea', background: '#111820', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
          <section style={{ maxWidth: 320 }}>
            <div style={{ color: '#d8b779', fontSize: 13, letterSpacing: 2, fontWeight: 700 }}>RIGA TRANSIT</div>
            <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>Не удалось открыть карту</h1>
            <p style={{ color: '#9aa5ad', fontSize: 14, lineHeight: 1.5 }}>Произошла ошибка при запуске. Попробуйте перезагрузить приложение.</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 12, border: 0, borderRadius: 12, padding: '12px 20px', color: '#1d252b', background: 'linear-gradient(115deg,#cba96d,#f0d9a8)', fontWeight: 700 }}>Перезагрузить</button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>,
)
