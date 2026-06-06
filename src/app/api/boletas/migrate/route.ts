import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST() {
  try {
    const filePath = join(process.cwd(), 'db', 'boletas_data.json');
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    const { anioEscolar, grado, estudiantes } = data;

    // Get student IDs
    const cedulas = [...new Set(estudiantes.map((e: { cedula: string }) => e.cedula))];
    const students = await prisma.student.findMany({
      where: { cedula: { in: cedulas } },
      select: { id: true, cedula: true, seccion: true },
    });
    const cedulaMap = new Map<string, { id: string; seccion: string }>();
    students.forEach((s) => cedulaMap.set(s.cedula, { id: s.id, seccion: s.seccion }));

    // Update sections where empty
    let updatedSections = 0;
    for (const est of estudiantes) {
      const s = cedulaMap.get(est.cedula);
      if (s && !s.seccion && est.seccion) {
        await prisma.student.update({ where: { id: s.id }, data: { seccion: est.seccion } });
        updatedSections++;
      }
    }

    // Clear existing notas for this period
    await prisma.boletaNota.deleteMany({ where: { anioEscolar, grado } });

    // Insert all notas
    let createdNotas = 0;
    let notFound = 0;

    for (const est of estudiantes) {
      const s = cedulaMap.get(est.cedula);
      if (!s) { notFound++; continue; }

      for (const [materia, notas] of Object.entries(est.notas as Record<string, Record<string, string>>)) {
        await prisma.boletaNota.create({
          data: {
            studentId: s.id,
            anioEscolar,
            grado,
            seccion: est.seccion,
            materia,
            lapso1: notas.lapso1 || null,
            lapso2: notas.lapso2 || null,
            lapso3: notas.lapso3 || null,
          },
        });
        createdNotas++;
      }
    }

    // Summary
    const summary = await prisma.boletaNota.groupBy({
      by: ['seccion'],
      _count: true,
      where: { anioEscolar, grado },
    });

    return NextResponse.json({
      success: true,
      anioEscolar,
      grado,
      matchedStudents: cedulaMap.size,
      updatedSections,
      createdNotas,
      notFound,
      bySection: summary.map((s) => ({ seccion: s.seccion, count: s._count })),
    });
  } catch (error) {
    console.error('Migrate error:', error);
    return NextResponse.json({ error: 'Error en migración' }, { status: 500 });
  }
}
