'use client';

// ==================== RÉPLICA CELDA-A-CELDA DEL FORMATO EMG (v13) ====================
// "Resumen Final del Rendimiento Estudiantil" — Código del Formato: EMG.
// El dibujo completo (TODAS las líneas reales, el logo del Ministerio, los textos
// VERTICALES, las divisiones de palabra y la geometría px de las 66-69 columnas y
// 77-80 filas) sale de las rejillas generadas VERBATIM de las hojas "RF 1°".."RF 5°"
// del Excel del plantel (src/lib/rf/rejilla-N.json, generadas por scripts/generar_rejilla_rf.py).
// v13: SIN líneas fantasma (bordes internos de celdas combinadas que Excel no dibuja,
// filtrados por merges en el generador) + título subrayado + código 31059 del bloque VI
// + marco completo visible (V derecha de fila 1 a la última).
// Reglas aplicadas en las rejillas: ORTOGRAFÍA CORRECTA primero (las erratas del original
// no se replican) y columna de CÉDULA reducida (B..M: 138px -> 111px; 'V12345678900'
// queda completo y holgado).
// La DATA (alumnos, notas, totales, profesores, observaciones) se inyecta sobre las
// ANCLAS dinámicas de la rejilla; el módulo NO agrega data (regla del proyecto).

import { MAX_ALUMNOS_HOJA, pad2 } from '@/lib/rf-formato';
import type { CSSProperties } from 'react';
import rj1 from '@/lib/rf/rejilla-1.json';
import rj2 from '@/lib/rf/rejilla-2.json';
import rj3 from '@/lib/rf/rejilla-3.json';
import rj4 from '@/lib/rf/rejilla-4.json';
import rj5 from '@/lib/rf/rejilla-5.json';

export type ValorRF = number | string;
export type FilaRF = {
  cedula: string; apellidos: string; nombres: string; lugar: string;
  ef: string; sexo: string; dia: string; mesNac: string; anio: string;
  notas: Record<string, ValorRF>; grupo: string;
};
export type AreaRF = { codigo: string; nombre: string; letras: boolean; etiquetaV?: string };
export type DatosRF = {
  ano: string; grado: string; sec: string; secDisplay: string; tipo: string; mes: string;
  areas: AreaRF[];
  institucion: { codigo: string; denominacion: string; direccion: string; telefono: string; municipio: string; entidadFederal: string; director: string; cedulaDirector: string };
  curso: { planEstudio: string; codigo: string; anioCursado: string; seccion: string };
  observaciones: { linea1: string; linea2: string };
  conCedula: FilaRF[]; sinCedula: FilaRF[];
  profesores: { area: string; nombre: string | null; cedula: string | null }[];
  nPorSeccion: number;
};

// ---- rejillas por grado (dibujo verbatim del Excel) ----
export type RectJ = { x: number; y: number; w: number; h: number; ah?: string; av?: string; pt?: number; b?: boolean | number };
type CeldaJ = { x: number; y: number; w: number; h: number; t: string; pt: number; b: boolean; rot: number; wrap: boolean; ah: string; av: string; u?: number };
type RejillaJ = {
  grado: string; K: number; W: number; H: number;
  colW: number[]; rowH: number[];
  lineas: { H: number[][]; V: number[][] };
  logo: RectJ;
  celdas: CeldaJ[];
  din: {
    colNota: number[]; colGrupo: number; asterFila: number | null;
    starPie: RectJ | null;
    pie: { c: number; filas: RectJ[] }[];
    prof: { u: RectJ; aj: RectJ; av: RectJ; fila: number }[];
    alumnos: { ced: RectJ; ape: RectJ; nom: RectJ; lug: RectJ; ef: RectJ; sexo: RectJ; dia: RectJ; mesN: RectJ; anio: RectJ; notas: RectJ[]; grupo: RectJ }[];
    etq: Record<string, RectJ>;
  };
};
const REJILLAS: Record<string, RejillaJ> = {
  '1': rj1 as unknown as RejillaJ, '2': rj2 as unknown as RejillaJ, '3': rj3 as unknown as RejillaJ,
  '4': rj4 as unknown as RejillaJ, '5': rj5 as unknown as RejillaJ,
};

