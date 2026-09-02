'use client';

import { useCallback, useEffect, useState } from 'react';

interface Seccion { id: string; grado: string; codigo: string; tipo: string }
interface Docente { id: string; cedula: string; nombre: string }
interface Fila { asignaturaId: string; codigo: string; nombre: string; docenteId: string | null }

const GRADOS = ['1', '2', '3', '4', '5'];

export default function DocenteSeccionPage() {
  const [grado, setGrado] = useState('');
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [seccionId, setSeccionId] = useState('');
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [sucias, setSucias] = useState<Record<string, string | null>>({}); // asignaturaId -> docenteId nuevo
  const [msg, setMsg] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(true);

  // secciones del año (una sola vez)
  useEffect(() => {
    fetch('/api/control-estudios/secciones').then(r => r.json()).then(d => {
      if (d.ano) { setSecciones(d.secciones); setAbierto(d.ano.abierto); }
    });
    fetch('/api/control-estudios/catalogos').then(r => r.json()).then(d => setDocentes(d.docentes));
  }, []);

  const cargarFilas = useCallback(() => {
    if (!seccionId) return;
    fetch(`/api/control-estudios/docente-seccion?seccionId=${seccionId}`)
      .then(r => r.json())
      .then(d => { setFilas(d.filas ?? []); setSucias({}); });
  }, [seccionId]);
  useEffect(cargarFilas, [cargarFilas]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 4000); };

  const cambiar = (asignaturaId: string, v: string) => {
    const original = filas.find(f => f.asignaturaId === asignaturaId)?.docenteId ?? null;
    const nuevo = v || null;
    setSucias(prev => {
      const copy = { ...prev };
      if (nuevo === original) delete copy[asignaturaId]; else copy[asignaturaId] = nuevo;
      return copy;
    });
  };

  const guardar = async () => {
    const pendientes = Object.entries(sucias);
    if (!pendientes.length) return flash('NO HAY CAMBIOS PENDIENTES');
    setGuardando(true);
    for (const [asignaturaId, docenteId] of pendientes) {
      await fetch('/api/control-estudios/docente-seccion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seccionId, asignaturaId, docenteId }),
      });
    }
    setGuardando(false);
    flash(`${pendientes.length} ASIGNACION(ES) GUARDADA(S)`);
    cargarFilas();
  };

  const delGrado = secciones.filter(s => s.grado === grado);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Docente-Materia por Sección</h1>
          <p className="text-sm text-gray-500">Selecciona el grado y la sección; asigna el docente de cada materia.</p>
        </div>
        {!abierto && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">AÑO CERRADO</span>}
      </div>

      {/* Selectores encadenados */}
      <div className="mb-6 flex items-end gap-3 rounded-lg border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">GRADO</label>
          <select value={grado} onChange={e => { setGrado(e.target.value); setSeccionId(''); setFilas([]); }}
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
          <div className="ml-auto flex items-center gap-3">
            {Object.keys(sucias).length > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{Object.keys(sucias).length} SIN GUARDAR</span>
            )}
            {abierto && (
              <button onClick={guardar} disabled={guardando}
                className="rounded bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">
                {guardando ? 'GUARDANDO…' : 'GUARDAR CAMBIOS'}
              </button>
            )}
          </div>
        )}
      </div>

      {msg && <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{msg}</div>}

      {seccionId && filas.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs text-gray-500">
                <th className="px-4 py-3 w-20">CÓDIGO</th>
                <th className="px-4 py-3">ASIGNATURA</th>
                <th className="px-4 py-3">DOCENTE</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => {
                const sucia = sucias[f.asignaturaId] !== undefined;
                return (
                  <tr key={f.asignaturaId} className={`border-b ${sucia ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-2 font-mono text-xs font-bold">{f.codigo}</td>
                    <td className="px-4 py-2">{f.nombre}</td>
                    <td className="px-4 py-2">
                      <select value={sucia ? (sucias[f.asignaturaId] ?? '') : (f.docenteId ?? '')}
                        disabled={!abierto}
                        onChange={e => cambiar(f.asignaturaId, e.target.value)}
                        className={`w-80 rounded border px-3 py-1.5 text-sm ${sucia ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}>
                        <option value="">— SIN DOCENTE —</option>
                        {docentes.map(d => <option key={d.id} value={d.id}>{d.nombre} ({d.cedula})</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {seccionId && !filas.length && (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">Sección sin filas de asignaturas.</div>
      )}
      {!seccionId && <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">Selecciona un grado y una sección para ver la matriz.</div>}
    </div>
  );
}
