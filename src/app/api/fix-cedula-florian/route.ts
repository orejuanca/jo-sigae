import { NextResponse } from 'next/server'
import { dbVigente, dbDerogado } from '@/lib/db-helper'

const OLD_CEDULA = 'E843975379'
const NEW_CEDULA = 'E 84397537'

// One-time fix: correct cedula for FLORIAN VILLARREAL, DIANA MARCELA
// Searches both databases (vigente and derogado)
// v2: replaces ALL occurrences of old cedula inside rawData (not just top-level CEDULA key)
export async function GET() {
  const results: Record<string, unknown>[] = []

  for (const [label, db] of [['BD (vigente)', dbVigente], ['BD2 (derogado)', dbDerogado]] as const) {
    try {
      const student = await db.student.findUnique({ where: { cedula: OLD_CEDULA } })

      if (!student) {
        // Also try searching by name in case cedula was already fixed but rawData wasn't
        const byName = await db.student.findFirst({
          where: {
            apellidos: { contains: 'FLORIAN VILLARREAL' },
            nombres: { contains: 'DIANA MARCELA' },
          },
        })
        if (byName) {
          // Fix rawData only
          let rawDataFixed = false
          let updatedRawData = byName.rawData
          if (updatedRawData && updatedRawData.includes(OLD_CEDULA)) {
            updatedRawData = updatedRawData.replaceAll(OLD_CEDULA, NEW_CEDULA)
            rawDataFixed = true
          }
          if (rawDataFixed) {
            await db.student.update({
              where: { id: byName.id },
              data: { rawData: updatedRawData },
            })
            results.push({ db: label, status: 'rawdata_fixed', id: byName.id, cedula: byName.cedula, nombre: `${byName.apellidos}, ${byName.nombres}` })
          } else {
            results.push({ db: label, status: 'already_ok', id: byName.id, cedula: byName.cedula, nombre: `${byName.apellidos}, ${byName.nombres}`, rawDataSnippet: byName.rawData?.substring(0, 200) })
          }
        } else {
          results.push({ db: label, status: 'not_found', searched: OLD_CEDULA })
        }
        continue
      }

      // Fix rawData: replace ALL occurrences of old cedula string
      let updatedRawData = student.rawData
      let rawDataFixed = false
      if (updatedRawData && updatedRawData.includes(OLD_CEDULA)) {
        updatedRawData = updatedRawData.replaceAll(OLD_CEDULA, NEW_CEDULA)
        rawDataFixed = true
      }

      const updated = await db.student.update({
        where: { id: student.id },
        data: {
          cedula: NEW_CEDULA,
          rawData: updatedRawData,
        },
      })

      results.push({
        db: label,
        status: 'updated',
        id: updated.id,
        oldCedula: OLD_CEDULA,
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
    action: 'fix_cedula_florian_v2',
    timestamp: new Date().toISOString(),
    results,
  })
}
