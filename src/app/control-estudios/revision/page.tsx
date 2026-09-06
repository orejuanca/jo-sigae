'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ==================== BLOQUE 2: NOTAS DE REVISIÓN (hojas NR del Excel) ====================
// "NR 1°".."NR 5°" = RESUMEN FINAL DE REVISIÓN: SOLO los estudiantes que NO aprobaron
// todas las materias (mismo criterio en definitiva o final: aprueba con 10 o más).
// Por materia reprobada el Excel trae: "IN" (insuficiente, sigue aplazado) o un ENTERO
// (resultado tras la revisión). Lo aprobado se muestra con "*" derivado, igual que la
// sábana. OC, PGCRP y GRUPO no llevan revisión: siempre "*" (así están en el Excel).
// La planilla se muestra por GRADO con un bloque por sección, como la hoja NR.
// Listados por CÉDULA de menor a mayor (regla de la escuela). Todo ENTERO.

type Materia = { id: string; codigo: string; nombre: string; cualitativa?: boolean };
type Estudiante = {
  inscripcionId: string; cedula: string; nombre: string; sexo: string; numeroLista: string | null;
  notas: Record<string, string>;        // "asigId|lapso" -> valor (para ver la definitiva)
  revisiones: Record<string, string>;   // "asigId" -> "IN" | entero (valores del Excel)
  enRevision: string[];                 // ids de asignaturas que van a revisión (reprobadas o celda del Excel)
};
type SeccionNR = { id: string; codigo: string; tipo: string; estudiantes: Estudiante[] };
type Datos = { ano: string; materias: Materia[]; secciones: SeccionNR[] };

// el Excel muestra las notas menores a 10 con cero adelante (01..09); el guardado sigue entero
function conCero(v: string): string {
  return /^\d+$/.test(v) && Number(v) < 10 ? '0' + Number(v) : v;
}

