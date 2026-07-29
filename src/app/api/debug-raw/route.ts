import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/debug-raw?cedula=... — muestra rawData de un estudiante para diagnóstico
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cedula = searchParams.get('cedula')

    const where = cedula ? { cedula, plan: 'vigente' as const } : { plan: 'vigente' as const }
    const student = await prisma.student.findFirst({ where, select: { cedula: true, apellidos: true, rawData: true } })

    if (!student) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const raw = JSON.parse(student.rawData)

    return NextResponse.json({
      cedula: student.cedula,
      apellidos: student.apellidos,
      _format: raw._format,
      secciones: raw.secciones,
      literalesFinales: raw.literalesFinales,
      grupos: raw.grupos,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
