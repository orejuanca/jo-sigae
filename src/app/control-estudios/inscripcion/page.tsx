'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Seccion { id: string; grado: string; codigo: string; tipo: string }
interface Inscrito {
  inscripcionId: string; alumnoId: string; matricula: string | null; repitiente: boolean; activo: boolean;
  materiaPend1?: string | null; materiaPend2?: string | null;
  cedula: string; apellidos: string; nombres: string; sexo: string | null; fechaNac: string | null; tambienEn?: string[];
}
interface AlumnoBusqueda { id: string; cedula: string; apellidos: string; nombres: string; sexo: string | null; fechaNac: string | null; inscritoEn: string | null; inscritoRegularEn: string | null; inscritoEnLista: string[] }

const GRADOS = ['1', '2', '3', '4', '5'];

function edad(fn: string | null): string {
  if (!fn) return '';
  const d = new Date(fn); if (isNaN(+d)) return '';
  const hoy = new Date();
  let e = hoy.getFullYear() - d.getFullYear();
  const m = hoy.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) e--;
  return String(e);
}

export default function InscripcionPage() {
  const [grado, setGrado] = useState('');
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [seccionId, setSeccionId] = useState('');
  const [inscritos, setInscritos] = useState<Inscrito[]>([]);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<AlumnoBusqueda[]>([]);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [nuevo, setNuevo] = useState({ cedula: '', apellidos: '', nombres: '', sexo: 'M', fechaNac: '' });
  const [msg, setMsg] = useState('');
  const [abierto, setAbierto] = useState(true);

  useEffect(() => {
    fetch('/api/control-estudios/secciones').then(r => r.json()).then(d => {
      if (d.ano) { setSecciones(d.secciones); setAbierto(d.ano.abierto); }
    });
  }, []);

  const cargarNomina = useCallback(() => {
    if (!seccionId) return;
    fetch(`/api/control-estudios/inscripciones?seccionId=${seccionId}`)
      .then(r => r.json()).then(d => setInscritos(d.inscripciones ?? []));
  }, [seccionId]);
  useEffect(cargarNomina, [cargarNomina]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 4000); };

  // búsqueda con debounce
  useEffect(() => {
    if (q.trim().length < 3) { setResultados([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/control-estudios/alumnos?q=${encodeURIComponent(q.trim())}`)
        .then(r => r.json()).then(d => setResultados(d.alumnos ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const inscribir = async (alumnoId: string) => {
    const r = await fetch('/api/control-estudios/inscripciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seccionId, alumnoId }),
    });
    const d = await r.json();
    flash(r.ok ? 'ALUMNO INSCRITO' : d.error);
    if (r.ok) { setQ(''); setResultados([]); cargarNomina(); }
  };

  const crearEInscribir = async () => {
    const r = await fetch('/api/control-estudios/inscripciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seccionId, nuevo }),
    });
    const d = await r.json();
    flash(r.ok ? 'ALUMNO CREADO E INSCRITO' : d.error);
    if (r.ok) { setMostrarAlta(false); setNuevo({ cedula: '', apellidos: '', nombres: '', sexo: 'M', fechaNac: '' }); cargarNomina(); }
  };

  const retirar = async (id: string) => {
    if (!confirm('¿Retirar este alumno de la sección?')) return;
    const r = await fetch(`/api/control-estudios/inscripciones?id=${id}`, { method: 'DELETE' });
    flash(r.ok ? 'ALUMNO RETIRADO' : 'No se pudo retirar');
    if (r.ok) cargarNomina();
  };

  const toggleRepitiente = async (i: Inscrito) => {
    // retiro + re-inscripcion es costoso; usamos DELETE+POST no: mejor PATCH futuro. Por ahora solo visual.
    flash('Marcador de repitiente: usa Modificación de Matrícula (próximo módulo)');
  };

  const activos = inscritos.filter(i => i.activo);
  const delGrado = secciones.filter(s => s.grado === grado);
  const seccionSel = delGrado.find(s => s.id === seccionId);
  const esMP = seccionSel?.tipo === 'MP';
  const etiquetaSel = seccionSel ? (seccionSel.codigo === 'MP' ? `${grado}° MP` : `${grado}° ${seccionSel.codigo}`) : '';
  const yaEnEstaSeccion = (a: AlumnoBusqueda) => a.inscritoEnLista.includes(etiquetaSel);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inscripción de Alumnos</h1>
          <p className="text-sm text-gray-500">Nómina por sección. Busca por cédula o apellido para inscribir; alta directa para alumnos nuevos.</p>
        </div>
        {!abierto && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">AÑO CERRADO</span>}
      </div>

      {/* Selectores */}
      <div className="mb-6 flex items-end gap-3 rounded-lg border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">GRADO</label>
          <select value={grado} onChange={e => { setGrado(e.target.value); setSeccionId(''); setInscritos([]); }}
            className="w-44 rounded border px-3 py-2 text-sm">
            <option value="">— SELECCIONA —</option>
            {GRADOS.map(g => <option key={g} value={g}>{g}° AÑO</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">SECCIÓN</label>
          <select value={seccionId} disabled={!grado} onChange={e => setSeccionId(e.target.value)}
            className="w-44 rounded border px-3 py-2 text-sm disabled:bg-gray-100">
            <option value="">{grado ? '— SELECCIONA —' : '…'}</option>
            {delGrado.map(s => <option key={s.id} value={s.id}>{s.codigo === 'MP' ? 'MP (Materia Pendiente)' : `${grado}° ${s.codigo}`}</option>)}
          </select>
        </div>
        {seccionId && (
          <div className="ml-auto">
            <span className="mr-3 text-sm text-gray-500"><b className="text-gray-900">{activos.length}</b> alumnos</span>
            {abierto && (
              <button onClick={() => setMostrarAlta(true)}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500">+ ALTA DE ALUMNO</button>
            )}
          </div>
        )}
      </div>

      {msg && <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{msg}</div>}

      {/* Busqueda + resultados */}
      {seccionId && abierto && (
        <div className="mb-6 rounded-lg border bg-white p-4">
          <label className="mb-2 block text-xs font-semibold text-gray-500">BUSCAR ALUMNO PARA INSCRIBIR (cédula, apellido o nombre)</label>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ej: V 32787155 u OSPINO"
            className="w-96 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {resultados.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-1">CÉDULA</th><th>APELLIDOS</th><th>NOMBRES</th><th>SEXO</th><th>F. NAC.</th><th>ESTADO</th><th></th></tr></thead>
              <tbody>
                {resultados.map(a => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-1.5 font-mono text-xs">{a.cedula}</td>
                    <td>{a.apellidos}</td>
                    <td>{a.nombres}</td>
                    <td>{a.sexo}</td>
                    <td className="text-xs text-gray-500">{a.fechaNac?.slice(0, 10)}</td>
                    <td>{yaEnEstaSeccion(a) ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">YA ESTÁ EN ESTA SECCIÓN</span>
                      : a.inscritoEn ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">INSCRITO EN {a.inscritoEn}</span>
                      : <span className="text-xs text-gray-400">sin inscripción</span>}</td>
                    <td className="text-right">
                      {!yaEnEstaSeccion(a) && (esMP || !a.inscritoRegularEn) && <button onClick={() => inscribir(a.id)} className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500">INSCRIBIR AQUÍ</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {q.trim().length >= 3 && resultados.length === 0 && (
            <p className="mt-2 text-sm text-gray-400">Sin resultados. Usa <b>+ ALTA DE ALUMNO</b> para crearlo.</p>
          )}
        </div>
      )}

      {/* Nomina */}
      {seccionId && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs text-gray-500">
                <th className="px-3 py-3 w-12">Nº</th>
                <th className="px-3 py-3 w-32">CÉDULA</th>
                <th className="px-3 py-3">APELLIDOS</th>
                <th className="px-3 py-3">NOMBRES</th>
                <th className="px-3 py-3 w-14">SEXO</th>
                <th className="px-3 py-3 w-28">F. NAC.</th>
                <th className="px-3 py-3 w-14">EDAD</th>
                <th className="px-3 py-3 w-24">ESTADO</th>
                {abierto && <th className="px-3 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {inscritos.map((i, idx) => (
                <tr key={i.inscripcionId} className={`border-b ${!i.activo ? 'bg-gray-50 text-gray-400 line-through' : ''}`}>
                  <td className="px-3 py-1.5 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{i.cedula}</td>
                  <td className="px-3 py-1.5">
                    <Link href={`/control-estudios/alumnos?q=${encodeURIComponent(i.cedula)}`} className="hover:text-blue-700 hover:underline">{i.apellidos}</Link>
                  </td>
                  <td className="px-3 py-1.5">{i.nombres}</td>
                  <td className="px-3 py-1.5">{i.sexo}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">{i.fechaNac?.slice(0, 10)}</td>
                  <td className="px-3 py-1.5">{edad(i.fechaNac)}</td>
                  <td className="px-3 py-1.5">{i.activo
                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">ACTIVO</span>
                    : <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">RETIRADO</span>}
                    {esMP && i.activo && (i.materiaPend1 || i.materiaPend2) && (
                      <div className="mt-0.5 text-[10px] font-semibold text-amber-700">
                        pendiente: {[i.materiaPend1, i.materiaPend2].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {!!i.tambienEn?.length && i.activo && <div className="mt-0.5 text-[10px] text-blue-600">también: {i.tambienEn.join(', ')}</div>}
                  </td>
                  {abierto && (
                    <td className="px-3 py-1.5 text-right">
                      {i.activo && <button onClick={() => retirar(i.inscripcionId)} className="text-xs font-semibold text-red-500 hover:underline">RETIRAR</button>}
                    </td>
                  )}
                </tr>
              ))}
              {!inscritos.length && <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-gray-400">Sección sin alumnos inscritos.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {!seccionId && <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">Selecciona un grado y una sección para ver la nómina.</div>}

      {/* Dialogo de alta */}
      {mostrarAlta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setMostrarAlta(false)}>
          <div className="w-[480px] rounded-lg bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Alta de Alumno e Inscripción</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">CÉDULA</label>
                <input value={nuevo.cedula} onChange={e => setNuevo({ ...nuevo, cedula: e.target.value.toUpperCase() })} placeholder="V 00000000" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">APELLIDOS</label>
                <input value={nuevo.apellidos} onChange={e => setNuevo({ ...nuevo, apellidos: e.target.value.toUpperCase() })} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">NOMBRES</label>
                <input value={nuevo.nombres} onChange={e => setNuevo({ ...nuevo, nombres: e.target.value.toUpperCase() })} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">SEXO</label>
                  <select value={nuevo.sexo} onChange={e => setNuevo({ ...nuevo, sexo: e.target.value })} className="w-full rounded border px-3 py-2 text-sm">
                    <option value="M">M</option><option value="F">F</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-gray-500">FECHA DE NACIMIENTO</label>
                  <input type="date" value={nuevo.fechaNac} onChange={e => setNuevo({ ...nuevo, fechaNac: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setMostrarAlta(false)} className="rounded border px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">CANCELAR</button>
              <button onClick={crearEInscribir} className="rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500">CREAR E INSCRIBIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
