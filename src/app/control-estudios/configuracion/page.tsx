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
  const [msgOk, setMsgOk] = useState(true);
  const [na, setNa] = useState({ codigo: '', nombre: '' });
  const [nd, setNd] = useState({ cedula: '', nombre: '' });

  const flash = (t: string, ok = true) => { setMsg(t); setMsgOk(ok); setTimeout(() => setMsg(''), 5000); };

  const cargar = useCallback(() => {
    (async () => {
      try {
        const ra = await fetch('/api/control-estudios/anios');
        const da = await ra.json();
        if (ra.ok) { setAnios(da.todos ?? []); setActivo(da.activo); }
        else flash(da.error ?? 'No se pudieron cargar los años', false);
      } catch { flash('No se pudo conectar con el servidor de años', false); }
      try {
        const rc = await fetch('/api/control-estudios/catalogos');
        const dc = await rc.json();
        if (rc.ok) { setAsignaturas(dc.asignaturas ?? []); setDocentes(dc.docentes ?? []); }
        else flash(dc.error ?? 'No se pudieron cargar los catálogos', false);
      } catch { flash('Catálogos no disponibles: detén el servidor, ejecuta npm run db:generate y npm run db:push, y reinicia npm run dev', false); }
    })();
  }, []);
  useEffect(cargar, [cargar]);

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
    flash(r.ok ? 'GUARDADO' : d.error, r.ok);
    if (r.ok) { tipo === 'asignatura' ? setNa({ codigo: '', nombre: '' }) : setNd({ cedula: '', nombre: '' }); cargar(); }
  };

  const eliminar = async (tipo: 'asignatura' | 'docente', id: string, nombre: string) => {
    const aviso = tipo === 'docente'
      ? `¿Eliminar a ${nombre}? Sus asignaciones en la matriz quedarán SIN DOCENTE.`
      : `¿Eliminar la asignatura ${nombre}?`;
    if (!confirm(aviso)) return;
    const r = await fetch(`/api/control-estudios/catalogos?tipo=${tipo}&id=${id}`, { method: 'DELETE' });
    const d = await r.json();
    flash(r.ok ? (d.desasignadas ? `ELIMINADO (${d.desasignadas} asignación(es) liberadas)` : 'ELIMINADO') : d.error, r.ok);
    if (r.ok) cargar();
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Configuración del Año Escolar</h1>
      {msg && <div className={`mb-4 rounded border px-4 py-2 text-sm font-semibold ${msgOk ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'}`}>{msg}</div>}

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
                <span key={a.id} className="rounded bg-slate-100 px-2 py-1 text-xs"><b>{a.codigo}</b> {a.nombre}
                  <button onClick={() => eliminar('asignatura', a.id, a.nombre)} className="ml-1 text-red-400 hover:text-red-600" title="Eliminar">✕</button>
                </span>
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
              {docentes.map(d => <div key={d.id} className="flex items-center justify-between border-b py-1"><span><b className="text-gray-800">{d.cedula}</b> · {d.nombre}</span>
                <button onClick={() => eliminar('docente', d.id, d.nombre)} className="text-red-400 hover:text-red-600" title="Eliminar">✕</button>
              </div>)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
