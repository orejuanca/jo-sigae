'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ==================== BLOQUE 2: VISTA DE NOTAS ====================
// Regulares: pestañas [1er Lapso][2do Lapso][3er Lapso][Definitivas].
//   Solo se editan las notas de lapso; la definitiva es calculada (solo lectura),
//   igual que el Excel: un lapso "P" da final P; "NC" no cuenta para el promedio.
//   GRUPO: columna cualitativa del Excel (EXONERADO).
// MP: los 4 momentos ÚNICOS E INDEPENDIENTES (1M OCT, 2M DIC, 3M ENE, 4M JUN) con la
//   MISMA estructura que las regulares: una fila por estudiante y TODAS las materias
//   del grado en el orden del Excel; solo se editan las que debe, el resto de las
//   columnas lleva "*" (así está en la sábana "Materia Pendiente"). Al aprobar (>=10)
//   en cualquier momento, los siguientes se anulan con "*". "IN" = insuficiente.
//   Aplazada en 4M = queda MP para el próximo año.
// Listados ordenados por CÉDULA de menor a mayor (regla de la escuela).
// NOTAS ENTERAS: en el Excel original todas son enteras; lo decimal que traía el
//   import se redondea al entero que muestra la celda, y el promedio también.

type Materia = { id: string; codigo: string; nombre: string; cualitativa?: boolean };
type Estudiante = { inscripcionId: string; alumnoId: string; nombre: string; cedula: string; numeroLista: string | null };
type SeccionInfo = { id: string; codigo: string; tipo: string };
type PayloadRegular = {
  tipo: 'REGULAR'; ano: string; seccion: { id: string; grado: string; codigo: string };
  materias: Materia[]; estudiantes: Estudiante[]; notas: Record<string, string>; grupo: Record<string, string>;
};
type PayloadMp = {
  tipo: 'MP'; ano: string; seccion: { id: string; grado: string; codigo: string };
  etiquetasMomento: string[]; materias: Materia[];
  estudiantes: Estudiante[]; pendientes: Record<string, string[]>;
  momentos: Record<string, string>;
};
type PayloadU = {
  tipo: 'U'; ano: string; seccion: { id: string; grado: string; codigo: string };
  materias: Materia[]; estudiantes: Estudiante[];
  pendientes: Record<string, string[]>; notas: Record<string, string>;
};
type Datos = PayloadRegular | PayloadMp | PayloadU;

// En OC, PGCRP y GRUPO también se puede asentar "*" (aplazada): todas las opciones de la
// lista son válidas; lo que el usuario asienta se queda tal cual (regla del plantel: en el
// Resumen Final ninguna casilla de esas columnas queda en blanco).
const CUAL_LETRAS: Record<string, string[]> = {
  OC: ['A', 'B', 'C', 'D', 'EX', '*'],
  PGCRP: ['A', 'B', 'C', 'D', 'EX', '*'],
};
const GRUPO_OPCION = 'EXONERADO'; // valor usado en la planilla 2021-2022 (también vale "*")

// normaliza el valor de una celda ANTES de guardar: letras tal cual; números
// redondeados al ENTERO (en el Excel original todas las notas son enteras)
function entValor(v: string, cualitativa: boolean): string {
  const s = v.trim().toUpperCase().replace(',', '.');
  if (cualitativa || s === '') return s;
  const n = Number(s);
  return isFinite(n) ? String(Math.round(n)) : s;
}

// definitiva redondeada al ENTERO, igual que muestra la planilla del Excel
function fmtNota(n: number): string {
  return String(Math.round(n));
}

// el Excel muestra las notas menores a 10 con un cero adelante (01..09);
// el valor guardado sigue siendo el entero limpio (2 se muestra "02")
function conCero(v: string): string {
  return /^\d+$/.test(v) && Number(v) < 10 ? '0' + Number(v) : v;
}

