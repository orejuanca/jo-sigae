/**
 * IMPORT DE NOTAS DE REVISIÓN 2021-2022 — verbatim desde el Excel íntegro (hojas NR).
 * Idempotente: upserts por la clave única (inscripcion, asignatura); se puede correr
 * las veces que haga falta.
 *
 * Fuentes (scripts/data_legacy/excel_integro): NR_{1..5}grado.json — hojas
 * "Notas de REVISION {g}° {LETRA}" con un bloque por sección (A..I y U).
 *
 * Estructura del bloque (48 filas):
 *   fila +0: título  "Notas de REVISION 1° A"        (columna 1)
 *   fila +1: encabezado de materias desde la columna 5 (CA ILE MA EF AP CN GHC [FI QU
 *            BI [CT]] [FS] OC PG GRUPO) — el mismo orden de las sábanas NL del grado.
 *   fila +2: "Nº | CEDULA | Apellidos y Nombres | S | R | R | ..."
 *   filas +3 en adelante: SOLO los estudiantes con materias reprobadas.
 *     Celda por materia: "IN" (insuficiente, sigue aplazado) | ENTERO (resultado de la
 *     revisión: 10, 11, 12, 13, 16... también hay "2") | "*" (aprobada, sin revisión).
 *     OC, PG y GRUPO SIEMPRE con "*" (las cualitativas no llevan revisión).
 *
 * Reglas respetadas:
 *  - NO se inventa nada: solo se guardan los valores reales del Excel NR (IN o entero).
 *  - "IN" y los enteros se importan TAL CUAL (la revisión del Excel trae enteros).
 *  - "*" y celdas vacías NO se guardan: el * de aprobada es derivado en la vista.
 *  - El estudiante se localiza por cédula (columna 2, ej "V 32787155") en la sección
 *    REGULAR {g}°{letra de la columna S}; los MP no llevan revisión (regla de la escuela).
 *  - Conciliación 2021-2022 (verificada contra las definitivas importadas de NL):
 *      153 filas de estudiantes (28/33/35/35/22) y 772 valores (488 IN + 284 enteros);
 *      todo estudiante con definitiva numérica <10 tiene su fila NR salvo GOMEZ CARBALLO
 *      4°D (V 34808917), que el Excel no trae — la vista lo muestra por criterio con las
 *      celdas vacías, y URBANO SANTA MARIA 4°D (aprobó todo) aparece porque el Excel NR
 *      le anota 10 en ILE/MA/QU — se importa tal cual.
 *
 * Uso:  pnpm dlx tsx scripts/seed_revision_nr.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const BASE = join(__dirname, 'data_legacy', 'excel_integro');

// Códigos de hoja NR -> catálogo de asignaturas (como en las NL: FS es FSN, PG es PGCRP)
const MAP_COD: Record<string, string> = { FS: 'FSN', PG: 'PGCRP' };
// Las cualitativas no llevan revisión: en NR solo traen "*" (no se guardan nunca)
const SIN_REVISION = new Set(['OC', 'PGCRP', 'GRUPO']);

type Grid = Map<number, Map<number, string | number>>;

function loadHoja(grado: number): Grid {
  const d = JSON.parse(readFileSync(join(BASE, `NR_${grado}grado.json`), 'utf8')) as {
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

// --- contadores ---
const cnt = { filas: 0, valores: 0, ins: 0, enteros: 0, omitidos: 0 };
const avisos: string[] = [];
function aviso(m: string) {
  if (avisos.length < 60) avisos.push(m);
  else if (avisos.length === 60) avisos.push('… (más avisos omitidos)');
}

async function main() {
  const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
  if (!ano) throw new Error('SIN_ANO_ACTIVO: corre primero seed_control.ts');

  const asignaturas = await prisma.asignatura.findMany();
  const byCod = new Map(asignaturas.map(a => [a.codigo, a]));

  for (let grado = 1; grado <= 5; grado++) {
    const grid = loadHoja(grado);
    const filas = [...grid.keys()].sort((a, b) => a - b);

    // bloques "Notas de REVISION {g}° {LETRA}"
    for (const r of filas) {
      const titulo = grid.get(r)?.get(1);
      if (typeof titulo !== 'string' || !titulo.startsWith('Notas de REVIS')) continue;

      // materias del bloque: fila r+1, desde la columna 5 hasta GRUPO
      const materias: { codNL: string; codCat: string; col: number }[] = [];
      const filaMats = grid.get(r + 1) || new Map();
      for (let c = 5; c <= 25; c++) {
        const m = filaMats.get(c);
        if (m === undefined) continue;
        const codNL = String(m);
        materias.push({ codNL, codCat: MAP_COD[codNL] ?? codNL, col: c });
        if (codNL === 'GRUPO') break;
      }

      // filas de estudiantes: cédula en la columna 2, dentro de las 48 filas del bloque
      for (let rr = r + 3; rr < r + 48; rr++) {
        const celda = grid.get(rr)?.get(2);
        if (celda === undefined) continue;
        const dig = ced(celda);
        if (!dig || !String(celda).includes('V')) continue;
        cnt.filas++;

        const letra = String(grid.get(rr)?.get(4) ?? '').trim() || '?';
        const alumno = await prisma.alumno.findFirst({ where: { cedula: { in: [`V ${dig}`, `V${dig}`, dig] } } });
        if (!alumno) { aviso(`NR ${grado}° ${letra} ${celda}: alumno no existe`); continue; }
        const insc = await prisma.inscripcion.findFirst({
          where: { alumnoId: alumno.id, seccion: { is: { grado: String(grado), codigo: letra, tipo: 'REGULAR' } } },
        });
        if (!insc) { aviso(`NR ${grado}° ${letra} ${celda}: sin inscripción regular`); continue; }

        for (const m of materias) {
          if (SIN_REVISION.has(m.codCat)) {
            // OC/PGCRP/GRUPO: verificamos que solo traigan "*" (no se guardan)
            const v = grid.get(rr)?.get(m.col);
            if (v !== undefined && String(v) !== '*') {
              aviso(`NR ${grado}° ${letra} ${alumno.apellidos} ${m.codNL}: valor inesperado "${v}" (cualitativa)`);
            }
            continue;
          }
          const asig = byCod.get(m.codCat);
          if (!asig) { aviso(`NR ${grado}°: asignatura ${m.codCat} no está en el catálogo`); continue; }
          const v = grid.get(rr)?.get(m.col);
          if (v === undefined) continue; // celda vacía = sin revisión asentada
          const s = String(v).trim();
          if (s === '*') { cnt.omitidos++; continue; } // aprobada, sin revisión

          let valor: string;
          if (s.toUpperCase() === 'IN') {
            valor = 'IN';
          } else {
            const n = Number(s.replace(',', '.'));
            if (!isFinite(n)) { aviso(`NR ${grado}° ${letra} ${alumno.apellidos} ${m.codCat}: valor raro "${s}"`); continue; }
            valor = String(Math.round(n)); // el Excel NR trae enteros; por si acaso, entero
          }

          await prisma.notaRevision.upsert({
            where: { inscripcionId_asignaturaId: { inscripcionId: insc.id, asignaturaId: asig.id } },
            update: { valor },
            create: { inscripcionId: insc.id, asignaturaId: asig.id, valor },
          });
          cnt.valores++;
          if (valor === 'IN') cnt.ins++; else cnt.enteros++;
        }
      }
    }
  }

  console.log(`REVISIÓN importada (verbatim de las hojas NR):`);
  console.log(`  filas de estudiantes: ${cnt.filas}`);
  console.log(`  valores guardados:    ${cnt.valores} (IN=${cnt.ins} · enteros=${cnt.enteros})`);
  console.log(`  celdas "*" omitidas:  ${cnt.omitidos} (aprobadas sin revisión, derivadas en la vista)`);
  if (avisos.length) {
    console.log(`AVISOS (${avisos.length}):`);
    for (const a of avisos) console.log('  ·', a);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
