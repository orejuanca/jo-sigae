'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  ScrollText,
  BookOpen,
  Award,
  CheckCircle,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alumnos', label: 'Alumnos', icon: Users },
  { href: '/certificaciones', label: 'Certificaciones', icon: FileText },
  { href: '/constancias', label: 'Constancias', icon: ScrollText },
  { href: '/boletin', label: 'Boletín', icon: BookOpen },
  { href: '/titulos', label: 'Títulos', icon: Award },
  { href: '/validar', label: 'Validar', icon: CheckCircle },
]

export function AppNav() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:min-h-screen bg-card border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h2 className="font-bold text-sm text-primary">U.E.N. Creación Cúa</h2>
              <p className="text-xs text-muted-foreground">Sistema de Certificaciones</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-sm text-primary">Creación Cúa</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {mobileOpen && (
          <nav className="px-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </nav>
        )}
      </header>
    </>
  )
}
