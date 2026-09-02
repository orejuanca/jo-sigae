import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET ?q= búsqueda de alumnos (cédula/apellidos/nombres) con estado de inscripción en el año activo
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (q.length < 3) return NextResponse.json({ alumnos: [] });
  const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
  const donde = {
    OR: [
      { cedula: { contains: q.toUpperCase() } },
      { apellidos: { contains: q.toUpperCase() } },
      { nombres: { contains: q.toUpperCase() } },
    ],
  };
  const [alumnos, inscritos] = await Promise.all([
    prisma.alumno.findMany({ where: donde, take: 25, orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }] }),
    ano ? prisma.inscripcion.findMany({ where: { anoEscolarId: ano.id, activo: true }, include: { seccion: true } }) : [],
  ]);
  const insPorAlumno = new Map(inscritos.map(i => [i.alumnoId, `${i.seccion.grado}${i.seccion.codigo === 'MP' ? ' MP' : i.seccion.codigo}`]));
  return NextResponse.json({
    alumnos: alumnos.map(a => ({ ...a, inscritoEn: insPorAlumno.get(a.id) ?? null })),
  });
}
