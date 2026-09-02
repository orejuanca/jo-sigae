import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const [asignaturas, docentes] = await Promise.all([
      prisma.asignatura.findMany({ orderBy: { orden: 'asc' } }),
      prisma.docente.findMany({ orderBy: { nombre: 'asc' } }),
    ]);
    return NextResponse.json({ asignaturas, docentes });
  } catch {
    // BD sin tablas nuevas o cliente prisma desactualizado: respuesta clara en vez de 500 vacío
    return NextResponse.json({
      error: 'Catálogos no disponibles. Detén el servidor (Ctrl+C) y ejecuta: npm run db:generate y luego npm run db:push. Si ya lo hiciste, reinicia npm run dev.',
    }, { status: 503 });
  }
}

// POST: agregar asignatura o docente
export async function POST(req: NextRequest) {
  const { tipo, codigo, nombre, cedula } = await req.json();
  try {
    if (tipo === 'asignatura') {
      if (!codigo || !nombre) return NextResponse.json({ error: 'Código y nombre requeridos' }, { status: 400 });
      const max = await prisma.asignatura.findFirst({ orderBy: { orden: 'desc' } });
      const a = await prisma.asignatura.upsert({
        where: { codigo: codigo.trim().toUpperCase() },
        update: { nombre: nombre.trim() },
        create: { codigo: codigo.trim().toUpperCase(), nombre: nombre.trim(), orden: (max?.orden ?? 0) + 1 },
      });
      return NextResponse.json({ ok: true, asignatura: a });
    }
    if (tipo === 'docente') {
      if (!cedula || !nombre) return NextResponse.json({ error: 'Cédula y nombre requeridos' }, { status: 400 });
      const ci = cedula.trim().toUpperCase().replace(/^([VEJ])\s*/, '$1 ');
      const d = await prisma.docente.upsert({
        where: { cedula: ci }, update: { nombre: nombre.trim().toUpperCase() },
        create: { cedula: ci, nombre: nombre.trim().toUpperCase() },
      });
      return NextResponse.json({ ok: true, docente: d });
    }
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
}

// DELETE: eliminar docente (desasigna sus celdas) o asignatura (solo si sin celdas)
export async function DELETE(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const tipo = sp.get('tipo');
  const id = sp.get('id');
  if (!id || !tipo) return NextResponse.json({ error: 'tipo e id requeridos' }, { status: 400 });
  try {
    if (tipo === 'docente') {
      const celdas = await prisma.docenteSeccion.updateMany({ where: { docenteId: id }, data: { docenteId: null } });
      await prisma.docente.delete({ where: { id } });
      return NextResponse.json({ ok: true, desasignadas: celdas.count });
    }
    if (tipo === 'asignatura') {
      const n = await prisma.docenteSeccion.count({ where: { asignaturaId: id } });
      if (n > 0) return NextResponse.json({ error: `Tiene ${n} celda(s) en la matriz docente-materia. Quita esas asignaciones primero.` }, { status: 400 });
      await prisma.asignatura.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  }
}
