/**
 * Carga alumnos (857) + inscripciones del legacy 2021-2022.
 * Idempotente: upsert alumno por cedula; inscripcion por (alumnoId, anoEscolarId).
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
const prisma = new PrismaClient();

interface Alu {
  cedula: string; grado: string; seccion: string; matricula: string;
  apellidos: string; nombres: string; sexo: string | null; fechaNac: string | null;
  entidad: string | null; ef: string | null;
}

async function main() {
  const alumnos: Alu[] = JSON.parse(readFileSync(join(__dirname, 'data_legacy', 'alumnos.json'), 'utf8'));
  const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
  if (!ano) throw new Error('No hay año activo');
  const secciones = await prisma.seccion.findMany({ where: { anoEscolarId: ano.id } });
  const secByClave = new Map(secciones.map(s => [`${s.grado}|${s.codigo}`, s.id]));

  let nAlu = 0, nInsc = 0, yaInsc = 0, sinSeccion = 0;
  for (const a of alumnos) {
    const alumno = await prisma.alumno.upsert({
      where: { cedula: a.cedula },
      update: { apellidos: a.apellidos, nombres: a.nombres, sexo: a.sexo, fechaNac: a.fechaNac, entidad: a.entidad, ef: a.ef },
      create: { cedula: a.cedula, apellidos: a.apellidos, nombres: a.nombres, sexo: a.sexo, fechaNac: a.fechaNac, entidad: a.entidad, ef: a.ef },
    });
    nAlu++;
    const secId = secByClave.get(`${a.grado}|${a.seccion}`);
    if (!secId) { sinSeccion++; continue; }
    const ya = await prisma.inscripcion.findUnique({ where: { alumnoId_seccionId: { alumnoId: alumno.id, seccionId: secId } } });
    if (ya) { yaInsc++; continue; }
    await prisma.inscripcion.create({
      data: { alumnoId: alumno.id, seccionId: secId, anoEscolarId: ano.id, matricula: a.matricula || null },
    });
    nInsc++;
  }
  const [totAlu, totInsc] = await Promise.all([prisma.alumno.count(), prisma.inscripcion.count({ where: { anoEscolarId: ano.id, activo: true } })]);
  console.log(`alumnos procesados: ${nAlu} (creados/actualizados) | inscripciones nuevas: ${nInsc} | ya inscritos: ${yaInsc} | sin seccion: ${sinSeccion}`);
  console.log(`BD total -> alumnos: ${totAlu} | inscripciones activas ${ano.nombre}: ${totInsc}`);
}
main().finally(() => prisma.$disconnect());
