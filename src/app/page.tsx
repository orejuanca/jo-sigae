'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

  if (isAuthenticated) {
    router.push('/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (login(password)) {
      router.push('/dashboard')
    } else {
      setError('Contraseña incorrecta')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 p-4">
      <div className="bg-white rounded-xl shadow-lg border border-emerald-200 py-8 w-full max-w-md">
        <div className="text-center space-y-4 px-6 pb-2">
          <div className="mx-auto w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-200 bg-emerald-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">U.E.N. Creación Cúa</h1>
            <p className="text-sm mt-1 text-gray-500">Sistema de Certificaciones Escolares</p>
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>Código OD16751520</p>
            <p>Urb. José de S. Martín — Sector Los Bloques — Nueva Cúa</p>
            <p>Municipio Rafael Urdaneta, Miranda</p>
          </div>
        </div>

        <div className="px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Contraseña de Acceso
              </label>
              <input
                type="password"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                placeholder="Ingrese la contraseña del sistema"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full h-10 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold rounded-lg transition text-sm"
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>

            <p className="text-xs text-center text-gray-400">
              Ministerio del Poder Popular para la Educación
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
