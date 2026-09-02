'use client';

import { useCallback, useEffect, useState } from 'react';

interface Seccion { id: string; grado: string; codigo: string; tipo: string; _count: { docenteSecc: number; inscripciones: number } }

const GRADOS = ['1', '2', '3', '4', '5'];
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function CrearSeccionesPage() {
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [abierto, setAbierto] = useState(true);
  const [msg, setMsg] = useState('');
  const [manual, setManual] = useState({ grado: '1', codigo: 'A', mp: false });

  const cargar = useCallback(() => {
    fetch('/api/control-estudios/secciones').then(r => r.json()).then(d => {
      if (d.ano) { setSecciones(d.secciones); setAbierto(d.ano.abierto); }
    });
  }, []);
  useEffect(cargar, [cargar]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 4000); };

  const crear = async (body: object) => {
    const r = await fetch('/api/control-estudios/secciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    flash(r.ok ? (d.creadas ? `${d.creadas} SECCION(ES) CREADA(S)` : 'SECCIÓN CREADA') : d.error);
    if (r.ok) cargar();
  };

  const eliminar = async (id: string) => {
    const r = await fetch(`/api/control-estudios/secciones?id=${id}`, { method: 'DELETE' });
    const d = await r.json();
    flash(r.ok ? 'SECCIÓN ELIMINADA' : d.error);
    if (r.ok) cargar();
  };

  const existe = (g: string, c: string) => secciones.some(s => s.grado === g && s.codigo === c);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crear Secciones</h1>
          <p className="text-sm text-gray-500">Secciones por grado del año activo. MP = secciones de Misión/Patrocinio.</p>
        </div>
        {!abierto && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">AÑO CERRADO — SOLO LECTURA</span>}
      </div>
      {msg && <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{msg}</div>}

      {/* Creacion */}
      {abierto && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 font-bold">Crear A a I de un grado (lote)</h2>
            <div className="flex items-center gap-2">
              <select onChange={e => setManual(m => ({ ...m, grado: e.target.value }))} className="rounded border px-3 py-2 text-sm">
                {GRADOS.map(g => <option key={g} value={g}>{g}° AÑO</option>)}
              </select>
              <button onClick={() => crear({ lote: { grado: manual.grado, letras: LETRAS } })}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">CREAR A–I</button>
              <button onClick={() => crear({ lote: { grado: manual.grado, letras: [], mp: true } })}
                className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600">CREAR MP</button>
            </div>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 font-bold">Crear sección individual</h2>
            <div className="flex items-center gap-2">
              <select value={manual.grado} onChange={e => setManual(m => ({ ...m, grado: e.target.value }))} className="rounded border px-3 py-2 text-sm">
                {GRADOS.map(g => <option key={g} value={g}>{g}° AÑO</option>)}
              </select>
              <input value={manual.codigo} onChange={e => setManual(m => ({ ...m, codigo: e.target.value.toUpperCase() }))}
                placeholder="LETRA" maxLength={2} className="w-20 rounded border px-3 py-2 text-sm" />
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" checked={manual.mp} onChange={e => setManual(m => ({ ...m, mp: e.target.checked }))} /> es MP
              </label>
              <button onClick={() => crear({ grado: manual.grado, codigo: manual.codigo, tipo: manual.mp ? 'MP' : 'REGULAR' })}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">CREAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla por grado */}
      <div className="space-y-5">
        {GRADOS.map(g => (
          <div key={g} className="rounded-lg border bg-white p-4">
            <h3 className="mb-3 text-sm font-bold">{g}° AÑO</h3>
            <div className="grid grid-cols-9 gap-2">
              {secciones.filter(s => s.grado === g).map(s => (
                <div key={s.id} className={`rounded border p-2 text-center ${s.tipo === 'MP' ? 'border-amber-300 bg-amber-50' : 'bg-slate-50'}`}>
                  <div className="text-lg font-bold">{s.codigo}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{s._count.docenteSecc} celdas<br />{s._count.inscripciones} alumnos</div>
                  {abierto && (
                    <button onClick={() => eliminar(s.id)} className="mt-1 text-[10px] text-red-500 hover:underline">eliminar</button>
                  )}
                </div>
              ))}
              {GRADOS.includes(g) && !secciones.some(s => s.grado === g) && (
                <div className="col-span-9 text-sm text-gray-400 italic">Sin secciones creadas.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
