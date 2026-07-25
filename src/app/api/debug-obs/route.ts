import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/debug-obs — Inspeccionar rawData de BD2 para encontrar claves de observaciones
export async function GET() {
  try {
    const db = getDb('derogado')
    // Buscar un estudiante derogado que tenga rawData
    const student = await db.student.findFirst({
      where: { rawData: { not: '' } },
    })
    if (!student) {
      return NextResponse.json({ error: 'No hay estudiantes derogado con rawData' }, { status: 404 })
    }

    const rawObj = JSON.parse(student.rawData)
    // Normalizar claves
    const normalized: Record<string, any> = {}
    for (const [k, v] of Object.entries(rawObj)) {
      normalized[k.replace(/\u00b0/g, '')] = v
    }

    // Listar TODAS las claves numéricas con sus valores
    const numericKeys: Record<string, any> = {}
    for (const [k, v] of Object.entries(normalized)) {
      const n = parseInt(k)
      if (!isNaN(n) && n >= 290) {
        numericKeys[k] = v
      }
    }

    // También buscar claves que contengan 'obs' o 'OBS' (case insensitive)
    const obsKeys: Record<string, any> = {}
    for (const [k, v] of Object.entries(normalized)) {
      if (k.toLowerCase().includes('obs')) {
        obsKeys[k] = v
      }
    }

    // Listar todas las claves del rawData
    const allKeys = Object.keys(normalized).sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      if (!isNaN(na)) return -1
      if (!isNaN(nb)) return 1
      return a.localeCompare(b)
    })

    return NextResponse.json({
      student: { id: student.id, cedula: student.cedula, apellidos: student.apellidos, nombres: student.nombres },
      allKeys,
      keysAbove290: numericKeys,
      obsRelatedKeys: obsKeys,
      totalKeys: allKeys.length,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
