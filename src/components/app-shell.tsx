'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push('/')
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-emerald-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">U.E.N. Creación Cúa</span>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/alumnos">Alumnos</NavLink>
              <NavLink href="/certificaciones">Certificaciones</NavLink>
              <NavLink href="/constancias">Constancias</NavLink>
              <NavLink href="/boletin">Boletín</NavLink>
              <NavLink href="/titulos">Títulos</NavLink>
              <NavLink href="/validar">Validar</NavLink>
            </div>
            <button onClick={logout} className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-600 rounded-lg transition">
              Cerrar Sesión
            </button>
          </div>
          <div className="md:hidden flex flex-wrap gap-1 pb-2">
            <NavLink href="/dashboard" small>Dashboard</NavLink>
            <NavLink href="/alumnos" small>Alumnos</NavLink>
            <NavLink href="/certificaciones" small>Cert.</NavLink>
            <NavLink href="/constancias" small>Const.</NavLink>
            <NavLink href="/boletin" small>Boletín</NavLink>
            <NavLink href="/titulos" small>Títulos</NavLink>
            <NavLink href="/validar" small>Validar</NavLink>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children, small }: { href: string; children: ReactNode; small?: boolean }) {
  const router = useRouter()
  const active = window.location.pathname === href
  return (
    <button
      onClick={() => router.push(href)}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-emerald-600' : 'hover:bg-emerald-700'} ${small ? 'text-xs px-2 py-1' : ''}`}
    >
      {children}
    </button>
  )
}
