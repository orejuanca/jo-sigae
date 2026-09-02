'use client';

import { useCallback, useEffect, useState } from 'react';

interface Ano { id: string; nombre: string; activo: boolean; abierto: boolean }
interface Asig { id: string; codigo: string; nombre: string }
interface Doc { id: string; cedula: string; nombre: string }

export default function ConfiguracionPage() {
  const [anios, setAnios] = useState<Ano[]>([]);
  const [activo, setActivo] = useState<Ano | null>(null);
  const [asignaturas, setAsignaturas] = useState<Asig[]>([]);
  const [docentes, setDocentes] = useState<Doc[]>([]);
  const [nuevoAno, setNuevoAno] = useState('');
  const [msg, setMsg] = useState('');
  const [na, setNa] = useState({ codigo: '', nombre: '' });
  const [nd, setNd] = useState({ cedula: '', nombre: '' });

  const cargar = useCallback(() => {
    fetch('/api/control-estudios/anios').then(r => r.json()).then(d => {
      setAnios(d.todos); setActivo(d.activo);
    });
    fetch('/api/control-estudios/catalogos').then(r => r.json()).then(d => {
      setAsignaturas(d.asignaturas); setDocentes(d.docentes);
    });
  }, []);
  useEffect(cargar, [cargar]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 4000); };

  const crearAno = async () => {
    const r = await fetch('/api/control-estudios/anios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nuevoAno }) });
    const d = await r.json();
    flash(r.ok ? `AÑO ${d.ano.nombre} CREADO Y ACTIVADO` : d.error);
    if (r.ok) { setNuevoAno(''); cargar(); }
  };

  const activarAno = async (id: string) => {
    await fetch('/api/control-estudios/anios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    flash('AÑO ACTIVADO'); cargar();
  };

  const toggleAbierto = async () => {
    if (!activo) return;
    await fetch('/api/control-estudios/anios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activo.id, abierto: !activo.abierto }) });
    flash(activo.abierto ? 'AÑO CERRADO' : 'AÑO ABIERTO'); cargar();
  };

  const agregar = async (tipo: 'asignatura' | 'docente') => {
    const body = tipo === 'asignatura' ? { tipo, ...na } : { tipo, ...nd };
    const r = await fetch('/api/control-estudios/catalogos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    flash(r.ok ? 'GUARDADO' : d.error);
    if (r.ok) { tipo === 'asignatura' ? setNa({ codigo: '', nombre: '' }) : setNd({ cedula: '', nombre: '' }); cargar(); }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Configuración del Año Escolar</h1>
      {msg && <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{msg}</div>}

      <div className="grid grid-cols-2 gap-6">
        {/* AÑOS */}
        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 font-bold">Años Escolares</h2>
          <div className="mb-3 flex gap-2">
            <input value={nuevoAno} onChange={e => setNuevoAno(e.target.value)} placeholder="Ej: 2022 - 2023"
              className="w-40 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={crearAno} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">CREAR NUEVO AÑO</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2">AÑO</th><th>ESTADO</th><th></th></tr></thead>
            <tbody>
              {anios.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="py-2 font-semibold">{a.nombre}</td>
                  <td>
                    {a.activo ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">ACTIVO · {a.abierto ? 'ABIERTO' : 'CERRADO'}</span>
                      : <span className="text-gray-400">inactivo</span>}
                  </td>
                  <td className="text-right">
                    {!a.activo && <button onClick={() => activarAno(a.id)} className="text-xs font-semibold text-blue-600 hover:underline">ACTIVAR</button>}
                    {a.activo && <button onClick={toggleAbierto} className="text-xs font-semibold text-amber-600 hover:underline">{a.abierto ? 'CERRAR' : 'ABRIR'}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* CATALOGOS */}
        <section className="space-y-4">
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 font-bold">Asignaturas ({asignaturas.length})</h2>
            <div className="mb-3 flex gap-2">
              <input value={na.codigo} onChange={e => setNa({ ...na, codigo: e.target.value })} placeholder="CÓDIGO" className="w-24 rounded border px-3 py-2 text-sm" />
              <input value={na.nombre} onChange={e => setNa({ ...na, nombre: e.target.value })} placeholder="Nombre de la asignatura" className="flex-1 rounded border px-3 py-2 text-sm" />
              <button onClick={() => agregar('asignatura')} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">AGREGAR</button>
            </div>
            <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5">
              {asignaturas.map(a => (
                <span key={a.id} className="rounded bg-slate-100 px-2 py-1 text-xs"><b>{a.codigo}</b> {a.nombre}</span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 font-bold">Docentes ({docentes.length})</h2>
            <div className="mb-3 flex gap-2">
              <input value={nd.cedula} onChange={e => setNd({ ...nd, cedula: e.target.value })} placeholder="V 0000000" className="w-32 rounded border px-3 py-2 text-sm" />
              <input value={nd.nombre} onChange={e => setNd({ ...nd, nombre: e.target.value })} placeholder="APELLIDO, NOMBRE" className="flex-1 rounded border px-3 py-2 text-sm" />
              <button onClick={() => agregar('docente')} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">AGREGAR</button>
            </div>
            <div className="max-h-40 overflow-y-auto text-xs text-gray-600">
              {docentes.map(d => <div key={d.id} className="border-b py-1"><b className="text-gray-800">{d.cedula}</b> · {d.nombre}</div>)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
