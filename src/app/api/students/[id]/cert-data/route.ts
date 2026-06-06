import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseCertData, parsedToCertData } from '@/lib/parse-rawdata'

// GET /api/students/[id]/cert-data — Retorna datos de certificación parseados del rawData del estudiante
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    }

    // Parsear rawData del estudiante
    const parsed = parseCertData(student.rawData, student.plan)
    if (!parsed) {
      return NextResponse.json({ error: 'No se pudieron extraer datos de calificaciones del rawData' }, { status: 404 })
    }

    // Convertir al formato del frontend
    const certData = parsedToCertData(parsed, student)

    return NextResponse.json({
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
      parsed,
      certData,
    })
  } catch (error) {
    console.error('Error parsing cert data:', error)
    return NextResponse.json({ error: 'Error al procesar datos de calificaciones' }, { status: 500 })
  }
}
