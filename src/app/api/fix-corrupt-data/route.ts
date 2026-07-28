import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

/**
 * Endpoint para diagnosticar y corregir valores corruptos en rawData.
 * GET  ?mode=scan        → escanea TODOS los estudiantes y lista campos corruptos
 * POST ?mode=fix         → reemplaza valores corruptos con '*' (asterisco) en la BD
 * Solo aplica para el plan vigente.
 */

const CORRUPT_1900_RE = /^1900-\d{2}-\d{2}T00:00:00$/
const CORRUPT_TIME_RE = /^0?0:00:00$/

function isCorrupt(val: unknown): boolean {
  if (typeof val !== 'string') return false
  return CORRUPT_1900_RE.test(val) || CORRUPT_TIME_RE.test(val)
}

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get('plan') || 'vigente'

  try {
    const db = getDb(plan)
    const students = await db.student.findMany({
      select: { id: true, cedula: true, rawData: true },
      orderBy: { cedula: 'asc' },
    })

    const results: Array<{
      cedula: string
      field: string
      currentValue: string
    }> = []

    let totalCorrupt = 0
    let studentsAffected = 0

    for (const s of students) {
      if (!s.rawData || s.rawData === '{}') continue
      let parsed: Record<string, unknown>
      try { parsed = JSON.parse(s.rawData) } catch { continue }

      let studentHasCorrupt = false
      for (const [key, val] of Object.entries(parsed)) {
        if (isCorrupt(val)) {
          results.push({ cedula: s.cedula, field: key, currentValue: String(val) })
          totalCorrupt++
          studentHasCorrupt = true
        }
      }
      if (studentHasCorrupt) studentsAffected++
    }

    return NextResponse.json({
      plan,
      totalStudents: students.length,
      studentsAffected,
      totalCorruptFields: totalCorrupt,
      details: results,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get('plan') || 'vigente'

  try {
    const db = getDb(plan)
    const students = await db.student.findMany({
      select: { id: true, cedula: true, rawData: true },
      orderBy: { cedula: 'asc' },
    })

    const fixed: Array<{ cedula: string; field: string; oldValue: string; newValue: string }> = []
    let studentsUpdated = 0

    for (const s of students) {
      if (!s.rawData || s.rawData === '{}') continue
      let parsed: Record<string, unknown>
      try { parsed = JSON.parse(s.rawData) } catch { continue }

      let changed = false
      for (const [key, val] of Object.entries(parsed)) {
        if (isCorrupt(val)) {
          fixed.push({ cedula: s.cedula, field: key, oldValue: String(val), newValue: '*' })
          parsed[key] = '*'
          changed = true
        }
      }

      if (changed) {
        await db.student.update({
          where: { id: s.id },
          data: { rawData: JSON.stringify(parsed) },
        })
        studentsUpdated++
      }
    }

    return NextResponse.json({
      status: 'done',
      plan,
      studentsUpdated,
      totalFieldsFixed: fixed.length,
      details: fixed,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
