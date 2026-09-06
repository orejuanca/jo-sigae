/**
 * IMPORT DE NOTAS HISTÓRICAS 2021-2022 — verbatim desde el Excel íntegro (hojas NL).
 * Idempotente: upserts por claves únicas; se puede correr las veces que haga falta.
 *
 * Fuentes (scripts/data_legacy/excel_integro):
 *  - NL_{1..5}grado.json:
 *      · Bloques "Notas de Lapso y Definitivas {g}° {LETRA}"  -> secciones regulares.
 *        Cada materia ocupa 4 columnas: L1, L2, L3 y DEFINITIVA (la definitiva la
 *        calcula el sistema, NO se importa). Cualitativas OC/PG y GRUPO con letras.
 *      · Bloques "Notas de Materia Pendiente {g}° U" -> secciones MP.
 *        Cada materia ocupa 4 columnas = los 4 MOMENTOS (1M OCT, 2M DIC, 3M ENE, 4M JUN).
 *  - Cédula del estudiante en la columna 2 (ej: "V 32787155", "V10817928482").
 *
 * Reglas respetadas:
 *  - NO se inventa nada: solo se importan valores presentes en el Excel.
 *  - NOTAS ENTERAS: en el Excel original todas las notas son enteras (la celda
 *    muestra el entero aunque por dentro la fórmula cargue decimales, ej 9.666 → 10).
 *    Todo se redondea al entero mostrado, igual que la planilla.
 *  - MP: cada materia ocupa 4 columnas = los 4 MOMENTOS. Se importa SOLO desde el
 *    bloque "Notas de Materia Pendiente {g}° U" (nunca desde otras sábanas).
 *    "*" PREVIO a la primera nota/IN se importa como valor "*" (alumno trasladado
 *    que venía aplazada de otro plantel y no presentó ese momento aquí; ley del
 *    usuario). Los "*" posteriores a una nota/aprobación son derivados (el sistema
 *    los pinta) y NO se importan. IN = INASISTENTE. Sin definitiva ni promedio.
 *  - SECCION U (RÉGIMEN DE EQUIVALENCIA): los bloques "Notas de Lapso y
 *    Definitivas {g}° U" importan como LAPSOS para las inscripciones tipo 'U'
 *    (caso 2021-22: BLANCO COLMENARES V 31651259, 5°D, MP1=BI, EQV=U: su BI
 *    14|14|14|14 vive en el bloque "4° U" -> notaLapso L1-L3=14, definitiva
 *    calculada). El alumno tiene UNA sola matrícula regular (5°D); la U es su
 *    presentación por equivalencia, NO una segunda inscripción.
 *  - "NC" (no cursante) y "P" (pendiente) se importan tal cual; "20'" se corrige a "20".
 *  - GRUPO = "EXONERADO" (único valor usado en 2021-22). En MP/U no hay valores GRUPO.
 *  - La definitiva de la MP es el momento en que aprobó (patrón del Excel: los
 *    momentos tras la aprobación traen "*"), nunca un promedio.
 *
 * Uso:  npx tsx scripts/seed_notas_historicas.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const BASE = join(__dirname, 'data_legacy', 'excel_integro');

// Códigos de hoja NL -> catálogo de asignaturas (docenteSeccion usa FSN y PGCRP)
const MAP_COD: Record<string, string> = { FS: 'FSN', PG: 'PGCRP' };
const CUALITATIVAS = new Set(['OC', 'PGCRP']);

type Grid = Map<number, Map<number, string | number>>;

function loadHoja(grado: number): Grid {
  const d = JSON.parse(readFileSync(join(BASE, `NL_${grado}grado.json`), 'utf8')) as {
    celdas: { r: number; c: number; v: string | number | null }[];
  };
  const grid: Grid = new Map();
  for (const c of d.celdas) {
    if (c.v === null || c.v === '') continue;
    if (!grid.has(c.r)) grid.set(c.r, new Map());
    grid.get(c.r)!.set(c.c, c.v);
  }
  return grid;
}

function ced(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '');
}
function esNum(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}
// número -> ENTERO como muestra la celda del Excel (la planilla no usa decimales:
// por dentro la fórmula puede cargar 9.666 o 2.5, pero la celda muestra 10 o 3)
function fmt2(n: number): string {
  return String(Math.round(n));
}
type Materia = { codNL: string; codCat: string; c0: number };

// --- contadores ---
const cnt = { lapsoNum: 0, lapsoNC: 0, lapsoP: 0, lapsoCual: 0, grupo: 0, momento: 0 };
const avisos: string[] = [];
function aviso(m: string) {
  if (avisos.length < 60) avisos.push(m);
  else if (avisos.length === 60) avisos.push('… (más avisos omitidos)');
}

async function main() {
  const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
  if (!ano) throw new Error('SIN_ANO_ACTIVO: corre primero seed_control.ts');

  const asignaturas = await prisma.asignatura.findMany();
  const asigByCod = new Map(asignaturas.map(a => [a.codigo, a.id]));

  const inscripciones = await prisma.inscripcion.findMany({
    where: { anoEscolarId: ano.id, activo: true },
    include: { alumno: true, seccion: true },
  });
  // índice cédula(dígitos) -> inscripciones de ese alumno
  const porCed = new Map<string, typeof inscripciones>();
  for (const i of inscripciones) {
    const k = ced(i.alumno.cedula);
    if (!k) continue;
    if (!porCed.has(k)) porCed.set(k, []);
    porCed.get(k)!.push(i);
  }
  const mpInsc = inscripciones.filter(i => i.seccion.tipo === 'MP');

  for (const grado of ['1', '2', '3', '4', '5']) {
    const grid = loadHoja(Number(grado));

    // ---------- localizar bloques ----------
    type Bloque = { titulo: string; filaTitulo: number; tipo: 'REG' | 'MP'; letra: string; materias: Materia[] };
    const bloques: Bloque[] = [];
    const titulosFilas = [...grid.keys()].filter(r =>
      [...(grid.get(r)!.values())].some(v => typeof v === 'string' && /Notas de (Lapso y Definitivas|Materia Pendiente)/.test(v))
    );
    for (const rt of titulosFilas) {
      const titulo = String(grid.get(rt)!.get(3) ?? '');
      const tipo = titulo.includes('Materia Pendiente') ? 'MP' : 'REG';
      const letra = tipo === 'MP' ? 'U' : (titulo.trim().split(' ').pop() ?? '?').slice(-1);
      const enc = grid.get(rt + 1);
      const materias: Materia[] = [];
      if (enc) {
        let c = 5;
        while (enc.has(c)) {
          const codNL = String(enc.get(c)).trim();
          if (!codNL || codNL === 'PROM') break;
          const codCat = MAP_COD[codNL] ?? codNL;
          if (asigByCod.has(codCat) || codNL === 'GRUPO')
            materias.push({ codNL, codCat: codNL === 'GRUPO' ? 'GRUPO' : codCat, c0: c });
          else aviso(`${titulo}: columna ${codNL} sin asignatura en catálogo (omitida)`);
          c += 4;
        }
      }
      bloques.push({ titulo, filaTitulo: rt, tipo, letra, materias });
    }

    // ---------- IMPORT REGULARES (incluye secciones U = régimen de equivalencia) ----------
    for (const b of bloques.filter(x => x.tipo === 'REG')) {
      for (let r = b.filaTitulo + 3; r < b.filaTitulo + 47; r++) {
        const row = grid.get(r);
        if (!row) continue;
        const k = ced(row.get(2));
        if (k.length < 5) continue;
        const cand = (porCed.get(k) ?? []).filter(i => i.seccion.grado === grado && (i.seccion.tipo === 'REGULAR' || i.seccion.tipo === 'U'));
        if (cand.length === 0) {
          const mpAqui = (porCed.get(k) ?? []).find(i => i.seccion.grado === grado && i.seccion.tipo === 'MP');
          if (mpAqui) aviso(`${b.titulo} r${r}: ${row.get(3)} es MP (su fila regular se ignora; notas MP por bloque U)`);
          else aviso(`${b.titulo} r${r}: cédula ${row.get(2)} sin inscripción ${grado}° regular -> OMITIDA`);
          continue;
        }
        const insc = cand[0];
        if (insc.seccion.codigo !== b.letra) {
          aviso(`${b.titulo} r${r}: ${row.get(3)} está en ${grado}°${insc.seccion.codigo} (DB) pero fila en bloque ${b.letra} -> se importa en su sección DB`);
        }
        for (const mat of b.materias) {
          for (let lapso = 1; lapso <= 3; lapso++) {
            const v = row.get(mat.c0 + lapso - 1);
            if (v === undefined || v === '*' || v === '') continue;
            if (mat.codNL === 'GRUPO') {
              const s = String(v).trim().toUpperCase();
              if (s !== 'EXONERADO') { aviso(`${b.titulo} r${r} GRUPO L${lapso}=${JSON.stringify(v)}->omitido`); continue; }
              await prisma.notaGrupo.upsert({
                where: { inscripcionId_lapso: { inscripcionId: insc.id, lapso } },
                update: { valor: s },
                create: { inscripcionId: insc.id, lapso, valor: s },
              });
              cnt.grupo++;
              continue;
            }
            const asigId = asigByCod.get(mat.codCat)!;
            let valor: string | null = null;
            if (esNum(v)) {
              valor = fmt2(v);
              cnt.lapsoNum++;
            } else {
              const s = String(v).trim().toUpperCase();
              if (CUALITATIVAS.has(mat.codCat)) {
                if (!['A', 'B', 'C', 'D', 'EX'].includes(s)) { aviso(`${b.titulo} r${r} ${mat.codNL} L${lapso}=${JSON.stringify(v)} -> omitido`); continue; }
                valor = s;
                cnt.lapsoCual++;
              } else if (s === 'NC') { valor = 'NC'; cnt.lapsoNC++; }
              else if (s === 'P') { valor = 'P'; cnt.lapsoP++; }
              else if (/^\d+([.,]\d+)?['´`]+$/.test(s)) {
                // typo del Excel tipo 20' -> 20
                valor = fmt2(Number(s.replace(/[^0-9.,]/g, '').replace(',', '.')));
                aviso(`${b.titulo} r${r} ${mat.codNL} L${lapso}: "${s}" corregido a ${valor}`);
                cnt.lapsoNum++;
              } else { aviso(`${b.titulo} r${r} ${mat.codNL} L${lapso}=${JSON.stringify(v)} -> omitido`); continue; }
            }
            await prisma.notaLapso.upsert({
              where: { inscripcionId_asignaturaId_lapso: { inscripcionId: insc.id, asignaturaId: asigId, lapso } },
              update: { valor },
              create: { inscripcionId: insc.id, asignaturaId: asigId, lapso, valor },
            });
          }
        }
      }
    }

    // ---------- IMPORT MP (4 momentos; SOLO desde el bloque "Materia Pendiente {g}° U") ----------
    const bloqueMp = bloques.find(b => b.tipo === 'MP');
    const mpDelGrado = mpInsc.filter(i => i.seccion.grado === grado);
    for (const insc of mpDelGrado) {
      const k = ced(insc.alumno.cedula);
      if (!k) { aviso(`MP ${grado}: inscripción sin cédula`); continue; }
      const pendientes = [insc.materiaPend1, insc.materiaPend2].filter((x): x is string => !!x);
      if (pendientes.length === 0) { aviso(`MP ${grado}: ${insc.alumno.apellidos} sin materias pendientes`); continue; }
      if (!bloqueMp) { aviso(`MP ${grado}: sin bloque de Materia Pendiente en NL_${grado}grado`); continue; }
      // la fila del alumno se busca DENTRO del bloque MP (nunca en otras sábanas)
      let filaAlumno: number | null = null;
      for (let r = bloqueMp.filaTitulo + 3; r < bloqueMp.filaTitulo + 47; r++) {
        const row = grid.get(r);
        if (row && ced(row.get(2)) === k) { filaAlumno = r; break; }
      }
      if (filaAlumno === null) {
        aviso(`MP ${grado}: ${insc.alumno.apellidos} (${insc.alumno.cedula}) no aparece en el bloque MP -> OMITIDA`);
        continue;
      }
      const row = grid.get(filaAlumno)!;
      for (const codPend of pendientes) {
        const mat = bloqueMp.materias.find(m => m.codCat === codPend);
        if (!mat) { aviso(`MP ${grado} r${filaAlumno}: columna ${codPend} no está en ${bloqueMp.titulo}`); continue; }
        // secuencia verbatim de los 4 momentos de esa materia
        const seq: (string | number | undefined)[] = [];
        for (let mo = 1; mo <= 4; mo++) seq.push(row.get(mat.c0 + mo - 1));
        // "*" previo a la primera nota/IN = dato real (venía aplazada, no presentó aquí);
        // "*" posterior a una nota = derivado (el sistema lo pinta) y NO se importa
        const primerReal = seq.findIndex(v => v !== undefined && v !== '*' && v !== '');
        for (let mo = 1; mo <= 4; mo++) {
          const v = seq[mo - 1];
          if (v === undefined || v === '') continue;
          let valor: string;
          if (v === '*') {
            if (primerReal !== -1 && mo - 1 >= primerReal) continue;
            valor = '*';
          } else if (esNum(v)) valor = fmt2(v);
          else {
            const s = String(v).trim().toUpperCase();
            if (s === 'IN') valor = 'IN';
            else { aviso(`MP ${grado} r${filaAlumno} ${codPend} M${mo}=${JSON.stringify(v)} -> omitido`); continue; }
          }
          await prisma.notaMomento.upsert({
            where: { inscripcionId_asignaturaId_momento: { inscripcionId: insc.id, asignaturaId: asigByCod.get(codPend)!, momento: mo } },
            update: { valor },
            create: { inscripcionId: insc.id, asignaturaId: asigByCod.get(codPend)!, momento: mo, valor },
          });
          cnt.momento++;
        }
      }
    }
  }

  // ---------- resumen ----------
  const nl = await prisma.notaLapso.count();
  const nm = await prisma.notaMomento.count();
  const ng = await prisma.notaGrupo.count();
  console.log('=== IMPORT NOTAS HISTÓRICAS 2021-2022 ===');
  console.log(`asignadas ahora: notaLapso=${cnt.lapsoNum + cnt.lapsoCual + cnt.lapsoNC + cnt.lapsoP} (num ${cnt.lapsoNum} · cualitativas ${cnt.lapsoCual} · NC ${cnt.lapsoNC} · P ${cnt.lapsoP})`);
  console.log(`                 notaGrupo=${cnt.grupo} · notaMomento=${cnt.momento}`);
  console.log(`totales en BD:   notaLapso=${nl} · notaMomento=${nm} · notaGrupo=${ng}`);
  if (avisos.length) {
    console.log(`avisos (${avisos.length}):`);
    for (const a of avisos) console.log('  · ' + a);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error('IMPORT ERROR:', e); process.exit(1); });
