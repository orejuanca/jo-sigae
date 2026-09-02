'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Ano {
  id: string; nombre: string; activo: boolean; abierto: boolean;
  secciones: { id: string; grado: string; codigo: string; _count: { docenteSecc: number; inscripciones: number } }[];
}

export default function ControlInicio() {
  const [activo, setActivo] = useState<Ano | null>(null);

  const cargar = () => {
    fetch('/api/control-estudios/anios').then(r => r.json()).then(d => setActivo(d.activo));
  };
  useEffect(cargar, []);

  const secciones = activo?.secciones ?? [];
  const conDocentes = secciones.filter(s => s._count.docenteSecc > 0).length;
  const celdas = secciones.reduce((t, s) => t + s._count.docenteSecc, 0);
  const inscritos = secciones.reduce((t, s) => t + s._count.inscripciones, 0);

  const CARDS = [
    { href: '/control-estudios/configuracion', titulo: 'CONFIGURACIÓN DEL AÑO', desc: 'Crear año escolar, agregar asignaturas y docentes. Activar/cerrar el año en uso.', chip: activo ? `AÑO ${activo.nombre}` : 'SIN AÑO ACTIVO' },
    { href: '/control-estudios/crearsecciones', titulo: 'CREAR SECCIONES', desc: 'Definir las secciones por grado (A a I y MP) del año escolar activo.', chip: `${secciones.length} SECCIONES` },
    { href: '/control-estudios/docente-seccion', titulo: 'DOCENTE-MATERIA', desc: 'Asignar el docente responsable de cada materia en cada sección.', chip: `${conDocentes} CON DOCENTES` },
    { href: '/control-estudios/inscripcion', titulo: 'INSCRIPCIÓN DE ALUMNOS', desc: 'Nómina de alumnos por sección: inscribir, retirar y buscar alumnos.', chip: `${inscritos} INSCRITOS` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Panel de Control de Estudios</h1>
      <p className="text-gray-500 mb-6 text-sm">Flujo del año escolar: configuración → secciones → docentes → inscripción de alumnos.</p>
      {!activo && (
        <div className="mb-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay año escolar activo. Empieza por <Link className="font-semibold underline" href="/control-estudios/configuracion">CONFIGURACIÓN</Link> creando el año.
        </div>
      )}
      {activo && !activo.abierto && (
        <div className="mb-6 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          El año {activo.nombre} está <b>CERRADO</b> para edición. Ábrelo en CONFIGURACIÓN si necesitas modificarlo.
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {CARDS.map(c => (
          <Link key={c.href} href={c.href}
            className="group rounded-lg border bg-white p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold group-hover:text-blue-700">{c.titulo}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{c.chip}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{c.desc}</p>
          </Link>
        ))}
      </div>
      {activo && (
        <div className="mt-8 rounded-lg border bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Resumen del año {activo.nombre}</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="rounded bg-slate-50 p-4"><div className="text-3xl font-bold">{secciones.length}</div><div className="text-xs text-gray-500">SECCIONES</div></div>
            <div className="rounded bg-slate-50 p-4"><div className="text-3xl font-bold">{celdas}</div><div className="text-xs text-gray-500">CELDAS DOCENTE-MATERIA</div></div>
            <div className="rounded bg-slate-50 p-4"><div className="text-3xl font-bold">{inscritos}</div><div className="text-xs text-gray-500">ALUMNOS INSCRITOS</div></div>
            <div className={`rounded p-4 ${activo.abierto ? 'bg-emerald-50' : 'bg-red-50'}`}><div className={`text-3xl font-bold ${activo.abierto ? 'text-emerald-700' : 'text-red-700'}`}>{activo.abierto ? 'ABIERTO' : 'CERRADO'}</div><div className="text-xs text-gray-500">ESTADO DEL AÑO</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
