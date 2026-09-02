import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const [asignaturas, docentes] = await Promise.all([
    prisma.asignatura.findMany({ orderBy: { orden: 'asc' } }),
    prisma.docente.findMany({ orderBy: { nombre: 'asc' } }),
  ]);
  return NextResponse.json({ asignaturas, docentes });
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
