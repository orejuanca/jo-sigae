'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

// ---------- Tipos ----------
interface ResAlumno {
  id: string; cedula: string; cedulaEscolar: string | null;
  apellidos: string; nombres: string; sexo: string | null; fechaNac: string | null;
  inscritoEn: string | null; inscritoEnLista: string[];
}
interface Insc {
  id: string; activo: boolean; matricula: string | null; numeroLista: string | null;
  condicion: string | null; sp: string | null; repitiente: boolean;
  materiaPend1: string | null; materiaPend2: string | null;
  ingEgr: string | null; obsBoletin: string | null;
  seccion: { grado: string; codigo: string; tipo: string };
  ano: { nombre: string };
}
interface Ficha {
  id: string; cedula: string; cedulaEscolar: string | null;
  apellidos: string; nombres: string; sexo: string | null; fechaNac: string | null;
  entidad: string | null; ef: string | null; estado: string | null; pais: string | null;
  localidad: string | null; direccion: string | null; telefono: string | null; correo: string | null;
  serial: string | null; te: string | null; obsHr: string | null; obsGenerales: string | null; eqv: string | null;
  repCedula: string | null; repNombre: string | null; repApellido: string | null; repAfinidad: string | null;
  plantelProc1: string | null; plantelProc2: string | null; plantelProc3: string | null;
  plantelProc4: string | null; plantelProc5: string | null;
  inscripciones: Insc[];
}

const CAMPOS: { k: keyof Ficha; l: string; seccion: string }[] = [
  { k: 'cedula', l: 'CÉDULA', seccion: 'id' },
  { k: 'cedulaEscolar', l: 'CÉDULA ESCOLAR', seccion: 'id' },
  { k: 'apellidos', l: 'APELLIDOS', seccion: 'id' },
  { k: 'nombres', l: 'NOMBRES', seccion: 'id' },
  { k: 'sexo', l: 'SEXO', seccion: 'id' },
  { k: 'fechaNac', l: 'FECHA DE NACIMIENTO', seccion: 'id' },
  { k: 'serial', l: 'SERIAL', seccion: 'id' },
  { k: 'eqv', l: 'EQV', seccion: 'id' },
  { k: 'te', l: 'TE', seccion: 'id' },
  { k: 'pais', l: 'PAÍS', seccion: 'ub' },
  { k: 'estado', l: 'ESTADO', seccion: 'ub' },
  { k: 'entidad', l: 'MUNICIPIO', seccion: 'ub' },
  { k: 'localidad', l: 'LOCALIDAD', seccion: 'ub' },
  { k: 'direccion', l: 'DIRECCIÓN', seccion: 'ub' },
  { k: 'telefono', l: 'TELÉFONO', seccion: 'ct' },
  { k: 'correo', l: 'CORREO', seccion: 'ct' },
  { k: 'repCedula', l: 'CÉDULA REPRESENTANTE', seccion: 'rep' },
  { k: 'repNombre', l: 'NOMBRE REPRESENTANTE', seccion: 'rep' },
  { k: 'repApellido', l: 'APELLIDO REPRESENTANTE', seccion: 'rep' },
  { k: 'repAfinidad', l: 'AFINIDAD', seccion: 'rep' },
  { k: 'plantelProc1', l: 'PLANTEL DE PROCEDENCIA 1', seccion: 'pr' },
  { k: 'plantelProc2', l: 'PLANTEL DE PROCEDENCIA 2', seccion: 'pr' },
  { k: 'plantelProc3', l: 'PLANTEL DE PROCEDENCIA 3', seccion: 'pr' },
  { k: 'plantelProc4', l: 'PLANTEL DE PROCEDENCIA 4', seccion: 'pr' },
  { k: 'plantelProc5', l: 'PLANTEL DE PROCEDENCIA 5', seccion: 'pr' },
  { k: 'obsGenerales', l: 'OBSERVACIONES GENERALES', seccion: 'ob' },
  { k: 'obsHr', l: 'OBSERVACIONES HR', seccion: 'ob' },
];

const SECCIONES_TITULO: Record<string, string> = {
  id: 'Identificación', ub: 'Ubicación', ct: 'Contacto',
  rep: 'Representante', pr: 'Procedencia', ob: 'Observaciones',
};

function edad(fecha: string | null): string {
  if (!fecha) return '';
  const f = new Date(fecha);
  if (isNaN(f.getTime())) return '';
  const hoy = new Date();
  let e = hoy.getFullYear() - f.getFullYear();
  const m = hoy.getMonth() - f.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) e--;
  return String(e);
}

