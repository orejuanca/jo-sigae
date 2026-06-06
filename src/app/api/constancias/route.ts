import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// School data for the exit certificate
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
    const { studentId, fechaEgreso, razon } = body;

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
        tipo: 'constancia_egreso',
        datos: JSON.stringify({
          school: SCHOOL_DATA,
          fechaEgreso: fechaEgreso || new Date().toISOString(),
          razon: razon || 'Egreso del plantel',
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
      fechaEgreso: fechaEgreso || new Date().toISOString(),
      razon: razon || 'Egreso del plantel',
    });
  } catch (error) {
    console.error('Constancia error:', error);
    return NextResponse.json({ error: 'Error al generar constancia' }, { status: 500 });
  }
}
