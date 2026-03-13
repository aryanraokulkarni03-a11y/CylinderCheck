import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { inject } from '@vercel/analytics'
import './index.css'
import { getTheme, setTheme } from './theme.js'

inject()

// Apply stored theme on first import (belt-and-suspenders alongside the inline script)
setTheme(getTheme())

// ─── Error Boundary ──────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(e) {
    return { error: e }
  }

  render() {
    if (this.state.error) return (
      <div style={{
        background: 'var(--bg-base, #222428)',
        color: 'var(--danger, #e53e3e)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        padding: 24,
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>❌ App Error</div>
        <div style={{
          background: 'var(--bg-raised, #292c30)',
          padding: 20,
          borderRadius: 12,
          maxWidth: 480,
          width: '100%',
          color: 'var(--text-secondary, #b0b4bc)',
          fontSize: 13,
          lineHeight: 1.8,
          boxShadow: 'var(--neu-raised)',
        }}>
          <strong style={{ color: 'var(--danger, #e53e3e)' }}>
            {this.state.error.message}
          </strong>
          <br /><br />
          Most likely fix:<br />
          1. Make sure <code>.env.local</code> is in the project ROOT folder<br />
          2. It should contain VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY<br />
          3. Restart <code>npm run dev</code> after editing .env.local
        </div>
      </div>
    )
    return this.props.children
  }
}

// ─── Mount ───────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
