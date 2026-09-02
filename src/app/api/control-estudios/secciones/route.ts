import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const ano = await prisma.anoEscolar.findFirst({
    where: { activo: true },
    include: {
      secciones: {
        orderBy: [{ grado: 'asc' }, { codigo: 'asc' }],
        include: { _count: { select: { docenteSecc: true, inscripciones: { where: { activo: true } } } } },
      },
    },
  });
  if (!ano) return NextResponse.json({ error: 'No hay año activo' }, { status: 404 });
  return NextResponse.json({ ano, secciones: ano.secciones });
}

// POST: crear seccion (una, o lote A-I por grado)
export async function POST(req: NextRequest) {
  const { grado, codigo, tipo, lote } = await req.json();
  const ano = await prisma.anoEscolar.findFirst({ where: { activo: true } });
  if (!ano) return NextResponse.json({ error: 'No hay año activo' }, { status: 404 });

  const crear = async (g: string, c: string, t: string) => {
    const existe = await prisma.seccion.findUnique({
      where: { anoEscolarId_grado_codigo: { anoEscolarId: ano.id, grado: g, codigo: c } },
    });
    if (existe) return null;
    return prisma.seccion.create({ data: { anoEscolarId: ano.id, grado: g, codigo: c, tipo: t } });
  };

  if (lote) {
    // lote: {grado:'1', letras:['A'..'I']} o mp:true
    let n = 0;
    for (const letra of lote.letras ?? []) { if (await crear(lote.grado, letra, 'REGULAR')) n++; }
    if (lote.mp && (await crear(lote.grado, 'MP', 'MP'))) n++;
    return NextResponse.json({ ok: true, creadas: n });
  }
  if (!grado || !codigo) return NextResponse.json({ error: 'grado y codigo requeridos' }, { status: 400 });
  const s = await crear(String(grado), String(codigo).toUpperCase(), tipo === 'MP' ? 'MP' : 'REGULAR');
  if (!s) return NextResponse.json({ error: 'Ya existe esa sección' }, { status: 400 });
  return NextResponse.json({ ok: true, seccion: s });
}

// DELETE: eliminar seccion (solo si sin inscripciones)
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const insc = await prisma.inscripcion.count({ where: { seccionId: id, activo: true } });
  if (insc > 0) return NextResponse.json({ error: `Tiene ${insc} alumnos inscritos` }, { status: 400 });
  await prisma.docenteSeccion.deleteMany({ where: { seccionId: id } });
  await prisma.seccion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
