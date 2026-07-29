// Endpoint temporal de diagnóstico — mostrar rawData real de un alumno
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const q = searchParams.get('q') || ''

    const db = getDb(plan)

    let student
    if (q) {
      student = await db.student.findFirst({
        where: {
          plan,
          OR: [
            { cedula: { contains: q } },
            { apellidos: { contains: q, mode: 'insensitive' as const } },
          ],
        },
      })
    } else {
      student = await db.student.findFirst({ where: { plan } })
    }

    if (!student) {
      return NextResponse.json({ error: 'No se encontró alumno' }, { status: 404 })
    }

    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(student.rawData)
    } catch { parsed = { _error: 'rawData no es JSON válido', _raw: student.rawData?.substring(0, 200) } }

    return NextResponse.json({
      id: student.id,
      cedula: student.cedula,
      apellidos: student.apellidos,
      nombres: student.nombres,
      rawDataLength: student.rawData?.length || 0,
      rawDataFirst500: student.rawData?.substring(0, 500),
      parsedKeys: Object.keys(parsed),
      _format: parsed._format,
      hasCalificaciones: Array.isArray(parsed.calificaciones),
      calificacionesCount: Array.isArray(parsed.calificaciones) ? parsed.calificaciones.length : 0,
      firstCal: Array.isArray(parsed.calificaciones) && parsed.calificaciones.length > 0
        ? parsed.calificaciones[0]
        : null,
      hasNumericKeys: Object.keys(parsed).some(k => /^\d+$/.test(k)),
      sampleKeys: Object.keys(parsed).slice(0, 20),
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
