// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { inject } from '@vercel/analytics'
import './lib/tokens.css'
import { getTheme, setTheme } from './theme.js'

inject()
setTheme(getTheme())

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{
        background: 'var(--bg-base, #0F0D14)',
        color: 'var(--status-severe, #B83030)',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-data)',
        padding: 24,
      }}>
        <div style={{ fontSize: 28, marginBottom: 16 }}>❌ App Error</div>
        <div style={{
          background: 'var(--bg-raised, #181520)',
          padding: 20, borderRadius: 12,
          maxWidth: 480, width: '100%',
          color: 'var(--text-secondary)',
          fontSize: 13, lineHeight: 1.8,
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
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
