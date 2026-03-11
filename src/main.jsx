import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ background:'#0a0a14', color:'#ef4444', minHeight:'100vh',
          display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', fontFamily:'monospace', padding:24 }}>
        <div style={{ fontSize:32, marginBottom:16 }}>❌ App Error</div>
        <div style={{ background:'#1a1a2e', padding:20, borderRadius:12,
            maxWidth:480, width:'100%', color:'#ccc', fontSize:13, lineHeight:1.8 }}>
          <strong style={{ color:'#ef4444' }}>{this.state.error.message}</strong>
          <br/><br/>
          Most likely fix:<br/>
          1. Make sure <code>.env.local</code> is in the project ROOT folder<br/>
          2. It should contain VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY<br/>
          3. Restart <code>npm run dev</code> after editing .env.local
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
