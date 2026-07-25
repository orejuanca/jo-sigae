import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import { buildDerogadoFlatMap } from '@/lib/build-derogado-flatmap'

// GET /api/debug-obs — Check flatmap output for OBS keys
export async function GET() {
  try {
    const db = getDb('derogado')
    const students = await db.student.findMany({
      where: { rawData: { not: '' } },
      take: 3,
      orderBy: { apellidos: 'asc' },
    })

    const results: any[] = []
    for (const student of students) {
      const rawObj = JSON.parse(student.rawData)
      const normalized: Record<string, any> = {}
      for (const [k, v] of Object.entries(rawObj)) {
        normalized[k.replace(/\u00b0/g, '')] = v
      }

      const flatmap = buildDerogadoFlatMap(normalized)

      // Extract only OBS and EPT keys from flatmap
      const obsKeys: Record<string, string> = {}
      const eptKeys: Record<string, string> = {}
      for (const [k, v] of Object.entries(flatmap)) {
        if (k.startsWith('OBS.')) obsKeys[k] = v
        if (k.startsWith('EPT.')) eptKeys[k] = v
      }

      // Also check the raw values at expected positions
      const raw320to329: Record<string, any> = {}
      for (let i = 320; i <= 329; i++) {
        raw320to329[String(i)] = normalized[String(i)]
      }

      results.push({
        cedula: student.cedula,
        nombre: `${student.apellidos}, ${student.nombres}`,
        raw320to329,
        flatmapObsKeys: obsKeys,
        flatmapEptKeys: eptKeys,
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
