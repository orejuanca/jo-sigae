import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import { parseCertData, parsedToCertData } from '@/lib/parse-rawdata'

// GET /api/students/[id]/cert-data — Retorna datos de certificación parseados del rawData del estudiante
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'
    const db = getDb(plan)
    const student = await db.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    }

    // Check if rawData has actual data
    if (!student.rawData || student.rawData === '{}' || student.rawData === '') {
      console.error(`[cert-data] Student ${student.cedula} (${student.id}) has empty rawData`)
      return NextResponse.json({
        error: 'El estudiante no tiene datos de calificaciones en la base de datos',
        studentId: student.id,
        cedula: student.cedula,
        reason: 'empty_rawData',
      }, { status: 404 })
    }

    // Parsear rawData del estudiante
    const parsed = parseCertData(student.rawData, student.plan)

    // For plan derogado: always expose raw field map even if parsing fails
    const rawDataFlat = plan === 'derogado' && student.rawData ? JSON.parse(student.rawData) : null

    if (!parsed) {
      // If we have rawDataFlat for derogado, return it anyway (frontend can use rawData.* bindings)
      if (rawDataFlat && Object.keys(rawDataFlat).length > 0) {
        console.warn(`[cert-data] parseCertData failed for ${student.cedula} but rawDataFlat has ${Object.keys(rawDataFlat).length} keys, returning rawDataFlat only`)
        return NextResponse.json({
          student: {
            id: student.id, cedula: student.cedula,
            apellidos: student.apellidos, nombres: student.nombres,
            fechaNacimiento: student.fechaNacimiento, pais: student.pais,
            estado: student.estado, municipio: student.municipio, plan: student.plan,
          },
          certData: null,
          gradeCount: 0,
          rawDataFlat,
        })
      }
      console.error(`[cert-data] Failed to parse rawData for student ${student.cedula} (${student.id}), rawData length: ${student.rawData.length}, plan: ${student.plan}`)
      return NextResponse.json({
        error: 'No se pudieron extraer datos de calificaciones del rawData',
        studentId: student.id, cedula: student.cedula, reason: 'parse_error', rawDataLength: student.rawData.length,
      }, { status: 404 })
    }

    // Convertir al formato del frontend
    const certData = parsedToCertData(parsed, student)

    const gradeCount = Object.values(certData.calificaciones).flat().filter(c => c.nota && c.nota !== '').length

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
      gradeCount,
      rawDataFlat,
    })
  } catch (error) {
    console.error('Error parsing cert data:', error)
    return NextResponse.json({ error: 'Error al procesar datos de calificaciones', details: String(error) }, { status: 500 })
  }
}
