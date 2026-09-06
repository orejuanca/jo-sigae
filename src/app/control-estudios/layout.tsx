'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/control-estudios', label: 'INICIO' },
  { href: '/control-estudios/configuracion', label: 'CONFIGURACIÓN' },
  { href: '/control-estudios/crearsecciones', label: 'CREAR SECCIONES' },
  { href: '/control-estudios/docente-seccion', label: 'DOCENTE-MATERIA' },
  { href: '/control-estudios/inscripcion', label: 'INSCRIPCIÓN' },
  { href: '/control-estudios/alumnos', label: 'ALUMNOS' },
  { href: '/control-estudios/notas', label: 'NOTAS' },
  { href: '/control-estudios/revision', label: 'REVISIÓN' },
  { href: '/control-estudios/rf', label: 'RESUMEN FINAL' },
];

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { isAuthenticated } = useAuth();
  const [ano, setAno] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      try { sessionStorage.setItem('login_redirect', path) } catch { /* noop */ }
      router.push('/');
    }
  }, [isAuthenticated, router, path]);

  useEffect(() => {
    fetch('/api/control-estudios/anios').then(r => r.json()).then(d => {
      if (d.activo) setAno(d.activo.nombre);
    }).catch(() => {});
  }, [path]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-6">
          <div className="text-sm leading-tight">
            <div className="font-bold tracking-wide">U.E.N. CREACIÓN CÚA — 4331</div>
            <div className="text-slate-400 text-xs">CONTROL DE ALUMNOS {ano && `· AÑO ${ano}`}</div>
          </div>
          <nav className="flex gap-1 ml-auto">
            {NAV.map(n => (
              <Link key={n.href} href={n.href}
                className={`px-3 py-2 text-xs font-semibold rounded transition-colors ${
                  path === n.href ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}>{n.label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
