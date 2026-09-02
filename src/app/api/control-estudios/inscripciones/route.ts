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
  // Otras inscripciones activas del mismo año (p.ej. su sección regular si estamos en la MP, o viceversa)
  const alumnoIds = inscripciones.map(i => i.alumnoId);
  const otras = alumnoIds.length
    ? await prisma.inscripcion.findMany({
        where: { anoEscolarId: seccion.anoEscolarId, activo: true, alumnoId: { in: alumnoIds }, NOT: { seccionId } },
        include: { seccion: true },
      })
    : [];
  const otrasMap: Record<string, string[]> = {};
  for (const o of otras) {
    (otrasMap[o.alumnoId] ??= []).push(o.seccion.codigo === 'MP' ? `${o.seccion.grado}° MP` : `${o.seccion.grado}° ${o.seccion.codigo}`);
  }
  return NextResponse.json({
    seccion, inscripciones: inscripciones.map(i => ({
      inscripcionId: i.id, alumnoId: i.alumnoId, matricula: i.matricula,
      repitiente: i.repitiente, activo: i.activo,
      materiaPend1: i.materiaPend1, materiaPend2: i.materiaPend2,
      cedula: i.alumno.cedula, apellidos: i.alumno.apellidos, nombres: i.alumno.nombres,
      sexo: i.alumno.sexo, fechaNac: i.alumno.fechaNac,
      tambienEn: otrasMap[i.alumnoId] ?? [],
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

  // Reglas de inscripción:
  //  - Máximo UNA sección REGULAR activa por año (2°B o 2°C, no ambas).
  //  - La sección MP (Materia Pendiente) se permite ADEMÁS de la regular:
  //    alumno en 2°B que también cursa su pendiente en 2°MP.
  //  - No se duplica en la misma sección (fila activa).
  const existentes = await prisma.inscripcion.findMany({
    where: { alumnoId: aId, anoEscolarId: seccion.anoEscolarId },
    include: { seccion: true },
  });
  const enEsta = existentes.find(e => e.seccionId === seccionId);
  if (enEsta?.activo) return NextResponse.json({ error: 'Ya está inscrito en esta sección' }, { status: 400 });
  if (seccion.tipo !== 'MP') {
    const enRegular = existentes.find(e => e.activo && e.seccion.tipo !== 'MP' && e.seccionId !== seccionId);
    if (enRegular) {
      const s = enRegular.seccion;
      return NextResponse.json({ error: `Ya está inscrito en ${s.grado}° ${s.codigo}. Retíralo de allí antes de inscribirlo en otra sección regular` }, { status: 400 });
    }
  }
  if (enEsta && !enEsta.activo) {
    // venia retirado de esta misma sección: reactivamos su fila
    const upd = await prisma.inscripcion.update({ where: { id: enEsta.id }, data: { activo: true, fechaRetiro: null } });
    return NextResponse.json({ ok: true, inscripcion: upd, reactivado: true });
  }
  const total = await prisma.inscripcion.count({ where: { seccionId, activo: true } });
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
