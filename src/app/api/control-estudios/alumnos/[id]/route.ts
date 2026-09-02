import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Campos de la sábana que se pueden editar desde la ficha (Bloque 1)
const CAMPOS_TEXTO = [
  'apellidos', 'nombres', 'sexo', 'fechaNac',
  'entidad', 'ef', 'estado', 'pais', 'localidad', 'direccion',
  'telefono', 'correo', 'serial', 'te', 'obsHr', 'cedulaEscolar',
  'repCedula', 'repNombre', 'repApellido', 'repAfinidad',
  'plantelProc1', 'plantelProc2', 'plantelProc3', 'plantelProc4', 'plantelProc5',
  'obsGenerales', 'eqv',
] as const;

// GET /api/control-estudios/alumnos/[id] — FICHA COMPLETA del alumno
// (todos los datos de la sábana + todas sus inscripciones con sección y año)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alumno = await prisma.alumno.findUnique({
      where: { id },
      include: {
        inscripciones: {
          include: { seccion: true, ano: true },
          orderBy: [{ anoEscolarId: 'asc' }],
        },
      },
    });
    if (!alumno) return NextResponse.json({ error: 'ALUMNO_NO_EXISTE' }, { status: 404 });
    return NextResponse.json({ alumno });
  } catch (e) {
    console.error('GET alumno[id]:', e);
    return NextResponse.json({ error: 'ERROR_FICHA', detalle: String(e) }, { status: 500 });
  }
}

// PATCH /api/control-estudios/alumnos/[id] — editar ficha (solo campos permitidos)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, string | null> = {};
    for (const k of CAMPOS_TEXTO) {
      if (k in body) {
        const v = body[k];
        if (v === null || v === undefined) data[k] = null;
        else if (typeof v === 'string') {
          const s = k === 'apellidos' || k === 'nombres' ? v.trim().toUpperCase() : v.trim();
          data[k] = s === '' ? null : s;
        }
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'SIN_CAMPOS' }, { status: 400 });
    }
    const alumno = await prisma.alumno.update({ where: { id }, data });
    return NextResponse.json({ ok: true, alumno });
  } catch (e) {
    console.error('PATCH alumno[id]:', e);
    return NextResponse.json({ error: 'ERROR_GUARDAR', detalle: String(e) }, { status: 500 });
  }
}
