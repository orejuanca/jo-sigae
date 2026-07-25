import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/debug-obs — Inspeccionar rawData de BD2 para encontrar claves de observaciones
export async function GET() {
  try {
    const db = getDb('derogado')
    // Buscar estudiantes con datos reales en claves altas
    const students = await db.student.findMany({
      where: { rawData: { not: '' } },
      take: 50,
      orderBy: { apellidos: 'asc' },
    })

    // Mostrar los primeros 5 estudiantes que tengan datos reales arriba de 298
    const withRealData: any[] = []
    for (const student of students) {
      if (withRealData.length >= 5) break
      const rawObj = JSON.parse(student.rawData)
      const normalized: Record<string, any> = {}
      for (const [k, v] of Object.entries(rawObj)) {
        normalized[k.replace(/\u00b0/g, '')] = v
      }

      const highKeys: Record<string, any> = {}
      for (const [k, v] of Object.entries(normalized)) {
        const n = parseInt(k)
        if (!isNaN(n) && n >= 335) {
          highKeys[k] = v
        }
      }

      const hasReal = Object.entries(highKeys).some(([k, v]) => {
        const s = String(v || '').trim()
        return s !== '' && s !== '*' && s !== '**' && s !== '***' && s !== '****' && s !== '*****'
      })

      if (hasReal) {
        withRealData.push({
          cedula: student.cedula,
          nombre: `${student.apellidos}, ${student.nombres}`,
          keys335to363: highKeys,
        })
      }
    }

    return NextResponse.json({ studentsWithRealData: withRealData })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
