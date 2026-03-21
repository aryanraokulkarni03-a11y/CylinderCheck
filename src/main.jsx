// src/main.jsx
import './styles/fonts.css'
import './styles/typography.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { getTheme, setTheme } from './theme.js'
import { initAnalytics } from './lib/analytics.js'

initAnalytics()
setTheme(getTheme())

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{
        background: 'var(--bg-base)',
        color: 'var(--status-severe)',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)',
        padding: 'var(--space-6)',
      }}>
        <div style={{ fontSize: 'var(--fs-h2)', marginBottom: 'var(--space-4)' }}>App Error</div>
        <div style={{
          background: 'var(--bg-raised)',
          padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)',
          maxWidth: 480, width: '100%',
          color: 'var(--text-secondary)',
          fontSize: 'var(--fs-sm)', lineHeight: 1.8,
        }}>
          <strong style={{ color: 'var(--status-severe)' }}>
            {this.state.error.message}
          </strong>
          <br /><br />
          Check .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        </div>
      </div>
    )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