// la celda de nota se muestra igual que el Excel (formato "00"): entero con 2 dígitos
function mostrarNota(v: ValorRF): string {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') return pad2(Math.round(v));
  return String(v);
}
function esNumerico(v: ValorRF): boolean {
  if (typeof v === 'number') return true;
  return v !== '' && isFinite(Number(v));
}

// ---- pie de totales por área: fórmulas oficiales del formato ----
function statsDeArea(filas: (FilaRF | null)[], codigo: string, letras: boolean) {
  const vs = filas.map(f => (f ? f.notas[codigo] : '') ?? '').filter(v => v !== '');
  if (letras) {
    const es = (v: ValorRF, l: string[]) => l.includes(String(v));
    return {
      inscritos: vs.filter(v => es(v, ['A', 'B', 'C', 'D', 'P'])).length,
      inasistentes: vs.filter(v => v === 'IN').length,
      aprobados: vs.filter(v => es(v, ['A', 'B', 'C', 'D'])).length,
      noAprobados: vs.filter(v => v === 'P').length,
      noCursantes: vs.filter(v => v === 'NC').length,
    };
  }
  const num = vs.filter(esNumerico).map(Number);
  return {
    inscritos: num.length + vs.filter(v => v === 'IN' || v === 'P').length,
    inasistentes: vs.filter(v => v === 'IN').length,
    aprobados: num.filter(n => n >= 9.5).length,
    noAprobados: num.filter(n => n <= 9.49).length + vs.filter(v => v === 'P').length,
    noCursantes: vs.filter(v => v === 'NC').length,
  };
}

const px = (pt: number) => pt * 4 / 3;
const AH: Record<string, CSSProperties['justifyContent']> = { left: 'flex-start', center: 'center', right: 'flex-end', justify: 'space-between' };
const AV: Record<string, CSSProperties['alignItems']> = { top: 'flex-start', center: 'center', bottom: 'flex-end', distributed: 'space-between' };

function Caja({ r, texto, pt, b, rot, wrap, u }: { r: RectJ; texto: string; pt?: number; b?: boolean; rot?: number; wrap?: boolean; u?: boolean }) {
  const st: CSSProperties = {
    position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h,
    display: 'flex', alignItems: AV[r.av || 'center'] || 'center', justifyContent: AH[r.ah || 'left'] || 'flex-start',
    padding: '0 2px', overflow: 'hidden',
    fontSize: px(pt ?? r.pt ?? 8), fontWeight: (b ?? !!r.b) ? 700 : 400,
    textDecoration: (u || r.u) ? 'underline' : undefined,
    lineHeight: 1.08,
    whiteSpace: wrap ? 'pre-line' : 'pre',
  };
  const interior: CSSProperties | undefined = rot === 90
    ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', whiteSpace: 'pre', lineHeight: 1 }
    : undefined;
  return <div style={st}>{interior ? <span style={interior}>{texto}</span> : texto}</div>;
}

