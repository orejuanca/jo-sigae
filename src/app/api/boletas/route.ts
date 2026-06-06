import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/boletas?anioEscolar=2024-2025&grado=2&seccion=A
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const anioEscolar = searchParams.get('anioEscolar') || ''
    const grado = searchParams.get('grado') || ''
    const seccion = searchParams.get('seccion') || ''

    // Require at least anioEscolar and grado to return results
    if (!anioEscolar || !grado) {
      return NextResponse.json({ students: [], materias: [] })
    }

    // Fetch all students (ordered by apellidos)
    // The grado and seccion are stored as part of the BoletaNota, not in the Student table
    // We need to find students who have BoletaNota records matching the filters,
    // or return all students if no notas exist yet
    const studentsWithNotas = await prisma.student.findMany({
      where: {
        boletaNotas: {
          some: {
            anioEscolar,
            grado,
            seccion: seccion || undefined,
          },
        },
      },
      include: {
        boletaNotas: {
          where: {
            anioEscolar,
            grado,
            seccion: seccion || undefined,
          },
        },
      },
      orderBy: [{ cedula: 'asc' }, { seccion: 'asc' }, { apellidos: 'asc' }],
    })

    return NextResponse.json({
      students: studentsWithNotas,
      anioEscolar,
      grado,
      seccion,
    })
  } catch (error) {
    console.error('Error fetching boletas:', error)
    return NextResponse.json({ error: 'Error al buscar boletas' }, { status: 500 })
  }
}

// PUT /api/boletas
// Body: { anioEscolar, grado, seccion, notas: [{ studentId, materia, lapso1, lapso2, lapso3 }] }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { anioEscolar, grado, seccion, notas } = body

    if (!anioEscolar || !grado || !notas || !Array.isArray(notas)) {
      return NextResponse.json(
        { error: 'anioEscolar, grado y notas son requeridos' },
        { status: 400 }
      )
    }

    const results = []

    for (const nota of notas) {
      const { studentId, materia, lapso1, lapso2, lapso3 } = nota

      if (!studentId || !materia) continue

      const upserted = await prisma.boletaNota.upsert({
        where: {
          studentId_anioEscolar_grado_seccion_materia: {
            studentId,
            anioEscolar,
            grado,
            seccion,
            materia,
          },
        },
        create: {
          studentId,
          anioEscolar,
          grado,
          seccion,
          materia,
          lapso1: lapso1 || null,
          lapso2: lapso2 || null,
          lapso3: lapso3 || null,
        },
        update: {
          lapso1: lapso1 || null,
          lapso2: lapso2 || null,
          lapso3: lapso3 || null,
        },
      })

      results.push(upserted)
    }

    return NextResponse.json({ success: true, count: results.length, notas: results })
  } catch (error) {
    console.error('Error saving boletas:', error)
    return NextResponse.json({ error: 'Error al guardar notas' }, { status: 500 })
  }
}
