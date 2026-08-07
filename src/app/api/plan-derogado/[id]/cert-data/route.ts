import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseCertData, parsedToCertData } from '@/lib/parse-rawdata'
import { buildDerogadoFlatMap } from '@/lib/build-derogado-flatmap'

// GET /api/plan-derogado/[id]/cert-data — Retorna datos de certificación desde PlanDerogado
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    // Check if rawData has actual data
    if (!record.rawData || record.rawData === '{}' || record.rawData === '') {
      console.error(`[plan-derogado cert-data] Record ${record.cedula} (${record.id}) has empty rawData`)
      return NextResponse.json({
        error: 'El estudiante no tiene datos de calificaciones en la base de datos',
        studentId: record.id,
        cedula: record.cedula,
        reason: 'empty_rawData',
      }, { status: 404 })
    }

    // Build flat map for rawData.* bindings
    let rawDataFlat: Record<string, string> | null = null
    const rawObj = JSON.parse(record.rawData)
    // Normalizar claves: quitar símbolo de grado (°) para que coincidan con "9", "10", etc.
    const normalizedObj: Record<string, any> = {}
    for (const [k, v] of Object.entries(rawObj)) { normalizedObj[k.replace(/\u00b0/g, '')] = v }
    rawDataFlat = buildDerogadoFlatMap(normalizedObj)

    const studentLike = {
      id: record.id,
      cedula: record.cedula,
      apellidos: record.apellidos,
      nombres: record.nombres,
      fechaNacimiento: record.fechaNacimiento || '',
      pais: record.pais || 'VENEZUELA',
      estado: record.estado || '',
      municipio: record.municipio || '',
      plan: 'derogado',
    }

    const parsed = parseCertData(record.rawData, 'derogado')

    if (!parsed) {
      // If we have rawDataFlat, return it anyway (frontend can use rawData.* bindings)
      if (rawDataFlat && Object.keys(rawDataFlat).length > 0) {
        console.warn(`[plan-derogado cert-data] parseCertData failed for ${record.cedula} but rawDataFlat has ${Object.keys(rawDataFlat).length} keys, returning rawDataFlat only`)
        return NextResponse.json({
          student: studentLike,
          certData: null,
          gradeCount: 0,
          rawDataFlat,
        })
      }
      console.error(`[plan-derogado cert-data] Failed to parse rawData for ${record.cedula} (${record.id}), rawData length: ${record.rawData.length}`)
      return NextResponse.json({
        error: 'No se pudieron extraer datos de calificaciones del rawData',
        studentId: record.id, cedula: record.cedula, reason: 'parse_error', rawDataLength: record.rawData.length,
      }, { status: 404 })
    }

    const certData = parsedToCertData(parsed!, studentLike)
    const gradeCount = Object.values(certData.calificaciones).flat().filter((c: any) => c.nota && c.nota !== '').length

    return NextResponse.json({
      student: studentLike,
      parsed,
      certData,
      gradeCount,
      rawDataFlat,
    })
  } catch (error) {
    console.error('GET /api/plan-derogado/[id]/cert-data:', error)
    return NextResponse.json({ error: 'Error al generar datos de certificacion', details: String(error) }, { status: 500 })
  }
}
