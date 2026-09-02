import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const [activo, todos] = await Promise.all([
    prisma.anoEscolar.findFirst({
      where: { activo: true },
      include: { secciones: { include: { _count: { select: { docenteSecc: true, inscripciones: true } } } } },
    }),
    prisma.anoEscolar.findMany({ orderBy: { nombre: 'desc' } }),
  ]);
  // Alumnos distintos del año activo (un alumno con regular + MP no cuenta doble)
  let alumnosUnicos = 0;
  if (activo) {
    const filas = await prisma.inscripcion.findMany({
      where: { anoEscolarId: activo.id, activo: true, seccion: { anoEscolarId: activo.id } },
      distinct: ['alumnoId'],
      select: { alumnoId: true },
    });
    alumnosUnicos = filas.length;
  }
  return NextResponse.json({ activo, todos, alumnosUnicos });
}

// POST: crear nuevo año escolar (queda activo, sin secciones)
export async function POST(req: NextRequest) {
  const { nombre } = await req.json();
  if (!nombre || !/^\d{4}\s*-\s*\d{4}$/.test(nombre)) {
    return NextResponse.json({ error: 'Nombre inválido. Formato: 2022 - 2023' }, { status: 400 });
  }
  const norm = nombre.replace(/\s+/g, ' ').trim();
  const existe = await prisma.anoEscolar.findUnique({ where: { nombre: norm } });
  if (existe) return NextResponse.json({ error: 'Ese año ya existe' }, { status: 400 });
  await prisma.anoEscolar.updateMany({ data: { activo: false } });
  const ano = await prisma.anoEscolar.create({ data: { nombre: norm, activo: true, abierto: true } });
  return NextResponse.json({ ok: true, ano });
}

// PATCH: activar un año / abrir-cerrar
export async function PATCH(req: NextRequest) {
  const { id, abierto } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  if (abierto === undefined) {
    await prisma.anoEscolar.updateMany({ data: { activo: false } });
    await prisma.anoEscolar.update({ where: { id }, data: { activo: true } });
  } else {
    await prisma.anoEscolar.update({ where: { id }, data: { abierto } });
  }
  return NextResponse.json({ ok: true });
}
