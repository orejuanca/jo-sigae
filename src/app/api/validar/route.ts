import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const issues: string[] = [];

    // Validate basic fields
    if (!student.cedula || student.cedula.trim() === '') {
      issues.push('Cédula vacía o no válida');
    }
    if (!student.apellidos || student.apellidos.trim() === '') {
      issues.push('Apellidos vacíos');
    }
    if (!student.nombres || student.nombres.trim() === '') {
      issues.push('Nombres vacíos');
    }
    if (!student.fechaNacimiento) {
      issues.push('Fecha de nacimiento no registrada');
    }

    // Check for placeholder data
    Object.keys(rawData).forEach(key => {
      const val = String(rawData[key] || '');
      if (val === '*' || val === '**' || val.startsWith('* *')) {
        // skip placeholders
      }
    });

    // Check grades consistency
    const gradeKeys = Object.keys(rawData).filter(k => {
      const n = parseInt(k);
      return n >= 23 && n <= 220;
    });

    let totalGrades = 0;
    let validGrades = 0;
    for (let i = 0; i < gradeKeys.length - 4; i += 5) {
      const nota = String(rawData[gradeKeys[i]] || '').trim();
      const tipo = String(rawData[gradeKeys[i + 1]] || '').trim();
      const year = String(rawData[gradeKeys[i + 4]] || '').trim();

      if (year && nota) {
        totalGrades++;
        const numNota = parseInt(nota);
        if (numNota >= 10 && numNota <= 20) {
          validGrades++;
        } else if (nota !== 'EX' && nota !== 'EXONERADA') {
          issues.push(`Nota inválida en columna ${gradeKeys[i]}: "${nota}" (año ${year})`);
        }
      }
    }

    if (totalGrades === 0) {
      issues.push('No se encontraron calificaciones registradas');
    }

    // Check for missing years
    const years = new Set<string>();
    for (let i = 0; i < gradeKeys.length - 4; i += 5) {
      const year = String(rawData[gradeKeys[i + 4]] || '').trim();
      if (year) years.add(year);
    }
    if (years.size > 0) {
      const yearList = Array.from(years).sort();
      issues.push(`Años escolares encontrados: ${yearList.join(', ')}`);
    }

    return NextResponse.json({
      student: {
        id: student.id,
        cedula: student.cedula,
        apellidos: student.apellidos,
        nombres: student.nombres,
      },
      issues: issues.length > 0 ? issues : ['Sin problemas encontrados. Los datos son consistentes.'],
      totalGrades,
      validGrades,
      isValid: issues.length === 0,
    });
  } catch (error) {
    console.error('Validar error:', error);
    return NextResponse.json({ error: 'Error al validar notas' }, { status: 500 });
  }
}
