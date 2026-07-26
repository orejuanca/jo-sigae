import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import { parseCertData } from '@/lib/parse-rawdata'

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'

    if (!id) {
      return NextResponse.json({ error: 'Falta parametro id' }, { status: 400 })
    }

    const db = getDb(plan)
    const student = await db.student.findUnique({ where: { id } })

    if (!student) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    }

    const rawData = JSON.parse(student.rawData || '{}')
    const allKeys = Object.keys(rawData)
    const format = rawData._format || 'desconocido'

    // Sample keys 1-30 para ver si hay desplazamiento
    const sampleKeys: Record<string, string> = {}
    for (let i = 1; i <= 30; i++) {
      const val = rawData[String(i)]
      if (val !== undefined && val !== null) {
        sampleKeys[String(i)] = String(val).substring(0, 60)
      }
    }

    // Instituciones
    const instituciones = rawData.instituciones
    const calificaciones = rawData.calificaciones

    // Primeras 3 calificaciones
    const firstCals = Array.isArray(calificaciones)
      ? calificaciones.slice(0, 3).map((c: any, i: number) => ({
          idx: i,
          materia: c.materia,
          anioEscolar: c.anioEscolar,
          nota: c.nota,
          eval: c.eval,
          mes: c.mes,
          anio: c.anio,
          inst: c.inst,
        }))
      : null

    // Parsear para ver resultado
    const parsed = parseCertData(student.rawData, student.plan)

    return NextResponse.json({
      id: student.id,
      cedula: student.cedula,
      plan: student.plan,
      format,
      totalKeys: allKeys.length,
      allKeys: allKeys.sort((a, b) => {
        const na = parseInt(a), nb = parseInt(b)
        if (!isNaN(na) && !isNaN(nb)) return na - nb
        if (!isNaN(na)) return -1
        if (!isNaN(nb)) return 1
        return a.localeCompare(b)
      }),
      sampleKeys,
      instituciones,
      calificacionesCount: Array.isArray(calificaciones) ? calificaciones.length : 0,
      firstCalificaciones: firstCals,
      parsedCalificaciones: parsed ? Object.keys(parsed.calificaciones) : [],
      parsedCalifCounts: parsed
        ? Object.entries(parsed.calificaciones).map(([k, v]) => ({ year: k, count: (v as any[]).length }))
        : [],
      parsedInstituciones: parsed?.instituciones?.length || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
