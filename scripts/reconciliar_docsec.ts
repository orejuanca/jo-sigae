/**
 * Reconciliador BD vs matriz legacy: compara cada celda docente-seccion de la
 * BD contra matriz_secciones.json (por cedula). Gate antes de declarar OK.
 * Salida: correctas / docente-distinto / faltantes / extras.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
const prisma = new PrismaClient();
const D = join(__dirname, 'data_legacy');

async function main() {
  const celdas: { grado: string; seccion: string; codigo: string; docenteRaw: string | null; cedula: string | null }[] =
    JSON.parse(readFileSync(`${D}/matriz_secciones.json`, 'utf8'));
  const soloConDocente = celdas.filter(c => c.docenteRaw);

  const [asigs, docs, anos] = await Promise.all([
    prisma.asignatura.findMany(), prisma.docente.findMany(),
    prisma.anoEscolar.findFirst({ where: { activo: true }, include: { secciones: true } }),
  ]);
  if (!anos) return console.log('SIN AÑO ACTIVO');
  const secIdToClave = new Map(anos.secciones.map(s => [`${s.grado}|${s.codigo}`, s.id]));
  const asigIdToCodigo = new Map(asigs.map(a => [a.id, a.codigo]));
  const docIdToCedula = new Map(docs.map(d => [d.id, d.cedula]));

  const bd = await prisma.docenteSeccion.findMany();
  const bdPorClave = new Map<string, string | null>(); // "grado|sec|cod" -> cedula|null
  for (const ds of bd) {
    const clave = [...secIdToClave.entries()].find(([, id]) => id === ds.seccionId)?.[0];
    if (!clave) continue;
    bdPorClave.set(`${clave}|${asigIdToCodigo.get(ds.asignaturaId!)}`, ds.docenteId ? docIdToCedula.get(ds.docenteId) ?? null : null);
  }

  let correctas = 0; const distintos: string[] = []; const faltantes: string[] = [];
  for (const c of soloConDocente) {
    const clave = `${c.grado}|${c.seccion}|${c.codigo}`;
    const bdCed = bdPorClave.get(clave);
    if (bdCed === undefined) faltantes.push(clave);
    else if (bdCed !== c.cedula) distintos.push(`${clave}: legacy=${c.cedula} bd=${bdCed}`);
    else correctas++;
  }
  const legacyClaves = new Set(soloConDocente.map(c => `${c.grado}|${c.seccion}|${c.codigo}`));
  const extras = [...bdPorClave.entries()].filter(([k, v]) => v && !legacyClaves.has(k)).map(([k]) => k);

  console.log(`legacy con docente: ${soloConDocente.length}`);
  console.log(`correctas: ${correctas} | distintas: ${distintos.length} | faltantes: ${faltantes.length} | extras: ${extras.length}`);
  if (distintos.length) console.log('DISTINTAS:\n' + distintos.slice(0, 10).join('\n'));
  if (faltantes.length) console.log('FALTANTES:\n' + faltantes.slice(0, 10).join('\n'));
  if (extras.length) console.log('EXTRAS:\n' + extras.slice(0, 10).join('\n'));
  console.log(correctas === soloConDocente.length && !extras.length ? 'AUDITORIA: 100% OK' : 'AUDITORIA: CON DIFERENCIAS');
}
main().finally(() => prisma.$disconnect());
