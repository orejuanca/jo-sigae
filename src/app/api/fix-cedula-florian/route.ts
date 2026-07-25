import { NextResponse } from 'next/server'
import { dbVigente, dbDerogado } from '@/lib/db-helper'

const CORRECT_CEDULA = 'E 84397537'
// All possible wrong variants that need fixing
const WRONG_VARIANTS = ['E843975379', 'E 843975379']

// One-time fix v3: correct cedula for FLORIAN VILLARREAL, DIANA MARCELA
// Handles case where v1 already added space but left the extra "9"
export async function GET() {
  const results: Record<string, unknown>[] = []

  for (const [label, db] of [['BD (vigente)', dbVigente], ['BD2 (derogado)', dbDerogado]] as const) {
    try {
      // Search by name since cedula field may be in any of the wrong variants
      const student = await db.student.findFirst({
        where: {
          apellidos: { contains: 'FLORIAN VILLARREAL' },
          nombres: { contains: 'DIANA MARCELA' },
        },
      })

      if (!student) {
        results.push({ db: label, status: 'not_found', searched: 'FLORIAN VILLARREAL' })
        continue
      }

      // Fix rawData: replace ALL wrong variants
      let updatedRawData = student.rawData
      let rawDataFixed = false
      if (updatedRawData) {
        for (const wrong of WRONG_VARIANTS) {
          if (updatedRawData.includes(wrong)) {
            updatedRawData = updatedRawData.replaceAll(wrong, CORRECT_CEDULA)
            rawDataFixed = true
          }
        }
      }

      const updated = await db.student.update({
        where: { id: student.id },
        data: {
          cedula: CORRECT_CEDULA,
          rawData: updatedRawData,
        },
      })

      results.push({
        db: label,
        status: 'updated',
        id: updated.id,
        oldCedula: student.cedula,
        newCedula: updated.cedula,
        nombre: `${updated.apellidos}, ${updated.nombres}`,
        rawDataFixed,
        rawDataLength: updated.rawData?.length,
      })
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      results.push({ db: label, status: 'error', error: err.code || err.message })
    }
  }

  return NextResponse.json({
    action: 'fix_cedula_florian_v3',
    timestamp: new Date().toISOString(),
    results,
  })
}