export default function NotasPage() {
  const [grado, setGrado] = useState('');
  const [codigo, setCodigo] = useState('');
  const [secciones, setSecciones] = useState<SeccionInfo[]>([]);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [tab, setTab] = useState<number>(1); // 1|2|3 lapsos, 0 = definitivas
  const [valores, setValores] = useState<Record<string, string>>({});
  const [grupos, setGrupos] = useState<Record<string, string>>({});
  const [celdaEstado, setCeldaEstado] = useState<Record<string, string>>({}); // 'guardando' | 'ok' | error
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const refs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());
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

  // ----- carga de secciones y planilla -----
  useEffect(() => {
    if (!grado) { setSecciones([]); setCodigo(''); return; }
    fetch(`/api/control-estudios/notas?grado=${grado}`)
      .then(r => r.json())
      .then(d => setSecciones(d.secciones || []))
      .catch(() => setSecciones([]));
    setCodigo('');
    setDatos(null);
  }, [grado]);

  const cargarPlanilla = useCallback(async (g: string, c: string) => {
    if (!g || !c) { setDatos(null); return; }
    setCargando(true);
    setMensaje(null);
    cancelarTodos();
    try {
      const r = await fetch(`/api/control-estudios/notas?grado=${g}&seccion=${encodeURIComponent(c)}`);
      const d = await r.json();
      if (!r.ok) { setMensaje(d.error || 'ERROR_CARGA'); setDatos(null); return; }
      setDatos(d);
      setTab(1);
      const crudos = d.tipo === 'MP' ? { ...d.momentos } : { ...d.notas };
      // notas < 10 se muestran con cero adelante (01..09), como el Excel
      setValores(Object.fromEntries(Object.entries(crudos).map(([k, v]) => [k, conCero(String(v))])));
      setGrupos({ ...(d.grupo || {}) });
      setCeldaEstado({});
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarPlanilla(grado, codigo); }, [grado, codigo, cargarPlanilla]);

  // ----- guardado -----
  async function guardar(clave: string, body: Record<string, unknown>): Promise<{ ok: boolean; valor?: string }> {
    setCeldaEstado(e => ({ ...e, [clave]: 'guardando' }));
    try {
      const r = await fetch('/api/control-estudios/notas', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setCeldaEstado(e => ({ ...e, [clave]: d.error || 'ERROR_GUARDAR' }));
        setMensaje(d.error || 'ERROR_GUARDAR');
        return { ok: false };
      }
      setCeldaEstado(e => {
        const n = { ...e };
        delete n[clave];
        return n;
      });
      setMensaje(null);
      return { ok: true, valor: typeof d.valor === 'string' ? d.valor : undefined };
    } catch {
      setCeldaEstado(e => ({ ...e, [clave]: 'SIN_CONEXION' }));
      return { ok: false };
    }
  }

  function marcarOk(clave: string) {
    setCeldaEstado(e => ({ ...e, [clave]: 'ok' }));
    setTimeout(() => setCeldaEstado(e => {
      if (e[clave] === 'ok') { const n = { ...e }; delete n[clave]; return n; }
      return e;
    }), 1500);
  }

  async function guardarLapso(est: Estudiante, mat: Materia, lapso: number, valor: string) {
    const clave = `${est.inscripcionId}|${mat.id}|${lapso}`;
    const vacio = valor.trim() === '';
    // el API guarda el ENTERO (así es el Excel); la celda muestra el entero guardado
    const limpio = vacio ? '' : entValor(valor, mat.cualitativa ?? false);
    const res = await guardar(clave, {
      inscripcionId: est.inscripcionId, asignaturaId: mat.id, lapso,
      valor: vacio ? null : limpio,
    });
    if (res.ok) {
      setValores(v => {
        const n = { ...v };
        if (vacio) delete n[clave]; else n[clave] = conCero(res.valor ?? limpio);
        return n;
      });
      marcarOk(clave);
    }
  }

  // GRUPO: regular = por lapso (1-3). En MP la columna GRUPO va con "*" (nadie la debe)
  async function guardarGrupo(inscripcionId: string, lapso: number, valor: string, clave: string) {
    const vacio = valor.trim() === '';
    const res = await guardar(clave, {
      inscripcionId, grupo: true, lapso, valor: vacio ? null : valor,
    });
    if (res.ok) {
      setGrupos(g => {
        const n = { ...g };
        if (vacio) delete n[clave]; else n[clave] = (res.valor ?? valor).trim().toUpperCase();
        return n;
      });
      marcarOk(clave);
    }
  }

  async function guardarMomento(est: Estudiante, mat: Materia, momento: number, valor: string) {
    const clave = `${est.inscripcionId}|${mat.id}|${momento}`;
    const vacio = valor.trim() === '';
    const limpio = vacio ? '' : entValor(valor, false);
    const res = await guardar(clave, {
      inscripcionId: est.inscripcionId, asignaturaId: mat.id, momento,
      valor: vacio ? null : limpio,
    });
    if (res.ok) {
      setValores(v => {
        const n = { ...v };
        if (vacio) delete n[clave]; else n[clave] = conCero(res.valor ?? limpio);
        return n;
      });
      marcarOk(clave);
    }
  }

  // ----- derivados -----
  function nota(est: Estudiante, mat: Materia, lapso: number): string {
    return valores[`${est.inscripcionId}|${mat.id}|${lapso}`] || '';
  }

  function grupoDe(inscripcionId: string, lapso: number): string {
    return grupos[`${inscripcionId}|${lapso}`] || '';
  }

  // definitiva igual que el Excel: P se propaga, NC no cuenta, cualitativa
  // solo cuando el 3er lapso está asentado y las letras no se contradicen.
  // Numérica = promedio redondeado al ENTERO (la planilla muestra enteros).
  function definitiva(est: Estudiante, mat: Materia): string {
    const vs = [nota(est, mat, 1), nota(est, mat, 2), nota(est, mat, 3)];
    if (vs.some(v => !v)) return '';
    if (mat.cualitativa) {
      return new Set(vs).size === 1 ? vs[0] : '?';
    }
    if (vs.includes('P')) return 'P';
    const nums = vs.map(Number).filter(n => isFinite(n)); // NC u otros textos no promedian
    if (nums.length === 0) return '';
    return conCero(fmtNota(nums.reduce((a, b) => a + b, 0) / nums.length));
  }

  function definitivaGrupo(est: Estudiante): string {
    const vs = [grupoDe(est.inscripcionId, 1), grupoDe(est.inscripcionId, 2), grupoDe(est.inscripcionId, 3)];
    if (vs.some(v => !v)) return '';
    return new Set(vs).size === 1 ? vs[0] : '?';
  }

  function faltan(mat: Materia, lapso: number): number {
    if (!datos || datos.tipo !== 'REGULAR') return 0;
    return datos.estudiantes.filter(e => !nota(e, mat, lapso)).length;
  }

  function faltanGrupo(lapso: number): number {
    if (!datos || datos.tipo !== 'REGULAR') return 0;
    return datos.estudiantes.filter(e => !grupoDe(e.inscripcionId, lapso)).length;
  }

  // ----- derivados MP (una fila por estudiante; solo las materias que debe se editan) -----
  function valorMp(inscripcionId: string, materiaId: string, momento: number): string {
    return valores[`${inscripcionId}|${materiaId}|${momento}`] || '';
  }

  function esPendienteMp(inscripcionId: string, materiaId: string): boolean {
    return !!mp && (mp.pendientes[inscripcionId] || []).includes(materiaId);
  }
  void esPendienteMp;

  // estado de UNA materia pendiente (derivado, nunca guardado)
  function estadoMp(inscripcionId: string, materiaId: string): { texto: string; clase: string } {
    const vals = [1, 2, 3, 4].map(m => valorMp(inscripcionId, materiaId, m));
    const aprob = vals.findIndex(v => v !== '' && v !== 'IN' && Number(v) >= 10);
    if (aprob >= 0) return { texto: `APROBADA ${aprob + 1}M · ${vals[aprob]}`, clase: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (vals[3]) return { texto: 'APLAZADA → QUEDA MP', clase: 'bg-red-100 text-red-800 border-red-300' };
    if (vals.some(v => v)) return { texto: 'EN PROCESO', clase: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { texto: 'SIN ASENTAR', clase: 'bg-gray-100 text-gray-500 border-gray-300' };
  }

  // * derivado: la materia ya se aprobó en un momento anterior
  function anuladoMp(inscripcionId: string, materiaId: string, momento: number): boolean {
    for (let m = 1; m < momento; m++) {
      const v = valorMp(inscripcionId, materiaId, m);
      if (v !== '' && v !== 'IN' && Number(v) >= 10) return true;
    }
    return false;
  }

  // el momento es editable si es el primero sin asentar (o corrección de uno ya asentado)
  function editableMp(inscripcionId: string, materiaId: string, momento: number): boolean {
    if (anuladoMp(inscripcionId, materiaId, momento)) return false;
    for (let m = 1; m < momento; m++) {
      if (!valorMp(inscripcionId, materiaId, m)) {
        // hay un hueco antes: solo editable si este momento ya tiene valor
        return !!valorMp(inscripcionId, materiaId, momento);
      }
    }
    return true;
  }

  // faltan por materia en el momento: entre los que LA DEBEN, cuántos no tienen
  // nota asentada (los ya aprobados se anulan con * y no cuentan). null = nadie la debe
  function faltanMp(mat: Materia, momento: number): number | null {
    if (!mp) return null;
    const deudores = mp.estudiantes.filter(e => (mp.pendientes[e.inscripcionId] || []).includes(mat.id));
    if (deudores.length === 0) return null;
    return deudores.filter(e => !anuladoMp(e.inscripcionId, mat.id, momento) && !valorMp(e.inscripcionId, mat.id, momento)).length;
  }

  // ----- navegación con teclado (estilo planilla) -----
  function registrar(i: number, j: number) {
    return (el: HTMLInputElement | HTMLSelectElement | null) => {
      if (el) refs.current.set(`${i}-${j}`, el); else refs.current.delete(`${i}-${j}`);
    };
  }

  function teclaCelda(e: React.KeyboardEvent, i: number, j: number, di = 0, dj = 0) {
    const inp = e.currentTarget as HTMLInputElement;
    let destino: { di: number; dj: number } | null = null;
    if (e.key === 'Enter' || e.key === 'ArrowDown') destino = { di: 1, dj: 0 };
    else if (e.key === 'ArrowUp') destino = { di: -1, dj: 0 };
    else if (e.key === 'ArrowRight' && (inp instanceof HTMLSelectElement || (inp.selectionStart === inp.value.length && inp.selectionEnd === inp.value.length))) destino = { di, dj: 1 };
    else if (e.key === 'ArrowLeft' && (inp instanceof HTMLSelectElement || (inp.selectionStart === 0 && inp.selectionEnd === 0))) destino = { di, dj: -1 };
    if (!destino) return;
    e.preventDefault();
    // blur SIEMPRE antes de mover: dispara el autoguardado aunque la celda
    // de destino no exista o no sea editable (sin notas fantasma en pantalla)
    inp.blur();
    const el = refs.current.get(`${i + destino.di}-${j + destino.dj}`);
    if (el) { el.focus(); (el as HTMLInputElement).select?.(); }
  }

  const claseCelda = (clave: string) => {
    const st = celdaEstado[clave];
    if (st === 'guardando') return 'border-b-2 border-amber-400 bg-amber-50';
    if (st === 'ok') return 'border-b-2 border-emerald-400';
    if (st) return 'border-2 border-red-400 bg-red-50';
    return '';
  };

  const regs = useMemo(() => (datos && datos.tipo === 'REGULAR' ? datos : null), [datos]);
  const mp = useMemo(() => (datos && datos.tipo === 'MP' ? datos : null), [datos]);
  const u = useMemo(() => (datos && datos.tipo === 'U' ? datos : null), [datos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">NOTAS</h1>
        <p className="text-sm text-gray-500 mt-1">
          Regulares: solo se editan las notas de lapso — la definitiva la calcula el sistema (como el Excel: un lapso P da final P, NC no promedia). Todo en ENTEROS, como el Excel original; las notas menores a 10 se muestran con cero adelante (01..09).
          MP: misma planilla pero se selecciona el MOMENTO (1M octubre, 2M diciembre, 3M enero, 4M junio) — solo se escriben las materias que debe; las demás columnas llevan *. Los alumnos trasladados que venían aplazadas: los momentos que no cursaron aquí se rellenan con *.
          U: régimen de equivalencia (casos especiales de presentación, ej: venidos de planteles técnicos).
          Listados por cédula de menor a mayor.
        </p>
      </div>

      {/* ----- selectores ----- */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-4">
        <label className="text-sm font-semibold text-gray-700">GRADO</label>
        <select value={grado} onChange={e => setGrado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">-- elija --</option>
          {['1', '2', '3', '4', '5'].map(g => <option key={g} value={g}>{g}°</option>)}
        </select>
        <label className="text-sm font-semibold text-gray-700">SECCIÓN</label>
        <select value={codigo} onChange={e => setCodigo(e.target.value)} disabled={!grado}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100">
          <option value="">-- elija --</option>
          {secciones.map(s => (
            <option key={s.id} value={s.codigo}>
              {grado}° {s.codigo === 'MP' ? 'MP (materias pendientes)' : s.codigo === 'U' ? 'U (régimen de equivalencia)' : s.codigo}
            </option>
          ))}
        </select>
        {datos && (
          <span className="ml-auto flex items-center gap-2 text-sm">
            <span className={`px-2 py-1 rounded font-semibold text-xs ${datos.tipo === 'MP' ? 'bg-purple-100 text-purple-800' : datos.tipo === 'U' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
              {datos.tipo === 'MP' ? 'MATERIAS PENDIENTES' : datos.tipo === 'U' ? 'RÉGIMEN DE EQUIVALENCIA' : 'SECCIÓN REGULAR'}
            </span>
            <span className="text-gray-500">AÑO {datos.ano}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">
              {datos.tipo === 'MP'
                ? `${mp?.estudiantes.length ?? 0} estudiantes · ${mp ? Object.values(mp.pendientes).reduce((a, b) => a + b.length, 0) : 0} pendientes`
                : datos.tipo === 'U'
                  ? `${u?.estudiantes.length ?? 0} presentación(es) · ${u ? Object.values(u.pendientes).reduce((a, b) => a + b.length, 0) : 0} pendientes`
                  : `${regs?.estudiantes.length} estudiantes · ${regs?.materias.length} materias + grupo`}
            </span>
          </span>
        )}
      </div>

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
          {mensaje.replace(/_/g, ' ')}
        </div>
      )}

      {cargando && <div className="text-sm text-gray-500">Cargando planilla…</div>}

      {/* ==================== REGULAR ==================== */}
      {regs && (regs.estudiantes.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500">Sin estudiantes inscritos en esta sección.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 0].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg border transition-colors ${
                  tab === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-gray-300 hover:bg-gray-50'
                }`}>
                {t === 0 ? 'DEFINITIVAS (solo lectura)' : t === 1 ? '1ER LAPSO' : t === 2 ? '2DO LAPSO' : '3ER LAPSO'}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-auto max-h-[70vh]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="sticky left-0 top-0 z-30 bg-slate-100 border-b border-r border-gray-300 px-2 py-2 text-left min-w-[118px]">CÉDULA</th>
                  <th className="sticky top-0 z-20 bg-slate-100 border-b border-r border-gray-300 px-2 py-2 text-left min-w-[240px]">ESTUDIANTE</th>
                  {regs.materias.map(m => (
                    <th key={m.id} className="sticky top-0 z-20 bg-slate-100 border-b border-gray-300 px-2 py-2 min-w-[72px]">
                      <div className="font-bold">{m.codigo}</div>
                      <div className="font-normal text-[10px] text-gray-500 max-w-[90px] truncate" title={m.nombre}>{m.nombre}</div>
                      {tab !== 0 && (() => {
                        const f = faltan(m, tab);
                        return <div className={`text-[10px] font-semibold ${f === 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{f === 0 ? 'completo' : `faltan ${f}`}</div>;
                      })()}
                    </th>
                  ))}
                  <th className="sticky top-0 z-20 bg-slate-100 border-b border-gray-300 px-2 py-2 min-w-[96px]">
                    <div className="font-bold">GRUPO</div>
                    {tab !== 0 && (() => {
                      const f = faltanGrupo(tab);
                      return <div className={`text-[10px] font-semibold ${f === 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{f === 0 ? 'completo' : `faltan ${f}`}</div>;
                    })()}
                  </th>
                </tr>
              </thead>
              <tbody>
                {regs.estudiantes.map((est, i) => (
                  <tr key={est.inscripcionId} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-2 py-1.5 font-mono text-xs whitespace-nowrap">
                      {est.cedula}
                    </td>
                    <td className="border-b border-r border-gray-200 px-2 py-1.5 whitespace-nowrap font-medium">
                      {est.nombre}
                    </td>
                    {regs.materias.map((m, j) => {
                      const clave = `${est.inscripcionId}|${m.id}|${tab}`;
                      if (tab === 0) {
                        return (
                          <td key={m.id} className="border-b border-gray-200 px-2 py-1.5 text-center">
                            <span className="font-semibold text-slate-700">{definitiva(est, m) || <span className="text-gray-300">—</span>}</span>
                          </td>
                        );
                      }
                      if (m.cualitativa) {
                        const letras = CUAL_LETRAS[m.codigo] || ['A', 'B', 'C', 'D', 'EX'];
                        return (
                          <td key={m.id} className={`border-b border-gray-200 px-1 py-1 text-center ${claseCelda(clave)}`}>
                            <select ref={registrar(i, j)} value={nota(est, m, tab)}
                              onChange={e => guardarLapso(est, m, tab, e.target.value)}
                              className="w-14 text-center bg-transparent outline-none">
                              <option value=""></option>
                              {letras.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </td>
                        );
                      }
                      return (
                        <td key={m.id} className={`border-b border-gray-200 px-1 py-1 text-center ${claseCelda(clave)}`}>
                          <input ref={registrar(i, j)} type="text" inputMode="decimal"
                            value={nota(est, m, tab)}
                            onChange={e => {
                              const v = e.target.value;
                              setValores(vv => ({ ...vv, [`${est.inscripcionId}|${m.id}|${tab}`]: v }));
                              programar(`${est.inscripcionId}|${m.id}|${tab}`, () => guardarLapso(est, m, tab, v));
                            }}
                            onBlur={e => {
                              cancelar(`${est.inscripcionId}|${m.id}|${tab}`);
                              guardarLapso(est, m, tab, e.target.value);
                            }}
                            onKeyDown={e => teclaCelda(e, i, j, 0, 1)}
                            className="w-14 text-center outline-none focus:bg-sky-50 focus:ring-1 focus:ring-sky-400 rounded"
                            title={`${est.nombre} · ${m.nombre} · ${tab}er/2do/3er lapso (entero 1-20, NC o P)`} />
                        </td>
                      );
                    })}
                    {(() => {
                      const jg = regs.materias.length;
                      if (tab === 0) {
                        return (
                          <td className="border-b border-gray-200 px-2 py-1.5 text-center">
                            <span className="font-semibold text-slate-700">{definitivaGrupo(est) || <span className="text-gray-300">—</span>}</span>
                          </td>
                        );
                      }
                      const claveG = `${est.inscripcionId}|${tab}`;
                      return (
                        <td className={`border-b border-gray-200 px-1 py-1 text-center ${claseCelda(claveG)}`}>
                          <select ref={registrar(i, jg)} value={grupoDe(est.inscripcionId, tab)}
                            onChange={e => guardarGrupo(est.inscripcionId, tab, e.target.value, claveG)}
                            onKeyDown={e => teclaCelda(e, i, jg, 0, 1)}
                            className="w-24 text-center bg-transparent outline-none text-xs"
                            title={`${est.nombre} · GRUPO · ${tab}er/2do/3er lapso`}>
                            <option value=""></option>
                            <option value={GRUPO_OPCION}>{GRUPO_OPCION}</option>
                            <option value="*">*</option>
                          </select>
                        </td>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Enter ↓ baja al próximo estudiante · Tab pasa a la siguiente materia · ← → se mueven entre materias · celda vacía = pendiente · se guarda al salir de la celda.
            Notas ENTERAS (1 a 20) como el Excel original — si se escribe decimal, se redondea al entero. Códigos del Excel: NC (no cursante) y P (pendiente). En OC, PGCRP y GRUPO también se puede asentar * (aplazada): lo que se asienta se queda tal cual; GRUPO se llena con EXONERADO (el valor de la planilla) o con *.
            {tab === 0 && ' · Definitivas: promedio de los 3 lapsos redondeado al entero, igual que la planilla; si un lapso es P el final es P; NC no promedia; en letras se muestran cuando coinciden.'}
          </p>
        </div>
      ))}

      {/* ==================== U: RÉGIMEN DE EQUIVALENCIA (planilla de lapsos) ==================== */}
      {u && (u.estudiantes.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500">Sin presentaciones inscritas en esta sección U.</div>
      ) : (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-2">
            RÉGIMEN DE EQUIVALENCIA: casos especiales de presentación (ej: alumnos venidos de planteles técnicos con materias por equivalencia).
            El alumno cursa su grado regular con UNA sola matrícula y por la U presenta únicamente la materia pendiente (la marcada con EQV en su ficha).
            Solo esa materia es editable; las demás columnas llevan * como en la sábana "Notas de Lapso y Definitivas {grado}° U" del Excel.
          </div>
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 0].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg border transition-colors ${
                  tab === t ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-slate-600 border-gray-300 hover:bg-gray-50'
                }`}>
                {t === 0 ? 'DEFINITIVAS (solo lectura)' : t === 1 ? '1ER LAPSO' : t === 2 ? '2DO LAPSO' : '3ER LAPSO'}
              </button>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-auto max-h-[70vh]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-amber-50">
                  <th className="sticky left-0 top-0 z-30 bg-amber-50 border-b border-r border-gray-300 px-2 py-2 text-left min-w-[118px]">CÉDULA</th>
                  <th className="sticky top-0 z-20 bg-amber-50 border-b border-r border-gray-300 px-2 py-2 text-left min-w-[240px]">ESTUDIANTE</th>
                  {u.materias.map(m => (
                    <th key={m.id} className="sticky top-0 z-20 bg-amber-50 border-b border-gray-300 px-2 py-2 min-w-[72px]">
                      <div className="font-bold">{m.codigo}</div>
                      <div className="font-normal text-[10px] text-gray-500 max-w-[90px] truncate" title={m.nombre}>{m.nombre}</div>
                    </th>
                  ))}
                  <th className="sticky top-0 z-20 bg-amber-50 border-b border-gray-300 px-2 py-2 min-w-[72px]">
                    <div className="font-bold">GRUPO</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {u.estudiantes.map((est, i) => {
                  const pendU = u.pendientes[est.inscripcionId] || [];
                  return (
                    <tr key={est.inscripcionId} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-2 py-1.5 font-mono text-xs whitespace-nowrap">
                        {est.cedula}
                      </td>
                      <td className="border-b border-r border-gray-200 px-2 py-1.5 whitespace-nowrap font-medium">
                        {est.nombre}
                      </td>
                      {u.materias.map((m, j) => {
                        const clave = `${est.inscripcionId}|${m.id}|${tab}`;
                        if (tab === 0) {
                          return (
                            <td key={m.id} className="border-b border-gray-200 px-2 py-1.5 text-center">
                              <span className="font-semibold text-slate-700">{definitiva(est, m) || <span className="text-gray-300">—</span>}</span>
                            </td>
                          );
                        }
                        if (!pendU.includes(m.id)) {
                          return <td key={m.id} className="border-b border-gray-200 px-2 py-1 text-center text-gray-400 font-bold" title="No la cursa por la U: lleva * como en la sábana del Excel">*</td>;
                        }
                        if (m.cualitativa) {
                          const letras = CUAL_LETRAS[m.codigo] || ['A', 'B', 'C', 'D', 'EX'];
                          return (
                            <td key={m.id} className={`border-b border-gray-200 px-1 py-1 text-center ${claseCelda(clave)}`}>
                              <select ref={registrar(i, j)} value={nota(est, m, tab)}
                                onChange={e => guardarLapso(est, m, tab, e.target.value)}
                                className="w-14 text-center bg-transparent outline-none">
                                <option value=""></option>
                                {letras.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </td>
                          );
                        }
                        return (
                          <td key={m.id} className={`border-b border-gray-200 px-1 py-1 text-center ${claseCelda(clave)}`}>
                            <input ref={registrar(i, j)} type="text" inputMode="decimal"
                              value={nota(est, m, tab)}
                              onChange={e => {
                                const v = e.target.value;
                                setValores(vv => ({ ...vv, [clave]: v }));
                                programar(clave, () => guardarLapso(est, m, tab, v));
                              }}
                              onBlur={e => {
                                cancelar(clave);
                                guardarLapso(est, m, tab, e.target.value);
                              }}
                              onKeyDown={e => teclaCelda(e, i, j, 0, 1)}
                              className={`w-14 text-center outline-none focus:bg-sky-50 focus:ring-1 focus:ring-sky-400 rounded ${/^0/.test(nota(est, m, tab)) ? 'text-slate-700' : ''}`}
                              title={`${est.nombre} · ${m.nombre} · materia presentada por equivalencia (entero 1-20, NC o P)`} />
                          </td>
                        );
                      })}
                      <td className="border-b border-gray-200 px-2 py-1 text-center text-gray-400 font-bold" title="En la U la columna GRUPO va con * (como en el Excel)">*</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Planilla de lapsos igual que las regulares (enteros 1-20, definitiva calculada al entero, notas &lt; 10 con cero adelante).
            El dato viene del bloque "Notas de Lapso y Definitivas {grado}° U" del Excel. La U NO es una segunda inscripción: el alumno está inscrito una sola vez en su grado regular.
          </p>
        </div>
      ))}

      {/* ==================== MP: como las regulares, se selecciona el MOMENTO ==================== */}
      {mp && (mp.estudiantes.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500">Sin materias pendientes inscritas en esta sección MP.</div>
      ) : (
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-200 text-purple-800 text-xs rounded-lg px-4 py-2">
            Misma planilla que las secciones regulares: una fila por estudiante y todas las materias del grado en el orden del Excel.
            Solo se editan las materias que cada quien debe (hasta 2, en su misma fila); todas las demás columnas llevan * como en la sábana del Excel.
            Los 4 momentos se asientan en orden: nota entera ≥ 10 APRUEBA y los momentos siguientes se anulan con *. "IN" = INASISTENTE (estaba presentando y faltó).
            El alumno trasladado que venía aplazada de otro plantel: los momentos que no cursó aquí se rellenan con * y a partir del momento en que se presenta van notas o IN.
            Si queda aplazada en 4M (junio), le queda la MP para el próximo año escolar.
          </div>
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 4].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg border transition-colors ${
                  tab === t ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-slate-600 border-gray-300 hover:bg-gray-50'
                }`}>
                {mp.etiquetasMomento[t - 1]}
              </button>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-auto max-h-[70vh]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-purple-50">
                  <th className="sticky left-0 top-0 z-30 bg-purple-50 border-b border-r border-gray-300 px-2 py-2 text-left min-w-[118px]">CÉDULA</th>
                  <th className="sticky top-0 z-20 bg-purple-50 border-b border-r border-gray-300 px-2 py-2 text-left min-w-[220px]">ESTUDIANTE</th>
                  {mp.materias.map(m => (
                    <th key={m.id} className="sticky top-0 z-20 bg-purple-50 border-b border-gray-300 px-2 py-2 min-w-[72px]">
                      <div className="font-bold">{m.codigo}</div>
                      <div className="font-normal text-[10px] text-gray-500 max-w-[90px] truncate" title={m.nombre}>{m.nombre}</div>
                      {(() => {
                        const f = faltanMp(m, tab);
                        if (f === null) return null;
                        return <div className={`text-[10px] font-semibold ${f === 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{f === 0 ? 'completo' : `faltan ${f}`}</div>;
                      })()}
                    </th>
                  ))}
                  <th className="sticky top-0 z-20 bg-purple-50 border-b border-gray-300 px-2 py-2 min-w-[72px]">
                    <div className="font-bold">GRUPO</div>
                  </th>
                  <th className="sticky top-0 z-20 bg-purple-50 border-b border-gray-300 px-3 py-2 text-left min-w-[150px]">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {mp.estudiantes.map((est, i) => {
                  const pend = mp.pendientes[est.inscripcionId] || [];
                  return (
                    <tr key={est.inscripcionId} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-2 py-1.5 font-mono text-xs whitespace-nowrap">
                        {est.cedula}
                      </td>
                      <td className="border-b border-r border-gray-200 px-2 py-1.5 whitespace-nowrap font-medium">
                        {est.nombre}
                      </td>
                      {mp.materias.map((m, j) => {
                        const clave = `${est.inscripcionId}|${m.id}|${tab}`;
                        if (!pend.includes(m.id)) {
                          return <td key={m.id} className="border-b border-gray-200 px-2 py-1 text-center text-gray-400 font-bold" title="No la debe: lleva * en todos los momentos, como en el Excel">*</td>;
                        }
                        if (anuladoMp(est.inscripcionId, m.id, tab)) {
                          return <td key={m.id} className="border-b border-gray-200 px-2 py-1 text-center text-gray-400 font-bold" title="Aprobó en un momento anterior: momento anulado con *">*</td>;
                        }
                        if (!editableMp(est.inscripcionId, m.id, tab)) {
                          return <td key={m.id} className="border-b border-gray-200 px-2 py-1 text-center text-gray-200">·</td>;
                        }
                        return (
                          <td key={m.id} className={`border-b border-gray-200 px-1 py-1 text-center ${claseCelda(clave)}`}>
                            <input ref={registrar(i, j)} type="text" inputMode="numeric"
                              value={valorMp(est.inscripcionId, m.id, tab)}
                              onChange={e => {
                                const v = e.target.value.toUpperCase();
                                setValores(vv => ({ ...vv, [clave]: v }));
                                programar(clave, () => guardarMomento(est, m, tab, v));
                              }}
                              onBlur={e => {
                                cancelar(clave);
                                guardarMomento(est, m, tab, e.target.value);
                              }}
                              onKeyDown={e => teclaCelda(e, i, j, 0, 1)}
                              className={`w-14 text-center outline-none focus:bg-sky-50 focus:ring-1 focus:ring-sky-400 rounded ${valorMp(est.inscripcionId, m.id, tab) === '*' ? 'font-bold text-gray-400' : ''}`}
                              title={`${est.nombre} · ${m.nombre} · ${mp.etiquetasMomento[tab - 1]}: entero ≥ 10 aprueba · IN = inasistente · * = venía aplazada (no presentó aquí)`} />
                          </td>
                        );
                      })}
                      <td className="border-b border-gray-200 px-2 py-1 text-center text-gray-400 font-bold" title="En MP la columna GRUPO va con * (nadie la debe)">*</td>
                      <td className="border-b border-gray-200 px-3 py-1.5">
                        {pend.length === 0 ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          <div className="space-y-1">
                            {pend.map(id => {
                              const mat = mp.materias.find(x => x.id === id);
                              if (!mat) return null;
                              const e2 = estadoMp(est.inscripcionId, mat.id);
                              return (
                                <div key={id} className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-gray-500 w-8 text-right shrink-0">{mat.codigo}</span>
                                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${e2.clase}`}>{e2.texto}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Seleccione el MOMENTO (1M octubre → 4M junio) · se asienta en orden: los momentos anteriores deben estar llenos (nota, IN o *) · nota entera ≥ 10 aprueba y anula los siguientes con * · "IN" = INASISTENTE (estaba presentando y faltó) · "*" = venía aplazada de otro plantel, no presentó ese momento aquí (solo va en los momentos ANTERIORES al primero que se asienta) · se guarda al salir de la celda
          </p>
        </div>
      ))}

      {!datos && !cargando && grado && codigo === '' && (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500">Elija una sección para ver la planilla.</div>
      )}
      {!datos && !cargando && !grado && (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
          Elija el grado y la sección. Las notas históricas 2021-2022 se importan con el seed de notas (ver LEEME).
        </div>
      )}
    </div>
  );
}
