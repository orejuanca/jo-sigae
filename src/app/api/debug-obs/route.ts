import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import { buildDerogadoFlatMap } from '@/lib/build-derogado-flatmap'

// GET /api/debug-obs — Final check: full flatmap OBS section
export async function GET() {
  try {
    const db = getDb('derogado')
    const students = await db.student.findMany({
      where: { rawData: { not: '' } },
      take: 2,
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

      results.push({
        cedula: student.cedula,
        nombre: `${student.apellidos}, ${student.nombres}`,
        // ALL keys that start with OBS
        obsEntries: Object.fromEntries(
          Object.entries(flatmap).filter(([k]) => k.startsWith('OBS.'))
        ),
        // Also check key 344 specifically
        key344: flatmap['344'],
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
