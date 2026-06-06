import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SCHOOL_DATA = {
  codigo: 'OD16751520',
  nombre: 'U E N CREACIÓN CÚA',
  direccion: 'Urb. José de S. Martín - Sector Los Bloques - Nueva Cúa',
  telefono: '(0239) 7163530',
  municipio: 'Rafael Urdaneta',
  entidad: 'Miranda',
  zonaEducativa: 'Miranda',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, grado, anioEscolar } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'ID de alumno requerido' }, { status: 400 });
    }

    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const certification = await db.certification.create({
      data: {
        studentId,
        tipo: 'titulo',
        datos: JSON.stringify({
          school: SCHOOL_DATA,
          grado: grado || '5° año',
          anioEscolar: anioEscolar || new Date().getFullYear().toString(),
        }),
      },
    });

    return NextResponse.json({
      certification,
      school: SCHOOL_DATA,
      student: {
        id: student.id,
        cedula: student.cedula,
        apellidos: student.apellidos,
        nombres: student.nombres,
        fechaNacimiento: student.fechaNacimiento,
        pais: student.pais,
        estado: student.estado,
        municipio: student.municipio,
      },
      grado: grado || '5° año',
      anioEscolar: anioEscolar || new Date().getFullYear().toString(),
    });
  } catch (error) {
    console.error('Titulo error:', error);
    return NextResponse.json({ error: 'Error al generar título' }, { status: 500 });
  }
}