export default function AlumnosFicha() {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<ResAlumno[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<Partial<Record<keyof Ficha, string>>>({});
  const [msg, setMsg] = useState('');

  // Arranque con ?q= (enlaces desde la nómina)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const qq = p.get('q');
    if (qq) setQ(qq);
  }, []);

  const buscar = useCallback((termino: string) => {
    const t = termino.trim();
    if (t.length < 3) { setResultados([]); return; }
    setBuscando(true);
    fetch(`/api/control-estudios/alumnos?q=${encodeURIComponent(t)}`)
      .then(r => r.json())
      .then(d => setResultados(d.alumnos ?? []))
      .catch(() => setResultados([]))
      .finally(() => setBuscando(false));
  }, []);

  // Debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => buscar(q), 350);
    return () => clearTimeout(t);
  }, [q, buscar]);

  const abrirFicha = (id: string) => {
    setMsg('');
    setEditando(false);
    fetch(`/api/control-estudios/alumnos/${id}`)
      .then(r => r.json())
      .then(d => { setFicha(d.alumno ?? null); if (!d.alumno) setMsg('No se pudo cargar la ficha.'); })
      .catch(() => setMsg('Error cargando la ficha.'));
  };

  const empezarEdicion = () => {
    if (!ficha) return;
    const b: Partial<Record<keyof Ficha, string>> = {};
    for (const c of CAMPOS) b[c.k] = (ficha[c.k] as string | null) ?? '';
    setBorrador(b);
    setEditando(true);
  };

  const guardar = () => {
    if (!ficha) return;
    setMsg('Guardando...');
    fetch(`/api/control-estudios/alumnos/${ficha.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(borrador),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setMsg('Ficha guardada.');
          setEditando(false);
          abrirFicha(ficha.id);
        } else setMsg('No se pudo guardar: ' + (d.error ?? ''));
      })
      .catch(() => setMsg('Error de red al guardar.'));
  };

  const historico = useMemo(
    () => ficha && (ficha.inscripciones ?? []).length === 0,
    [ficha],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Alumnos</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Ficha completa del alumno (todos los datos de la sábana) e inscripciones del año.
      </p>

      <div className="max-w-xl">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por cédula, cédula escolar, apellidos o nombres..."
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {buscando && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
      </div>

      {resultados.length > 0 && (
        <div className="mt-4 border rounded divide-y bg-white max-w-3xl">
          {resultados.map(a => (
            <button key={a.id} onClick={() => abrirFicha(a.id)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm">{a.cedula}</span>
              <span className="text-sm font-medium">{a.apellidos}, {a.nombres}</span>
              {a.inscritoEn ? (
                <span className="ml-auto rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-semibold">{a.inscritoEn}</span>
              ) : (
                <span className="ml-auto rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-xs font-semibold">HISTÓRICO (sin inscripción este año)</span>
              )}
            </button>
          ))}
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-blue-700">{msg}</p>}

      {ficha && (
        <div className="mt-6">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <h2 className="text-lg font-bold">
              {ficha.apellidos}, {ficha.nombres}
              <span className="ml-2 font-mono text-sm text-gray-500">{ficha.cedula}</span>
            </h2>
            {historico && (
              <span className="rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-xs font-semibold">HISTÓRICO</span>
            )}
            <div className="ml-auto flex gap-2">
              {!editando ? (
                <button onClick={empezarEdicion}
                  className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
                  EDITAR FICHA
                </button>
              ) : (
                <>
                  <button onClick={guardar}
                    className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                    GUARDAR
                  </button>
                  <button onClick={() => setEditando(false)}
                    className="rounded border px-4 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
                    CANCELAR
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(SECCIONES_TITULO).map(sec => {
              const campos = CAMPOS.filter(c => c.seccion === sec);
              const vacios = campos.every(c => !ficha[c.k] && (!editando || !borrador[c.k]));
              if (vacios && !editando) return null;
              return (
                <div key={sec} className="rounded-lg border bg-white p-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">{SECCIONES_TITULO[sec]}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {campos.map(c => (
                      <div key={c.k}>
                        <div className="text-[10px] font-semibold text-gray-400">{c.l}</div>
                        {!editando ? (
                          <div className="text-sm text-gray-800">
                            {c.k === 'fechaNac' && ficha.fechaNac
                              ? `${ficha.fechaNac}${edad(ficha.fechaNac) ? ` (${edad(ficha.fechaNac)} años)` : ''}`
                              : (ficha[c.k] as string | null) || '—'}
                          </div>
                        ) : (
                          <input
                            value={borrador[c.k] ?? ''}
                            onChange={e => setBorrador(b => ({ ...b, [c.k]: e.target.value }))}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border bg-white p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Inscripciones</h3>
            {(ficha.inscripciones ?? []).length === 0 && (
              <p className="text-sm text-gray-500">Este alumno no tiene inscripciones registradas (histórico de años anteriores).</p>
            )}
            {(ficha.inscripciones ?? []).length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="py-1 pr-3">AÑO</th><th className="py-1 pr-3">SECCIÓN</th>
                    <th className="py-1 pr-3">N°</th><th className="py-1 pr-3">CONDICIÓN</th>
                    <th className="py-1 pr-3">PENDIENTE</th><th className="py-1 pr-3">OBS. BOLETÍN</th>
                    <th className="py-1">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.inscripciones.map(i => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">{i.ano.nombre}</td>
                      <td className="py-1.5 pr-3 font-semibold">{i.seccion.grado}° {i.seccion.codigo}{i.seccion.codigo === 'MP' ? ' (Materia Pendiente)' : ''}</td>
                      <td className="py-1.5 pr-3">{i.numeroLista ?? i.matricula ?? '—'}</td>
                      <td className="py-1.5 pr-3">{i.condicion ?? '—'}{i.sp ? ` · SP:${i.sp}` : ''}</td>
                      <td className="py-1.5 pr-3">
                        {i.materiaPend1 || i.materiaPend2
                          ? [i.materiaPend1, i.materiaPend2].filter(Boolean).join(' · ')
                          : '—'}
                      </td>
                      <td className="py-1.5 pr-3">{i.obsBoletin ?? '—'}</td>
                      <td className="py-1.5">
                        {i.activo
                          ? <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-semibold">ACTIVO</span>
                          : <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">RETIRADO</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
