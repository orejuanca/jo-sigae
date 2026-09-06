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
      { cedulaEscolar: { contains: q.toUpperCase() } },
      { apellidos: { contains: q.toUpperCase() } },
      { nombres: { contains: q.toUpperCase() } },
    ],
  };
  // Resultados por CÉDULA de menor a mayor (regla de la escuela); tope 25 resultados
  const encontrados = await prisma.alumno.findMany({ where: donde, take: 200 });
  const cedNum = (c: string) => { const n = Number((c || '').replace(/\D/g, '')); return isFinite(n) ? n : Number.MAX_SAFE_INTEGER; };
  const alumnos = encontrados.sort((a, b) => cedNum(a.cedula) - cedNum(b.cedula) || a.cedula.localeCompare(b.cedula)).slice(0, 25);
  let inscritos: { alumnoId: string; seccion: { grado: string; codigo: string } }[] = [];
  if (ano) {
    inscritos = await prisma.inscripcion.findMany({ where: { anoEscolarId: ano.id, activo: true }, include: { seccion: true } });
  }
  // Etiquetas por alumno de TODAS sus inscripciones activas en el año (regular + MP)
  const etq = (g: string, c: string) => (c === 'MP' ? `${g}° MP` : `${g}° ${c}`);
  const porAlumno = new Map<string, { etiquetas: string[]; regular: string | null }>();
  for (const i of inscritos) {
    const e = porAlumno.get(i.alumnoId) ?? { etiquetas: [], regular: null };
    const label = etq(i.seccion.grado, i.seccion.codigo);
    e.etiquetas.push(label);
    if (i.seccion.codigo !== 'MP') e.regular = label;
    porAlumno.set(i.alumnoId, e);
  }
  return NextResponse.json({
    alumnos: alumnos.map(a => {
      const e = porAlumno.get(a.id);
      return {
        ...a,
        inscritoEn: e ? e.etiquetas.join(' + ') : null,
        inscritoRegularEn: e?.regular ?? null,
        inscritoEnLista: e?.etiquetas ?? [],
      };
    }),
  });
}
