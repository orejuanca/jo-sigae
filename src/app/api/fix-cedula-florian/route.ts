import { NextResponse } from 'next/server'
import { dbVigente, dbDerogado } from '@/lib/db-helper'

const OLD_CEDULA = 'E843975379'
const NEW_CEDULA = 'E 84397537'

// One-time fix: correct cedula for FLORIAN VILLARREAL, DIANA MARCELA
// Searches both databases (vigente and derogado)
export async function GET() {
  const results: Record<string, unknown>[] = []

  for (const [label, db] of [['vigente', dbVigente], ['derogado', dbDerogado]] as const) {
    try {
      const student = await db.student.findUnique({ where: { cedula: OLD_CEDULA } })

      if (!student) {
        results.push({ db: label, status: 'not_found', searched: OLD_CEDULA })
        continue
      }

      // Also fix CEDULA inside rawData JSON if present
      let updatedRawData = student.rawData
      if (updatedRawData && updatedRawData !== '{}') {
        try {
          const rawObj = JSON.parse(updatedRawData)
          if (rawObj.CEDULA === OLD_CEDULA) {
            rawObj.CEDULA = NEW_CEDULA
            updatedRawData = JSON.stringify(rawObj)
          }
        } catch { /* keep original rawData if not valid JSON */ }
      }

      const updated = await db.student.update({
        where: { id: student.id },
        data: {
          cedula: NEW_CEDULA,
          ...(updatedRawData !== student.rawData ? { rawData: updatedRawData } : {}),
        },
      })

      results.push({
        db: label,
        status: 'updated',
        id: updated.id,
        oldCedula: OLD_CEDULA,
        newCedula: updated.cedula,
        nombre: `${updated.apellidos}, ${updated.nombres}`,
        rawDataFixed: updatedRawData !== student.rawData,
      })
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      results.push({ db: label, status: 'error', error: err.code || err.message })
    }
  }

  return NextResponse.json({
    action: 'fix_cedula_florian',
    timestamp: new Date().toISOString(),
    results,
  })
}
