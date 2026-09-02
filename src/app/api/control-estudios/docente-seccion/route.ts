import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET ?seccionId= → filas de asignaturas del grado con docente asignado
export async function GET(req: NextRequest) {
  const seccionId = new URL(req.url).searchParams.get('seccionId');
  if (!seccionId) return NextResponse.json({ error: 'seccionId requerido' }, { status: 400 });
  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId } });
  if (!seccion) return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });

  // asignaturas del grado = celdas existentes en secciones del mismo grado y año
  const hermanas = await prisma.seccion.findMany({
    where: { anoEscolarId: seccion.anoEscolarId, grado: seccion.grado },
    select: { id: true },
  });
  const celdasHermanas = await prisma.docenteSeccion.findMany({
    where: { seccionId: { in: hermanas.map(h => h.id) } },
    include: { asignatura: true },
  });
  let asigs = [...new Map(celdasHermanas.map(c => [c.asignaturaId, c.asignatura])).values()];
  if (!asigs.length) asigs = await prisma.asignatura.findMany({ orderBy: { orden: 'asc' } });
  asigs.sort((a, b) => a.orden - b.orden);

  const propias = await prisma.docenteSeccion.findMany({ where: { seccionId } });
  const porAsig = new Map(propias.map(p => [p.asignaturaId, p]));
  const filas = asigs.map(a => ({
    asignaturaId: a.id, codigo: a.codigo, nombre: a.nombre,
    docenteId: porAsig.get(a.id)?.docenteId ?? null,
  }));
  return NextResponse.json({ seccion, filas });
}

// PUT: {seccionId, asignaturaId, docenteId|null} upsert de una celda
export async function PUT(req: NextRequest) {
  const { seccionId, asignaturaId, docenteId } = await req.json();
  if (!seccionId || !asignaturaId) return NextResponse.json({ error: 'seccionId y asignaturaId requeridos' }, { status: 400 });
  const data = { docenteId: docenteId || null };
  const celda = await prisma.docenteSeccion.upsert({
    where: { seccionId_asignaturaId: { seccionId, asignaturaId } },
    update: data, create: { seccionId, asignaturaId, ...data },
  });
  return NextResponse.json({ ok: true, asignado: !!celda.docenteId });
}
