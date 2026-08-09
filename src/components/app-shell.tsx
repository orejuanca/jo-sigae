'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, ReactNode } from 'react'

const navVigente = [
  { href: '/dashboard', label: 'AGREGAR DATOS', bg: 'bg-emerald-600 hover:bg-emerald-500', setPlan: 'vigente' },
  { href: '/cert-view?layout=cmsj178qz0000po90v4z3ijl4&plan=vigente', label: 'EMG 31059', bg: 'bg-blue-600 hover:bg-blue-500' },
  { href: '/cert-view?layout=cmskvk7860002jy0421kqpf4x&plan=vigente', label: 'CONSTANCIA DE NOTAS', bg: 'bg-amber-600 hover:bg-amber-500' },
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

const navDerogado = [
  { href: '/dashboard', label: 'AGREGAR ANTIGUOS', bg: 'bg-emerald-600 hover:bg-emerald-500', setPlan: 'derogado' },
  { href: '/validar', label: 'VALIDAR NOTAS ANTI.', bg: 'bg-purple-600 hover:bg-purple-500' },
  { href: '/cert-view?layout=cmsj1rx4i0004po90x67iovoj&plan=derogado', label: 'III Etapa Basica', bg: 'bg-pink-600 hover:bg-pink-500' },
  { href: '/centros-escolares', label: 'CE', bg: 'bg-teal-600 hover:bg-teal-500' },
  { href: '/cert-view?layout=cmsj1x8150006po9013fgohej&plan=derogado', label: 'Media Diversificada', bg: 'bg-orange-600 hover:bg-orange-500' },
  { href: '/cert-view?layout=cmsj1zc3p0007po909nnsp9i0&plan=derogado', label: 'Formato Basica', bg: 'bg-cyan-600 hover:bg-cyan-500' },
  { href: '/cert-view?layout=cmsj1pwtp0003po90ed3q3zo7&plan=derogado', label: 'Formato Diversificado', bg: 'bg-indigo-600 hover:bg-indigo-500' },
  { href: '/cert-view?layout=cmsj1uwx80005po90rfa9mk6y&plan=derogado', label: 'Formato Universal', bg: 'bg-rose-600 hover:bg-rose-500' },
  { href: '/alumnos', label: 'ALUMNOS', bg: 'bg-slate-600 hover:bg-slate-500' },
]

function useCurrentPlan() {
  const [plan, setPlan] = useState<string>('vigente')

  useEffect(() => {
    const stored = localStorage.getItem('jo-sigae-current-plan')
    if (stored === 'derogado') setPlan('derogado')

    const handler = () => {
      const p = localStorage.getItem('jo-sigae-current-plan')
      setPlan(p === 'derogado' ? 'derogado' : 'vigente')
    }
    window.addEventListener('plan-changed', handler)
    return () => window.removeEventListener('plan-changed', handler)
  }, [])

  return plan
}

export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const plan = useCurrentPlan()
  const navItems = plan === 'derogado' ? navDerogado : navVigente
  const showPlanLabel = pathname !== '/dashboard'

  useEffect(() => {
    if (!isAuthenticated) router.push('/')
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top bar */}
      <div className="bg-gray-950 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-wide">JO-SIGAE</span>
          {showPlanLabel && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${plan === 'derogado' ? 'bg-orange-500' : 'bg-green-600'} text-white`}>
              PLAN {plan === 'derogado' ? 'DEROGADO' : 'VIGENTE'}
            </span>
          )}
        </div>
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
                key={item.href + item.label}
                onClick={() => {
                  if (item.setPlan) {
                    localStorage.setItem('jo-sigae-current-plan', item.setPlan)
                    window.dispatchEvent(new Event('plan-changed'))
                  }
                  router.push(item.href)
                }}
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
                key={item.href + item.label}
                onClick={() => {
                  if (item.setPlan) {
                    localStorage.setItem('jo-sigae-current-plan', item.setPlan)
                    window.dispatchEvent(new Event('plan-changed'))
                  }
                  router.push(item.href)
                }}
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