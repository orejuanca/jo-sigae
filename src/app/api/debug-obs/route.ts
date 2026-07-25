import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/debug-obs — Find students with real observation data in BD2
export async function GET() {
  try {
    const db = getDb('derogado')
    const students = await db.student.findMany({
      where: { rawData: { not: '' } },
      take: 200,
      orderBy: { apellidos: 'asc' },
    })

    // Find students with real text in keys 320-363
    const withRealObs: any[] = []
    for (const student of students) {
      const rawObj = JSON.parse(student.rawData)
      const normalized: Record<string, any> = {}
      for (const [k, v] of Object.entries(rawObj)) {
        normalized[k.replace(/\u00b0/g, '')] = v
      }

      // Check keys 290-363 for real text (not null, not "", not "*" variants)
      const realEntries: Record<string, any> = {}
      for (let i = 290; i <= 363; i++) {
        const k = String(i)
        const val = normalized[k]
        if (val === null || val === undefined) continue
        const s = String(val).trim()
        if (s === '' || /^\*+$/.test(s)) continue
        realEntries[k] = s
      }

      // Also check for non-numeric keys
      const nonNumericReal: Record<string, any> = {}
      for (const [k, v] of Object.entries(normalized)) {
        if (/^\d+$/.test(k)) continue
        if (v === null || v === undefined) continue
        const s = String(v).trim()
        if (s === '') continue
        nonNumericReal[k] = s
      }

      if (Object.keys(realEntries).length > 0 || Object.keys(nonNumericReal).length > 0) {
        withRealObs.push({
          cedula: student.cedula,
          nombre: `${student.apellidos}, ${student.nombres}`,
          realKeys290to363: realEntries,
          nonNumericKeys: nonNumericReal,
        })
        if (withRealObs.length >= 10) break
      }
    }

    return NextResponse.json({ count: withRealObs.length, students: withRealObs })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
