import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/debug-obs — Inspeccionar rawData de BD2 para encontrar claves de observaciones
export async function GET() {
  try {
    const db = getDb('derogado')
    // Buscar varios estudiantes para encontrar uno con obs reales
    const students = await db.student.findMany({
      where: { rawData: { not: '' } },
      take: 20,
      orderBy: { apellidos: 'asc' },
    })

    const results: any[] = []
    for (const student of students) {
      const rawObj = JSON.parse(student.rawData)
      const normalized: Record<string, any> = {}
      for (const [k, v] of Object.entries(rawObj)) {
        normalized[k.replace(/\u00b0/g, '')] = v
      }

      // Buscar claves numéricas >= 335 que tengan datos que NO sean solo asteriscos
      const highKeys: Record<string, any> = {}
      for (const [k, v] of Object.entries(normalized)) {
        const n = parseInt(k)
        if (!isNaN(n) && n >= 290) {
          highKeys[k] = v
        }
      }

      // Verificar si tiene datos no-asterisco arriba de 298
      const hasRealObsData = Object.entries(highKeys).some(([k, v]) => {
        const n = parseInt(k)
        if (n <= 298) return false
        const s = String(v || '').trim()
        return s !== '' && s !== '*' && s !== '**' && s !== '***' && s !== '****' && s !== '*****'
      })

      results.push({
        student: { id: student.id, cedula: student.cedula, apellidos: student.apellidos, nombres: student.nombres },
        totalKeys: Object.keys(normalized).length,
        maxKey: Math.max(...Object.keys(normalized).map(k => { const n = parseInt(k); return isNaN(n) ? 0 : n })),
        keysAbove298: highKeys,
        hasRealObsData,
      })

      // Si encontramos uno con datos reales, incluir su rawData completo de keys >= 290
      if (hasRealObsData) {
        // Ya incluido arriba
        break
      }
    }

    // También mostrar TODOS los estudiantes con sus keysAbove298 resumido
    const summary = results.map(r => ({
      cedula: r.student.cedula,
      nombre: `${r.student.apellidos}, ${r.student.nombres}`,
      maxKey: r.maxKey,
      hasRealObsData: r.hasRealObsData,
      keysAbove298Count: Object.keys(r.keysAbove298).length,
    }))

    // Devolver el primero con datos reales, o si no hay, el primero con maxKey alto
    const withData = results.find(r => r.hasRealObsData)
    const target = withData || results[0]

    return NextResponse.json({ summary, target })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
