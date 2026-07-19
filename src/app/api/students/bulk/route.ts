import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-helper'

// POST /api/students/bulk — Importar alumnos masivamente
export async function POST(request: NextRequest) {
  try {
    const { students } = await request.json()

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de alumnos' }, { status: 400 })
    }

    const created = []
    const errors = []

    // Process in batches of 50
    for (let i = 0; i < students.length; i += 50) {
      const batch = students.slice(i, i + 50)

      for (const s of batch) {
        try {
          const student = await db.student.create({
            data: {
              cedula: String(s.cedula || '').trim(),
              apellidos: String(s.apellidos || '').trim(),
              nombres: String(s.nombres || '').trim(),
              fechaNacimiento: s.fechaNacimiento || null,
              pais: String(s.pais || 'VENEZUELA').trim(),
              estado: String(s.estado || '').trim(),
              municipio: String(s.municipio || '').trim(),
              plan: String(s.plan || 'derogado').trim(),
              rawData: s.rawData ? JSON.stringify(s.rawData) : '{}',
            },
          })
          created.push(student.id)
        } catch (e: unknown) {
          const err = e as { code?: string; message?: string }
          if (err.code === 'P2002') {
            errors.push({ cedula: s.cedula, error: 'Duplicado' })
          } else {
            errors.push({ cedula: s.cedula, error: err.message || 'Error desconocido' })
          }
        }
      }
    }

    return NextResponse.json({
      imported: created.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors.slice(0, 20) : undefined,
    })
  } catch (error) {
    console.error('Error en importacion masiva:', error)
    return NextResponse.json({ error: 'Error al importar alumnos' }, { status: 500 })
  }
}