import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/certificaciones — generate a certification document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, observaciones } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'ID de alumno requerido' }, { status: 400 });
    }

    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const rawData = JSON.parse(student.rawData);

    // Extract schools attended
    const schools: { name: string; location: string; code: string }[] = [];
    const schoolKeys = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];

    for (let i = 0; i < schoolKeys.length; i += 3) {
      const name = (rawData[schoolKeys[i]] || '').trim();
      const location = (rawData[schoolKeys[i + 1]] || '').trim();
      const code = (rawData[schoolKeys[i + 2]] || '').trim();
      if (name && !name.startsWith('*')) {
        schools.push({ name, location, code });
      }
    }

    // Extract grades by year (columns 23+: groups of 5: nota, tipo, seccion, lapso, año)
    const gradesByYear: Record<string, Array<{ nota: string; tipo: string; lapso: number }>> = {};
    const gradeKeys = Object.keys(rawData).filter(k => {
      const n = parseInt(k);
      return n >= 23 && n <= 220;
    });

    for (let i = 0; i < gradeKeys.length - 4; i += 5) {
      const nota = String(rawData[gradeKeys[i]] || '').trim();
      const tipo = String(rawData[gradeKeys[i + 1]] || '').trim();
      const lapso = parseInt(String(rawData[gradeKeys[i + 3]] || '0'));
      const year = String(rawData[gradeKeys[i + 4]] || '').trim();

      if (year && nota) {
        if (!gradesByYear[year]) gradesByYear[year] = [];
        gradesByYear[year].push({ nota, tipo, lapso });
      }
    }

    // Extract observations
    const observations: string[] = [];
    for (let i = 233; i <= 250; i++) {
      const val = String(rawData[String(i)] || '').trim();
      if (val && val !== '*' && !val.startsWith('*')) {
        observations.push(val);
      }
    }

    // Save certification record
    const certification = await db.certification.create({
      data: {
        studentId,
        tipo: 'certificacion',
        datos: JSON.stringify({
          schools,
          gradesByYear,
          observations,
          observaciones: observaciones || '',
        }),
      },
    });

    return NextResponse.json({
      certification,
      student: {
        id: student.id,
        cedula: student.cedula,
        apellidos: student.apellidos,
        nombres: student.nombres,
        fechaNacimiento: student.fechaNacimiento,
        pais: student.pais,
        estado: student.estado,
        municipio: student.municipio,
        plan: student.plan,
      },
      schools,
      gradesByYear,
      observations,
    });
  } catch (error) {
    console.error('Certificacion error:', error);
    return NextResponse.json({ error: 'Error al generar certificación' }, { status: 500 });
  }
}
