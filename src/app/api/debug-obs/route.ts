import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/debug-obs — Inspeccionar rawData de BD2 para encontrar claves de EPT y observaciones
export async function GET() {
  try {
    const db = getDb('derogado')
    const students = await db.student.findMany({
      where: { rawData: { not: '' } },
      take: 3,
      orderBy: { apellidos: 'asc' },
    })

    const results: any[] = []
    for (const student of students) {
      const rawObj = JSON.parse(student.rawData)
      const normalized: Record<string, any> = {}
      for (const [k, v] of Object.entries(rawObj)) {
        normalized[k.replace(/\u00b0/g, '')] = v
      }

      // Mostrar TODAS las claves numéricas desde 290 en adelante
      const highKeys: Record<string, any> = {}
      const allNumericKeys = Object.keys(normalized)
        .map(k => parseInt(k))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b)
      
      const maxKey = Math.max(...allNumericKeys, 0)
      
      for (let i = 290; i <= maxKey + 5; i++) {
        const k = String(i)
        if (normalized[k] !== undefined) {
          highKeys[k] = normalized[k]
        } else {
          highKeys[k] = undefined
        }
      }

      // También mostrar las claves no-numéricas que tengan "especial" o "obs" o "ept"
      const specialKeys: Record<string, any> = {}
      for (const [k, v] of Object.entries(normalized)) {
        const lk = k.toLowerCase()
        if (lk.includes('espec') || lk.includes('obs') || lk.includes('ept') || lk.includes('literal') || lk.includes('observ')) {
          specialKeys[k] = v
        }
      }

      results.push({
        cedula: student.cedula,
        nombre: `${student.apellidos}, ${student.nombres}`,
        maxNumericKey,
        keys290plus: highKeys,
        specialKeys,
        totalKeys: Object.keys(normalized).length,
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
