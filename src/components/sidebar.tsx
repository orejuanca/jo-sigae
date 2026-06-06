'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  FileText,
  Award,
  BookOpen,
  Scroll,
  CheckCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export type ActiveView =
  | 'dashboard'
  | 'students'
  | 'certificaciones'
  | 'constancias'
  | 'boletin'
  | 'titulos'
  | 'validar';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onLogout: () => void;
}

const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'students', label: 'Alumnos', icon: <Users className="w-5 h-5" /> },
  { id: 'certificaciones', label: 'Certificaciones', icon: <FileText className="w-5 h-5" /> },
  { id: 'constancias', label: 'Constancias de Egreso', icon: <Award className="w-5 h-5" /> },
  { id: 'boletin', label: 'Boletín de Notas', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'titulos', label: 'Títulos', icon: <Scroll className="w-5 h-5" /> },
  { id: 'validar', label: 'Validar Notas', icon: <CheckCircle className="w-5 h-5" /> },
];

export default function Sidebar({ activeView, onViewChange, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (view: ActiveView) => {
    onViewChange(view);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden no-print"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-sidebar text-sidebar-foreground z-40 transition-transform duration-300 w-64 flex flex-col',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-sidebar-foreground leading-tight">
                U.E.N. Creación Cúa
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Sistema de Certificaciones</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeView === item.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