export default function RFFormato({ datos, filas }: { datos: DatosRF; filas: FilaRF[] }) {
  const R = REJILLAS[datos.grado] || REJILLAS['1'];
  const et = R.din.etq;
  const areas = datos.areas;
  const inst = datos.institucion;

  // ---- las 35 ranuras de la hoja: alumno / asteriscos / vacía ----
  const n = Math.min(filas.length, MAX_ALUMNOS_HOJA);
  const slots = Array.from({ length: MAX_ALUMNOS_HOJA }, (_, i) => ({
    numero: pad2(i + 1),
    fila: i < n ? filas[i] : null,
    asteriscos: i === n && n < MAX_ALUMNOS_HOJA,
  }));

  const stats = areas.map(ar => statsDeArea(slots.map(s => s.fila), ar.codigo, ar.letras));
  const nProf = areas.length;

  return (
    <div id="rf-print-area" style={{ width: Math.round(R.W * R.K), height: Math.round(R.H * R.K), background: '#fff', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: R.W, height: R.H, transform: `scale(${R.K})`, transformOrigin: 'top left', fontFamily: 'Arial, sans-serif', color: '#000' }}>

        {/* ===== TODAS las líneas del formato (del Excel, sin excepción) =====
            v13: sin las líneas fantasma (bordes internos de celdas combinadas
            que Excel no dibuja — filtradas en el generador). Los 4 tramos del
            MARCO exterior se ajustan medio px para que no se recorten con el
            overflow del contenedor (la V derecha cubre fila 1..última como el
            original). */}
        {R.lineas.H.map((l, i) => (
          <div key={'h' + i} style={{ position: 'absolute', left: l[1], top: l[0] <= 0 ? 0 : (l[0] >= R.H - 0.6 ? R.H - 1 : l[0] - 0.5), width: l[2] - l[1], height: 1, background: '#000' }} />
        ))}
        {R.lineas.V.map((l, i) => (
          <div key={'v' + i} style={{ position: 'absolute', left: l[0] <= 0 ? 0 : (l[0] >= R.W - 0.6 ? R.W - 1 : l[0] - 0.5), top: l[1], width: 1, height: l[2] - l[1], background: '#000' }} />
        ))}

        {/* ===== logo del encabezado oficial (Gobierno Bolivariano / MPPE) ===== */}
        <img src="/logos/emg-encabezado.png" alt="" style={{ position: 'absolute', left: R.logo.x, top: R.logo.y, width: R.logo.w, height: R.logo.h }} />

        {/* ===== textos estáticos del formato (verbatim, ortografía corregida) ===== */}
        {R.celdas.map((c, i) => (
          <Caja key={'c' + i} r={c} texto={c.t} pt={c.pt} b={c.b} rot={c.rot} wrap={c.wrap} u={!!c.u} />
        ))}

        {/* ===== I. datos de la consulta ===== */}
        <Caja r={et.ano} texto={datos.ano} />
        <Caja r={et.tipo} texto={datos.tipo} />
        <Caja r={et.mes} texto={datos.mes} />

        {/* ===== II. institución ===== */}
        <Caja r={et.cod} texto={inst.codigo} />
        <Caja r={et.denom} texto={inst.denominacion} />
        <Caja r={et.dir} texto={inst.direccion} />
        <Caja r={et.tel} texto={inst.telefono} />
        <Caja r={et.munic} texto={inst.municipio} />
        <Caja r={et.entFed} texto={inst.entidadFederal} />
        <Caja r={et.cdcee} texto={inst.entidadFederal} />
        <Caja r={et.director} texto={inst.director} />
        <Caja r={et.cedDir} texto={inst.cedulaDirector} />

        {/* ===== III/IV: los 35 slots (alumno / asteriscos / en blanco) ===== */}
        {slots.map((s, idx) => {
          const a = R.din.alumnos[idx];
          const C8 = { pt: 8 };                                   // filas de alumnos: Arial 8
          const C8c = { pt: 8, ah: 'center' as const };           // campos cortos centrados
          if (s.asteriscos) {
            return (
              <div key={'s' + idx}>
                <Caja r={a.ced} texto={'***'} {...C8} />
                <Caja r={a.ape} texto={'* * *'} {...C8} />
                <Caja r={a.nom} texto={'* * *'} {...C8} />
                <Caja r={a.lug} texto={'* * *'} {...C8} />
                <Caja r={a.ef} texto={'* *'} {...C8c} />
                <Caja r={a.sexo} texto={'*'} {...C8c} />
                <Caja r={a.dia} texto={'* *'} {...C8c} />
                <Caja r={a.mesN} texto={'* *'} {...C8c} />
                <Caja r={a.anio} texto={'* *'} {...C8c} />
                {a.notas.map((r, j) => <Caja key={'an' + j} r={r} texto={'*'} {...C8c} />)}
                <Caja r={a.grupo} texto={'*'} {...C8} />
              </div>
            );
          }
          const f = s.fila;
          if (!f) return null;
          return (
            <div key={'s' + idx}>
              <Caja r={a.ced} texto={f.cedula} {...C8} />
              <Caja r={a.ape} texto={f.apellidos} {...C8} />
              <Caja r={a.nom} texto={f.nombres} {...C8} />
              <Caja r={a.lug} texto={f.lugar} {...C8} />
              <Caja r={a.ef} texto={f.ef} {...C8c} />
              <Caja r={a.sexo} texto={f.sexo} {...C8c} />
              <Caja r={a.dia} texto={f.dia} {...C8c} />
              <Caja r={a.mesN} texto={f.mesNac} {...C8c} />
              <Caja r={a.anio} texto={f.anio} {...C8c} />
              {areas.map((ar, j) => <Caja key={'nn' + j} r={a.notas[j]} texto={mostrarNota(f.notas[ar.codigo] ?? '')} {...C8c} />)}
              <Caja r={a.grupo} texto={f.grupo} {...C8} />
            </div>
          );
        })}

        {/* ===== IV: pie de totales por área (Arial 9 negrita, igual que el Excel) ===== */}
        {R.din.pie.map((p, j) => (
          <div key={'p' + j}>
            <Caja r={{ ...p.filas[0], ah: 'center', av: 'center' }} texto={pad2(stats[j].inscritos)} pt={9} b={true} />
            <Caja r={{ ...p.filas[1], ah: 'center', av: 'center' }} texto={pad2(stats[j].inasistentes)} pt={9} b={true} />
            <Caja r={{ ...p.filas[2], ah: 'center', av: 'center' }} texto={pad2(stats[j].aprobados)} pt={9} b={true} />
            <Caja r={{ ...p.filas[3], ah: 'center', av: 'center' }} texto={pad2(stats[j].noAprobados)} pt={9} b={true} />
            <Caja r={{ ...p.filas[4], ah: 'center', av: 'center' }} texto={pad2(stats[j].noCursantes)} pt={9} b={true} />
          </div>
        ))}
        {R.din.starPie && <Caja r={R.din.starPie} texto={'*'} pt={9} b={true} />}

        {/* ===== V: profesores por áreas (Arial 8) ===== */}
        {R.din.prof.map((pf, i) => {
          const prof = datos.profesores[i];
          const sinUso = stats[i].inscritos === 0 || !prof?.nombre;
          return (
            <div key={'pf' + i}>
              <Caja r={pf.u} texto={sinUso ? (i + 1 === nProf ? '                          *' : '*') : prof!.nombre!} pt={8} />
              <Caja r={pf.aj} texto={sinUso ? '*' : prof!.cedula!} pt={8} />
              <Caja r={pf.av} texto={sinUso ? '*' : ''} pt={8} />
            </div>
          );
        })}

        {/* ===== VI: identificación del curso ===== */}
        <Caja r={et.seccion} texto={datos.secDisplay} />
        <Caja r={et.nSeccion} texto={String(datos.nPorSeccion)} />
        <Caja r={et.nPagina} texto={String(n)} />

        {/* ===== VII: observaciones (sábanas NL/NR, verbatim; Arial 8) ===== */}
        <Caja r={et.obs1} texto={datos.observaciones?.linea1 ?? ''} pt={8} />
        <Caja r={et.obs2} texto={datos.observaciones?.linea2 ?? ''} pt={8} />

        {/* ===== VIII: director y cédula ===== */}
        <Caja r={et.director2} texto={inst.director} />
        <Caja r={et.cedDir2} texto={inst.cedulaDirector} />
      </div>
    </div>
  );
}
