'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ color: '#dc2626' }}>Error en la aplicacion</h2>
          <p style={{ margin: '10px 0' }}>{error.message}</p>
          {error.digest && <p style={{ color: '#888', fontSize: 14 }}>Digest: {error.digest}</p>}
          {error.stack && (
            <pre style={{
              background: '#f5f5f5',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 12,
              maxHeight: 400,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {error.stack}
            </pre>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: '8px 20px',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
