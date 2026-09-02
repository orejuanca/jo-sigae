/**
 * Seed Control de Alumnos UENCC 4331 desde data legacy extraida.
 * Carga: asignaturas (14), docentes (102), ano 2021-2022 activo,
 *         secciones (A-I x5 + MP x4 = 49), docenteSeccion (264 celdas).
 * Idempotente: upsert todo.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
const prisma = new PrismaClient();
const D = join(__dirname, 'data_legacy');

const NOMBRES: Record<string, string> = {
  CA: 'Castellano', ILE: 'Inglés y otras Len. Ext.', MA: 'Matemáticas',
  EF: 'Educación Física', AP: 'Arte y Patrimonio', CN: 'Ciencias Naturales',
  GHC: 'Geografía, Hist. y Ciud.', OC: 'Orientación y Convivencia',
  PGCRP: 'Participacion en Grupos', FI: 'Física', QU: 'Química', BI: 'Biología',
  FSN: 'Form. para la Sob. Nac.', CT: 'Ciencias de la Tierra',
};
const ORDEN = ['CA','ILE','MA','EF','AP','CN','GHC','OC','PGCRP','FI','QU','BI','FSN','CT'];

async function main() {
  const celdas: { grado: string; seccion: string; codigo: string; docenteRaw: string | null; cedula: string | null }[] =
    JSON.parse(readFileSync(`${D}/matriz_secciones.json`, 'utf8'));
  const docentes: { nombre: string; cedula: string }[] =
    JSON.parse(readFileSync(`${D}/docentes.json`, 'utf8'));

  // 1) asignaturas
  for (const codigo of ORDEN) {
    await prisma.asignatura.upsert({
      where: { codigo }, update: { nombre: NOMBRES[codigo], orden: ORDEN.indexOf(codigo) },
      create: { codigo, nombre: NOMBRES[codigo], orden: ORDEN.indexOf(codigo) },
    });
  }
  console.log('asignaturas OK:', await prisma.asignatura.count());

  // 2) docentes
  for (const d of docentes) {
    await prisma.docente.upsert({ where: { cedula: d.cedula }, update: { nombre: d.nombre }, create: { cedula: d.cedula, nombre: d.nombre } });
  }
  console.log('docentes OK:', await prisma.docente.count());

  // 3) ano escolar
  const ano = await prisma.anoEscolar.upsert({
    where: { nombre: '2021 - 2022' }, update: { activo: true, abierto: true },
    create: { nombre: '2021 - 2022', activo: true, abierto: true },
  });
  await prisma.anoEscolar.updateMany({ where: { id: { not: ano.id } }, data: { activo: false } });
  console.log('ano OK:', ano.nombre, ano.activo);

  // 4) secciones: A-I x5 grados (45) + MP en 1,2,3,4 (4) = 49
  const letras = ['A','B','C','D','E','F','G','H','I'];
  for (const g of ['1','2','3','4','5']) {
    for (const codigo of letras) {
      const key = { anoEscolarId_grado_codigo: { anoEscolarId: ano.id, grado: g, codigo } };
      await prisma.seccion.upsert({ where: key, update: {}, create: { anoEscolarId: ano.id, grado: g, codigo, tipo: 'REGULAR' } });
    }
  }
  for (const g of ['1','2','3','4']) {
    const key = { anoEscolarId_grado_codigo: { anoEscolarId: ano.id, grado: g, codigo: 'MP' } };
    await prisma.seccion.upsert({ where: key, update: {}, create: { anoEscolarId: ano.id, grado: g, codigo: 'MP', tipo: 'MP' } });
  }
  console.log('secciones OK:', await prisma.seccion.count({ where: { anoEscolarId: ano.id } }));

  // 5) docenteSeccion: SOLO celdas con docente (264) + celdas sin docente de secciones
  //    "vivas" (secciones con alumnos o docentes) para que la matriz quede completa.
  const asigByCodigo = new Map((await prisma.asignatura.findMany()).map(a => [a.codigo, a.id]));
  const docByCedula = new Map((await prisma.docente.findMany()).map(d => [d.cedula, d.id]));
  const secByClave = new Map(
    (await prisma.seccion.findMany({ where: { anoEscolarId: ano.id } })).map(s => [`${s.grado}|${s.codigo}`, s.id]),
  );

  // secciones vivas: las que tienen >=1 docente (27 regulares + 4 MP = 31)
  const vivas = new Set(celdas.filter(c => c.docenteRaw).map(c => `${c.grado}|${c.seccion}`));
  // codigos presentes por grado (columnas del grid legacy)
  const codigosPorGrado = new Map<string, string[]>();
  for (const c of celdas) {
    if (!vivas.has(`${c.grado}|${c.seccion}`)) continue;
    const arr = codigosPorGrado.get(c.grado) || [];
    if (!arr.includes(c.codigo)) arr.push(c.codigo);
    codigosPorGrado.set(c.grado, arr);
  }

  let creadas = 0;
  for (const [grado, codigos] of codigosPorGrado) {
    for (const codigo of codigos) {
      for (const letra of new Set(celdas.filter(c => c.grado === grado && vivas.has(`${grado}|${c.seccion}`)).map(c => c.seccion))) {
        const secId = secByClave.get(`${grado}|${letra}`);
        const asigId = asigByCodigo.get(codigo);
        if (!secId || !asigId) continue;
        const celda = celdas.find(c => c.grado === grado && c.seccion === letra && c.codigo === codigo);
        const docenteId = celda?.cedula ? docByCedula.get(celda.cedula) ?? null : null;
        const existe = await prisma.docenteSeccion.findUnique({ where: { seccionId_asignaturaId: { seccionId: secId, asignaturaId: asigId } } });
        if (existe) {
          await prisma.docenteSeccion.update({ where: { id: existe.id }, data: { docenteId } });
        } else {
          await prisma.docenteSeccion.create({ data: { seccionId: secId, asignaturaId: asigId, docenteId } });
        }
        creadas++;
      }
    }
  }
  console.log('docenteSeccion celdas procesadas:', creadas, '| total BD:', await prisma.docenteSeccion.count());
}

main().finally(() => prisma.$disconnect());
