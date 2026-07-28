'use client'

import { Component, ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'

// Error boundary to catch and display the actual error
class ErrorBoundary extends Component<{children: ReactNode}, {error: Error|null, errorInfo: string}> {
  state = { error: null as Error|null, errorInfo: '' }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ errorInfo: info.componentStack || '' })
    // Also log to console
    console.error('DASHBOARD ERROR:', error.message, error.stack, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <AppShell>
          <div style={{padding: 20, background: '#fff', borderRadius: 8}}>
            <h1 style={{color: 'red', fontSize: 20}}>Error en el Dashboard</h1>
            <p style={{margin: '10px 0'}}><strong>Mensaje:</strong> {this.state.error.message}</p>
            <pre style={{background: '#f5f5f5', padding: 10, borderRadius: 4, fontSize: 12, maxHeight: 200, overflow: 'auto'}}>{this.state.error.stack}</pre>
            <button onClick={() => this.setState({error: null})} style={{padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 10}}>
              Reintentar
            </button>
          </div>
        </AppShell>
      )
    }
    return this.props.children
  }
}

// Lazy import the real dashboard
function DashboardContent() {
  throw new Error('LOADING...')
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  )
}
