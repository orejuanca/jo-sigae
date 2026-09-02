import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET ?seccionId= → nómina de la sección (inscripciones activas)
export async function GET(req: NextRequest) {
  const seccionId = new URL(req.url).searchParams.get('seccionId');
  if (!seccionId) return NextResponse.json({ error: 'seccionId requerido' }, { status: 400 });
  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId } });
  if (!seccion) return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });
  const inscripciones = await prisma.inscripcion.findMany({
    where: { seccionId },
    orderBy: [{ activo: 'desc' }, { alumno: { apellidos: 'asc' } }, { alumno: { nombres: 'asc' } }],
    include: { alumno: true },
  });
  return NextResponse.json({
    seccion, inscripciones: inscripciones.map(i => ({
      inscripcionId: i.id, alumnoId: i.alumnoId, matricula: i.matricula,
      repitiente: i.repitiente, activo: i.activo,
      cedula: i.alumno.cedula, apellidos: i.alumno.apellidos, nombres: i.alumno.nombres,
      sexo: i.alumno.sexo, fechaNac: i.alumno.fechaNac,
    })),
  });
}

// POST: {seccionId, alumnoId} inscribir existente
//       {seccionId, nuevo:{cedula, apellidos, nombres, sexo, fechaNac}} crear+inscribir
export async function POST(req: NextRequest) {
  const { seccionId, alumnoId, nuevo } = await req.json();
  if (!seccionId) return NextResponse.json({ error: 'seccionId requerido' }, { status: 400 });
  const seccion = await prisma.seccion.findUnique({ where: { id: seccionId } });
  if (!seccion) return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });

  let aId = alumnoId as string | undefined;
  if (!aId && nuevo) {
    if (!nuevo.cedula || !nuevo.apellidos || !nuevo.nombres)
      return NextResponse.json({ error: 'Cédula, apellidos y nombres requeridos' }, { status: 400 });
    const ci = String(nuevo.cedula).trim().toUpperCase().replace(/^([VEJ])\s*/, '$1 ');
    const alumno = await prisma.alumno.upsert({
      where: { cedula: ci },
      update: { apellidos: nuevo.apellidos.trim().toUpperCase(), nombres: nuevo.nombres.trim().toUpperCase(), sexo: nuevo.sexo || null, fechaNac: nuevo.fechaNac || null },
      create: { cedula: ci, apellidos: nuevo.apellidos.trim().toUpperCase(), nombres: nuevo.nombres.trim().toUpperCase(), sexo: nuevo.sexo || null, fechaNac: nuevo.fechaNac || null },
    });
    aId = alumno.id;
  }
  if (!aId) return NextResponse.json({ error: 'alumnoId o nuevo requerido' }, { status: 400 });

  const ya = await prisma.inscripcion.findUnique({ where: { alumnoId_anoEscolarId: { alumnoId: aId, anoEscolarId: seccion.anoEscolarId } } });
  if (ya?.activo) return NextResponse.json({ error: 'Ya está inscrito en este año' }, { status: 400 });
  if (ya) {
    const upd = await prisma.inscripcion.update({ where: { id: ya.id }, data: { seccionId, activo: true, fechaRetiro: null } });
    return NextResponse.json({ ok: true, inscripcion: upd, reactivado: true });
  }
  const total = await prisma.inscripcion.count({ where: { seccionId } });
  const insc = await prisma.inscripcion.create({
    data: { alumnoId: aId, seccionId, anoEscolarId: seccion.anoEscolarId, matricula: String(total + 1) },
  });
  return NextResponse.json({ ok: true, inscripcion: insc });
}

// DELETE ?id= → retiro (activo=false)
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const insc = await prisma.inscripcion.update({ where: { id }, data: { activo: false, fechaRetiro: new Date() } });
  return NextResponse.json({ ok: true, inscripcion: insc });
}
