'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import RFFormato, { type DatosRF, type FilaRF } from '@/components/rf-formato';
import { TIPOS_EVAL, MESES_ANIO, SECCIONES_RF, GRADOS_RF, MAX_ALUMNOS_HOJA } from '@/lib/rf-formato';

// ==================== RF: RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL ====================
// Igual que el Excel del plantel: se selecciona a mano el TIPO DE EVALUACIÓN, el MES Y AÑO
// y la SECCIÓN (el grado no se selecciona porque hay un formato por grado); el botón
// PRIMERA HOJA trae los alumnos 01..35, SEGUNDA HOJA trae los restantes si la sección pasa
// de 35, y SIN CEDULA abre la planilla aparte de los alumnos sin cédula legal.

export default function RFPage() {
  const [grado, setGrado] = useState('5');
  const [sec, setSec] = useState('D');
  const [tipo, setTipo] = useState('FINAL');
  const [mes, setMes] = useState('JULIO - 2022');
  const [ano, setAno] = useState('');
  const [datos, setDatos] = useState<DatosRF | null>(null);
  const [vista, setVista] = useState<'CON' | 'SIN'>('CON');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/control-estudios/anios').then(r => r.json()).then(d => {
      if (d.activo) setAno(d.activo.nombre);
    }).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(`/api/control-estudios/rf?grado=${grado}&sec=${sec}&tipo=${encodeURIComponent(tipo)}&mes=${encodeURIComponent(mes)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'ERROR');
      setDatos(d);
      return true;
    } catch (e) {
      setDatos(null);
      setError(e instanceof Error ? e.message : 'ERROR');
      return false;
    } finally {
      setCargando(false);
    }
  }, [grado, sec, tipo, mes]);

  // PRIMERA HOJA: trae los alumnos de la selección y muestra los 01..35
  const primeraHoja = useCallback(async () => {
    if (await cargar()) { setVista('CON'); setPagina(1); }
  }, [cargar]);

  // SEGUNDA HOJA: si la sección pasó de 35, trae los restantes (36 en adelante)
  const segundaHoja = useCallback(async () => {
    if (!datos && !(await cargar())) return;
    setVista('CON');
    setPagina(2);
  }, [cargar, datos]);

  // SIN CEDULA: planilla aparte de los alumnos sin cédula legal (y volver)
  const sinCedulaHoja = useCallback(async () => {
    if (vista === 'SIN') { setVista('CON'); setPagina(1); return; }
    if (!datos && !(await cargar())) return;
    setVista('SIN');
    setPagina(1);
  }, [cargar, datos, vista]);

  const lista: FilaRF[] = useMemo(() => {
    if (!datos) return [];
    return vista === 'CON' ? datos.conCedula : datos.sinCedula;
  }, [datos, vista]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / MAX_ALUMNOS_HOJA));
  const filasPagina: FilaRF[] = useMemo(
    () => lista.slice((pagina - 1) * MAX_ALUMNOS_HOJA, pagina * MAX_ALUMNOS_HOJA),
    [lista, pagina]
  );

  const puedeConsultar = grado && sec && tipo && mes;

  return (
    <div>
      <style>{`
        @media print {
          @page { size: 8.5in 13in; margin: 0; }
          body * { visibility: hidden; }
          #rf-print-area, #rf-print-area * { visibility: visible !important; }
          #rf-print-area { position: absolute; left: 0; top: 0; }
          html, body { background: white !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL</h1>
            <p className="text-sm text-slate-500">Formato oficial EMG · Ministerio de Educación · Año escolar {ano || '—'}</p>
          </div>
          {datos && (
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded hover:bg-slate-700"
            >
              IMPRIMIR HOJA
            </button>
          )}
        </div>

        {/* Selección a mano, igual que el formato */}
        <div className="mt-4 bg-white border rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <label className="text-xs font-semibold text-slate-600 block">
            GRADO (FORMATO)
            <select value={grado} onChange={e => { setGrado(e.target.value); setDatos(null); }}
              className="mt-1 w-full border rounded px-2 py-2 text-sm">
              {GRADOS_RF.map(g => <option key={g} value={g}>{g}°</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 block">
            SECCIÓN
            <select value={sec} onChange={e => { setSec(e.target.value); setDatos(null); }}
              className="mt-1 w-full border rounded px-2 py-2 text-sm">
              {SECCIONES_RF.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 block md:col-span-2">
            TIPO DE EVALUACIÓN
            <select value={tipo} onChange={e => { setTipo(e.target.value); setDatos(null); }}
              className="mt-1 w-full border rounded px-2 py-2 text-sm">
              {TIPOS_EVAL.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 block">
            MES Y AÑO
            <select value={mes} onChange={e => { setMes(e.target.value); setDatos(null); }}
              className="mt-1 w-full border rounded px-2 py-2 text-sm">
              {MESES_ANIO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={primeraHoja}
            disabled={!puedeConsultar || cargando}
            className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {cargando ? 'CONSULTANDO…' : 'PRIMERA HOJA'}
          </button>
          <button
            onClick={segundaHoja}
            disabled={!puedeConsultar || cargando || (!!datos && vista === 'CON' && totalPaginas < 2)}
            className="px-4 py-2 bg-slate-200 text-slate-800 text-sm font-semibold rounded hover:bg-slate-300 disabled:opacity-40"
            title="Trae los alumnos restantes si la sección pasa de 35"
          >
            SEGUNDA HOJA
          </button>
          <button
            onClick={sinCedulaHoja}
            disabled={!puedeConsultar || cargando || (!!datos && vista === 'CON' && datos.sinCedula.length === 0)}
            className={`px-4 py-2 text-sm font-semibold rounded disabled:opacity-40 ${
              vista === 'SIN' ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
            }`}
          >
            {vista === 'SIN' ? 'VOLVER A CÉDULAS' : `SIN CEDULA${datos ? ` (${datos.sinCedula.length})` : ''}`}
          </button>
          {datos && (
            <span className="text-xs text-slate-500 ml-2">
              {vista === 'CON' ? 'PLANILLA CON CÉDULA LEGAL' : 'PLANILLA SIN CÉDULA'} · HOJA {pagina} DE {totalPaginas} ·{' '}
              ALUMNOS EN ESTA HOJA: {Math.min(filasPagina.length, MAX_ALUMNOS_HOJA)} · EN SECCIÓN: {datos.nPorSeccion} · S/C: {datos.sinCedula.length}
            </span>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {!datos && !error && (
          <p className="mt-3 text-sm text-slate-500">
            Selecciona grado, sección, tipo de evaluación y mes y año, y pulsa PRIMERA HOJA para traer los alumnos.
          </p>
        )}
      </div>

      {datos && (
        <div className="mt-5 overflow-x-auto">
          <RFFormato datos={datos} filas={filasPagina} />
        </div>
      )}
    </div>
  );
}
