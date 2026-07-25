import { NextResponse } from 'next/server'
import { dbVigente, dbDerogado } from '@/lib/db-helper'

export async function GET() {
  const names = [
    { apellidos: 'FLORIAN VILLARREAL', nombres: 'DIANA MARCELA' },
    { apellidos: 'FERNANDEZ OSORIO', nombres: 'JUAN FELIPE' },
  ]

  const results: any[] = []

  for (const [label, db] of [['BD (vigente)', dbVigente], ['BD2 (derogado)', dbDerogado]] as const) {
    for (const { apellidos, nombres } of names) {
      try {
        const student = await db.student.findFirst({
          where: { apellidos: { contains: apellidos }, nombres: { contains: nombres } },
        })
        if (student) {
          // Show first 20 keys of rawData
          let rawSample: Record<string, any> = {}
          try {
            const rawObj = JSON.parse(student.rawData)
            const keys = Object.keys(rawObj).slice(0, 20)
            for (const k of keys) rawSample[k] = rawObj[k]
          } catch { rawSample = { _error: 'invalid JSON', _length: student.rawData?.length } }

          results.push({
            db: label,
            cedula: student.cedula,
            nombre: `${student.apellidos}, ${student.nombres}`,
            plan: student.plan,
            rawDataLength: student.rawData?.length,
            rawDataFirst20Keys: rawSample,
            hasFlatInstKeys: (() => {
              try {
                const obj = JSON.parse(student.rawData)
                return Object.keys(obj).some((k) => { const n = parseInt(k); return n >= 8 && n <= 38 })
              } catch { return 'parse_error' }
            })(),
          })
        } else {
          results.push({ db: label, status: 'not_found', search: `${apellidos}, ${nombres}` })
        }
      } catch (error: unknown) {
        results.push({ db: label, search: `${apellidos}, ${nombres}`, error: String(error) })
      }
    }
  }

  return NextResponse.json({ timestamp: new Date().toISOString(), results })
}
