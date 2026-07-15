'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

const navItems = [
  { href: '/dashboard', label: 'AGREGAR DATOS', bg: 'bg-emerald-600 hover:bg-emerald-500' },
  { href: '/certificaciones', label: 'EMG 31059', bg: 'bg-blue-600 hover:bg-blue-500' },
  { href: '/constancias', label: 'CONSTANCIA DE NOTAS', bg: 'bg-amber-600 hover:bg-amber-500' },
  { href: '/validar', label: 'VALIDAR NOTAS', bg: 'bg-purple-600 hover:bg-purple-500' },
  { href: '/validar-titulo', label: 'VALIDAR TITULO', bg: 'bg-pink-600 hover:bg-pink-500' },
  { href: '/centros-escolares', label: 'CE', bg: 'bg-teal-600 hover:bg-teal-500' },
  { href: '/boletin', label: 'BOLETIN', bg: 'bg-orange-600 hover:bg-orange-500' },
  { href: '/boletas', label: 'BOLETAS', bg: 'bg-red-600 hover:bg-red-500' },
  { href: '/titulos', label: 'TITULO', bg: 'bg-cyan-600 hover:bg-cyan-500' },
  { href: '/titulos-lista', label: 'TITULOS', bg: 'bg-indigo-600 hover:bg-indigo-500' },
  { href: '/editor-formatos', label: 'EDITOR DE FORMATOS', bg: 'bg-rose-600 hover:bg-rose-500' },
  { href: '/alumnos', label: 'ALUMNOS', bg: 'bg-slate-600 hover:bg-slate-500' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push('/')
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top bar */}
      <div className="bg-gray-950 text-white px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-bold tracking-wide">JO-SIGAE</span>
        <button
          onClick={logout}
          className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 rounded transition"
        >
          Cerrar Sesion
        </button>
      </div>

      {/* Navigation */}
      <nav className="bg-gray-800 px-4 py-2">
        <div className="max-w-7xl mx-auto">
          {/* Desktop: horizontal buttons */}
          <div className="hidden lg:flex flex-wrap gap-1.5">
            {navItems.map(item => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`${item.bg} text-white text-[11px] font-bold px-3 py-2 rounded transition shadow-sm`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile: grid of buttons */}
          <div className="lg:hidden grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {navItems.map(item => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`${item.bg} text-white text-[10px] font-bold px-2 py-2 rounded transition shadow-sm text-center`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
        {children}
      </main>
    </div>
  )
}