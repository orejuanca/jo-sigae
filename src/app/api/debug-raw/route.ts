import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cedula = searchParams.get('cedula')

    const where = cedula ? { cedula, plan: 'vigente' as const } : { plan: 'vigente' as const }
    const student = await prisma.student.findFirst({ where, select: { cedula: true, apellidos: true, rawData: true } })

    if (!student) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    let raw: Record<string, unknown>
    try { raw = JSON.parse(student.rawData) } catch { return NextResponse.json({ cedula: student.cedula, parseError: true, rawData: student.rawData?.substring(0, 500) }) }

    return NextResponse.json({
      cedula: student.cedula,
      apellidos: student.apellidos,
      _format: raw._format,
      _plan: raw._plan,
      tieneSecciones: 'secciones' in raw,
      tieneLiterales: 'literalesFinales' in raw,
      tieneGrupos: 'grupos' in raw,
      secciones: raw.secciones,
      literalesFinales: raw.literalesFinales,
      gruposCount: Array.isArray(raw.grupos) ? raw.grupos.length : 0,
      grupos: Array.isArray(raw.grupos) ? raw.grupos.map((g: Record<string, unknown>) => ({ grupo: g.grupo, literal: g.literal })) : null,
      rawKeys: Object.keys(raw).filter(k => !k.startsWith('calificaciones') && !k.startsWith('instituciones') && !k.startsWith('orientacion') && !k.startsWith('observaciones')),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
