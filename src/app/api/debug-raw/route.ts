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

    // Mostrar valores de las columnas clave
    const cols: Record<string, string> = {}
    for (const k of ['228','229','230','231','232', '233','234','235','236','237', '238','239','240','241','242', '243','244','245','246','247', '248','249','250','251','252', '253','254','255','256','257','258','259','260','261']) {
      cols[k] = raw[k] != null ? String(raw[k]) : '(vacío)'
    }

    return NextResponse.json({
      cedula: student.cedula,
      apellidos: student.apellidos,
      cols,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
