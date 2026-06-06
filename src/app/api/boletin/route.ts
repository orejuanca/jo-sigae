import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Subject names by grade level
const MATERIAS = [
  'Castellano y Literatura',
  'Matemáticas',
  'Ciencias de la Naturaleza',
  'Ciencias Sociales',
  'Educación Física',
  'Inglés',
  'Artes Educativas',
  'Tecnología',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'ID de alumno requerido' }, { status: 400 });
    }

    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const rawData = JSON.parse(student.rawData);

    // Build grades structure: { año: { lapso: { materia: { nota, tipo } } } }
    const boletin: Record<string, Record<string, Array<{ materia: string; nota: string; tipo: string }>>> = {};
    const gradeKeys = Object.keys(rawData).filter(k => {
      const n = parseInt(k);
      return n >= 23 && n <= 220;
    });

    let subjectIndex = 0;
    for (let i = 0; i < gradeKeys.length - 4; i += 5) {
      const nota = String(rawData[gradeKeys[i]] || '').trim();
      const tipo = String(rawData[gradeKeys[i + 1]] || '').trim();
      const lapso = String(rawData[gradeKeys[i + 3]] || '').trim();
      const year = String(rawData[gradeKeys[i + 4]] || '').trim();

      if (year && nota) {
        if (!boletin[year]) boletin[year] = {};
        if (!boletin[year][lapso]) boletin[year][lapso] = [];
        boletin[year][lapso].push({
          materia: MATERIAS[subjectIndex % MATERIAS.length] || `Materia ${subjectIndex + 1}`,
          nota,
          tipo,
        });
        subjectIndex++;
      }
    }

    return NextResponse.json({
      student: {
        id: student.id,
        cedula: student.cedula,
        apellidos: student.apellidos,
        nombres: student.nombres,
      },
      boletin,
      materias: MATERIAS,
    });
  } catch (error) {
    console.error('Boletin error:', error);
    return NextResponse.json({ error: 'Error al obtener boletín' }, { status: 500 });
  }
}