// definitiva numérica (entera) con las reglas del módulo NOTAS: P se propaga, NC no promedia
function definitivaDe(notas: Record<string, string>, asigId: string): number | 'P' | '' {
  const vs = [1, 2, 3].map(l => notas[`${asigId}|${l}`] ?? '');
  if (vs.some(v => !v)) return '';
  if (vs.includes('P')) return 'P';
  const nums = vs.map(Number).filter(n => isFinite(n));
  if (nums.length === 0) return '';
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export default function RevisionPage() {
  const [grado, setGrado] = useState('');
  const [datos, setDatos] = useState<Datos | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({}); // "ins|asig" -> valor actual de la celda
  const [celdaEstado, setCeldaEstado] = useState<Record<string, string>>({}); // 'guardando' | 'ok' | error
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const refs = useRef<Map<string, HTMLInputElement>>(new Map());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // autoguardado con retardo: guarda 800ms después del último tecleo (o al salir de la celda)
  function programar(clave: string, fn: () => void) {
    const t = timers.current.get(clave);
    if (t) clearTimeout(t);
    timers.current.set(clave, setTimeout(() => { timers.current.delete(clave); fn(); }, 800));
  }
  function cancelar(clave: string) {
    const t = timers.current.get(clave);
    if (t) { clearTimeout(t); timers.current.delete(clave); }
  }
  function cancelarTodos() {
    for (const t of timers.current.values()) clearTimeout(t);
    timers.current.clear();
  }

  const cargar = useCallback(async (g: string) => {
    if (!g) { setDatos(null); return; }
    setCargando(true);
    setMensaje(null);
    cancelarTodos();
    try {
      const r = await fetch(`/api/control-estudios/revision?grado=${g}`);
      const d = await r.json();
      if (!r.ok) { setMensaje(d.error || 'ERROR_CARGA'); setDatos(null); return; }
      setDatos(d);
      // estado de celdas = valores ya asentados (del Excel o escritos antes)
      const v: Record<string, string> = {};
      for (const s of d.secciones as SeccionNR[]) {
        for (const e of s.estudiantes) {
          for (const [aid, val] of Object.entries(e.revisiones)) v[`${e.inscripcionId}|${aid}`] = conCero(val);
        }
      }
      setValores(v);
      setCeldaEstado({});
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(grado); }, [grado, cargar]);

  // ----- guardado -----
  async function guardar(clave: string, inscripcionId: string, asignaturaId: string, raw: string) {
    const vacio = raw.trim() === '';
    setCeldaEstado(e => ({ ...e, [clave]: 'guardando' }));
    try {
      const r = await fetch('/api/control-estudios/revision', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscripcionId, asignaturaId,
          valor: vacio ? null : raw.trim().toUpperCase().replace(',', '.'),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setCeldaEstado(e => ({ ...e, [clave]: d.error || 'ERROR_GUARDAR' }));
        setMensaje(d.error || 'ERROR_GUARDAR');
        return;
      }
      setValores(v => {
        const n = { ...v };
        if (vacio || d.valor === null) delete n[clave]; else n[clave] = conCero(d.valor);
        return n;
      });
      setCeldaEstado(e => {
        const n = { ...e };
        delete n[clave];
        return n;
      });
      setMensaje(null);
    } catch {
      setCeldaEstado(e => ({ ...e, [clave]: 'SIN_CONEXION' }));
    }
  }

  // ----- navegación con teclado (estilo planilla) -----
  function registrar(i: number, j: number) {
    return (el: HTMLInputElement | null) => {
      if (el) refs.current.set(`${i}-${j}`, el); else refs.current.delete(`${i}-${j}`);
    };
  }
  function teclaCelda(e: React.KeyboardEvent, i: number, j: number) {
    const inp = e.currentTarget as HTMLInputElement;
    let destino: { di: number; dj: number } | null = null;
    if (e.key === 'Enter' || e.key === 'ArrowDown') destino = { di: 1, dj: 0 };
    else if (e.key === 'ArrowUp') destino = { di: -1, dj: 0 };
    else if (e.key === 'ArrowRight' && inp.selectionStart === inp.value.length && inp.selectionEnd === inp.value.length) destino = { di: 0, dj: 1 };
    else if (e.key === 'ArrowLeft' && inp.selectionStart === 0 && inp.selectionEnd === 0) destino = { di: 0, dj: -1 };
    if (!destino) return;
    e.preventDefault();
    inp.blur(); // dispara el autoguardado antes de mover
    const el = refs.current.get(`${i + destino.di}-${j + destino.dj}`);
    if (el) { el.focus(); el.select?.(); }
  }

  const claseCelda = (clave: string) => {
    const st = celdaEstado[clave];
    if (st === 'guardando') return 'border-b-2 border-amber-400 bg-amber-50';
    if (st === 'ok') return 'border-b-2 border-emerald-400';
    if (st) return 'border-2 border-red-400 bg-red-50';
    return '';
  };

  const valorCelda = (inscripcionId: string, asigId: string) => valores[`${inscripcionId}|${asigId}`] ?? '';

  // pie del bloque (igual que el Excel): APROBADOS = recuperó (entero >= 10);
  // APLAZADOS = quedó IN o con nota < 10
  function totales(sec: SeccionNR, m: Materia): { ap: number; re: number } {
    let ap = 0, re = 0;
    for (const e of sec.estudiantes) {
      const v = valorCelda(e.inscripcionId, m.id);
      if (!v) continue;
      if (v === 'IN') re++;
      else if (Number(v) >= 10) ap++;
      else re++;
    }
    return { ap, re };
  }

  const totalEstudiantes = useMemo(
    () => (datos ? datos.secciones.reduce((t, s) => t + s.estudiantes.length, 0) : 0),
    [datos]
  );
  const totalAplazadas = useMemo(() => {
    if (!datos) return { conIn: 0, recuperadas: 0, pendientes: 0 };
    let conIn = 0, recuperadas = 0, pendientes = 0;
    for (const s of datos.secciones) {
      for (const e of s.estudiantes) {
        for (const aid of e.enRevision) {
          const v = valorCelda(e.inscripcionId, aid);
          if (!v) pendientes++;
          else if (v === 'IN') conIn++;
          else if (Number(v) >= 10) recuperadas++;
          else conIn++;
        }
      }
    }
    return { conIn, recuperadas, pendientes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, valores]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">NOTAS DE REVISIÓN (NR)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resumen final de revisión, como las hojas NR 1° a NR 5° del Excel: SOLO los estudiantes que NO aprobaron todas
          las materias (mismo criterio en definitiva o final: aprueba con 10 o más). Por cada materia reprobada se anota
          <b> IN</b> (insuficiente, sigue aplazada) o el <b>entero</b> que obtuvo en la revisión; lo aprobado lleva *
          como en la sábana. OC, PGCRP y GRUPO no llevan revisión (siempre *). Todo en ENTEROS.
        </p>
      </div>

      {/* ----- selector de grado ----- */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-4">
        <label className="text-sm font-semibold text-gray-700">GRADO</label>
        <select value={grado} onChange={e => setGrado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">-- elija --</option>
          {['1', '2', '3', '4', '5'].map(g => <option key={g} value={g}>{g}°</option>)}
        </select>
        {datos && (
          <span className="ml-auto flex items-center gap-2 text-sm flex-wrap">
            <span className="px-2 py-1 rounded font-semibold text-xs bg-rose-100 text-rose-800">REVISIÓN {grado}°</span>
            <span className="text-gray-500">AÑO {datos.ano}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">{totalEstudiantes} estudiantes en revisión</span>
            <span className="text-gray-400">·</span>
            <span className="text-red-600 font-semibold">{totalAplazadas.conIn} aplazadas (IN)</span>
            <span className="text-emerald-600 font-semibold">{totalAplazadas.recuperadas} recuperadas</span>
            {totalAplazadas.pendientes > 0 && (
              <span className="text-amber-600 font-semibold">{totalAplazadas.pendientes} sin asentar</span>
            )}
          </span>
        )}
      </div>

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
          {mensaje.replace(/_/g, ' ')}
        </div>
      )}

      {cargando && <div className="text-sm text-gray-500">Cargando revisión…</div>}

      {datos && datos.secciones.length === 0 && (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
          Ningún estudiante de {grado}° quedó en revisión.
        </div>
      )}

      {/* ==================== UN BLOQUE POR SECCIÓN (como la hoja NR) ==================== */}
      {datos && datos.secciones.map((sec, si) => (
        <div key={sec.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Notas de REVISIÓN {grado}° {sec.codigo}</h2>
            <span className="text-xs text-gray-400">{sec.estudiantes.length} estudiantes</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-rose-50">
                  <th className="sticky left-0 top-0 z-30 bg-rose-50 border-b border-r border-gray-300 px-2 py-2 text-left min-w-[118px]">CÉDULA</th>
                  <th className="sticky top-0 z-20 bg-rose-50 border-b border-r border-gray-300 px-2 py-2 text-left min-w-[240px]">ESTUDIANTE</th>
                  {datos.materias.map(m => (
                    <th key={m.id} className="sticky top-0 z-20 bg-rose-50 border-b border-gray-300 px-2 py-2 min-w-[64px]">
                      <div className="font-bold">{m.codigo}</div>
                      <div className="font-normal text-[10px] text-gray-500 max-w-[90px] truncate" title={m.nombre}>{m.nombre}</div>
                    </th>
                  ))}
                  <th className="sticky top-0 z-20 bg-rose-50 border-b border-gray-300 px-2 py-2 min-w-[64px]">
                    <div className="font-bold">GRUPO</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sec.estudiantes.map((est, i) => (
                  <tr key={est.inscripcionId} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-2 py-1.5 font-mono text-xs whitespace-nowrap">
                      {est.cedula}
                    </td>
                    <td className="border-b border-r border-gray-200 px-2 py-1.5 whitespace-nowrap font-medium">
                      {est.nombre}
                    </td>
                    {datos.materias.map((m, j) => {
                      const clave = `${est.inscripcionId}|${m.id}`;
                      const def = definitivaDe(est.notas, m.id);
                      const defTxt = def === '' ? 'sin definitiva' : typeof def === 'number' ? conCero(String(def)) : def;
                      const tip = `Definitiva: ${defTxt} · ${est.nombre} · ${m.nombre}`;
                      // cualitativas (OC/PGCRP) y GRUPO: siempre *, como el Excel
                      if (m.cualitativa) {
                        return (
                          <td key={m.id} className="border-b border-gray-200 px-2 py-1 text-center text-gray-400 font-bold" title={`${tip} (no lleva revisión)`}>*</td>
                        );
                      }
                      const v = valorCelda(est.inscripcionId, m.id);
                      const enRev = est.enRevision.includes(m.id);
                      if (!enRev && !v) {
                        // aprobada sin revisión: * derivado (igual que la sábana)
                        return (
                          <td key={m.id} className="border-b border-gray-200 px-2 py-1 text-center text-gray-400 font-bold" title={tip}>*</td>
                        );
                      }
                      return (
                        <td key={m.id} className={`border-b border-gray-200 px-1 py-1 text-center ${claseCelda(clave)} ${!v ? 'bg-amber-50' : ''}`}>
                          <input ref={registrar(i + si * 100, j)} type="text" inputMode="text"
                            value={v}
                            onChange={e => {
                              const nv = e.target.value.toUpperCase();
                              setValores(vv => ({ ...vv, [clave]: nv }));
                              programar(clave, () => guardar(clave, est.inscripcionId, m.id, nv));
                            }}
                            onBlur={e => {
                              cancelar(clave);
                              guardar(clave, est.inscripcionId, m.id, e.target.value);
                            }}
                            onKeyDown={e => teclaCelda(e, i + si * 100, j)}
                            className={`w-14 text-center outline-none focus:bg-sky-50 focus:ring-1 focus:ring-sky-400 rounded font-semibold ${v === 'IN' ? 'text-red-600' : ''}`}
                            title={tip} />
                        </td>
                      );
                    })}
                    <td className="border-b border-gray-200 px-2 py-1 text-center text-gray-400 font-bold" title="GRUPO no lleva revisión (así está en el Excel)">*</td>
                  </tr>
                ))}
                {/* pie del bloque: TOTAL APROBADOS / APLAZADOS por materia (igual que el Excel) */}
                <tr className="bg-slate-50 font-semibold">
                  <td className="sticky left-0 z-10 bg-slate-50 border-t border-r border-gray-300 px-2 py-1.5 text-xs" colSpan={2}>TOTAL APROBADOS (recuperó)</td>
                  {datos.materias.map(m => {
                    const t = totales(sec, m);
                    return <td key={m.id} className="border-t border-gray-300 px-2 py-1.5 text-center text-emerald-700">{m.cualitativa ? '' : (t.ap || '')}</td>;
                  })}
                  <td className="border-t border-gray-300" />
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="sticky left-0 z-10 bg-slate-50 border-t border-r border-gray-300 px-2 py-1.5 text-xs" colSpan={2}>TOTAL APLAZADOS (IN)</td>
                  {datos.materias.map(m => {
                    const t = totales(sec, m);
                    return <td key={m.id} className="border-t border-gray-300 px-2 py-1.5 text-center text-red-600">{m.cualitativa ? '' : (t.re || '')}</td>;
                  })}
                  <td className="border-t border-gray-300" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {datos && (
        <p className="text-xs text-gray-500">
          Enter ↓ baja al próximo estudiante · Tab pasa a la siguiente materia · ← → se mueven entre materias ·
          se guarda al salir de la celda. Valores: <b>IN</b> = insuficiente (sigue aplazada) · <b>entero 1 a 20</b> = resultado
          de la revisión (si se escribe decimal, se redondea al entero) · <b>*</b> = aprobada sin revisión (derivado, como el
          Excel). Las celdas ámbar son materias reprobadas sin valor asentado. El pie trae TOTAL APROBADOS y TOTAL APLAZADOS
          por materia, como la sábana NR.
        </p>
      )}

      {!datos && !cargando && !grado && (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
          Elija el grado. Los resultados de revisión 2021-2022 se importan con el seed de revisión (ver LEEME).
        </div>
      )}
    </div>
  );
}
