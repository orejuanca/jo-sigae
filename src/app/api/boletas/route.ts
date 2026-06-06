import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/boletas?anioEscolar=2024-2025&grado=2&seccion=A
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const anioEscolar = searchParams.get('anioEscolar') || ''
    const grado = searchParams.get('grado') || ''
    const seccion = searchParams.get('seccion') || ''

    if (!anioEscolar || !grado) {
      return NextResponse.json({ students: [], materias: [] })
    }

    // Fetch students with boletaNotas and boletaExtras, ordered by cedula -> seccion -> apellidos
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
        boletaExtras: {
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
// Body: { anioEscolar, grado, seccion, notas: [...], extras: [...] }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { anioEscolar, grado, seccion, notas, extras } = body

    if (!anioEscolar || !grado || !notas || !Array.isArray(notas)) {
      return NextResponse.json(
        { error: 'anioEscolar, grado y notas son requeridos' },
        { status: 400 }
      )
    }

    // Save notas
    const results = []
    for (const nota of notas) {
      const { studentId, materia, lapso1, lapso2, lapso3, revision } = nota
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
          revision: revision || null,
        },
        update: {
          lapso1: lapso1 || null,
          lapso2: lapso2 || null,
          lapso3: lapso3 || null,
          revision: revision || null,
        },
      })
      results.push(upserted)
    }

    // Save extras (GRUPO, OBS) if provided
    if (extras && Array.isArray(extras)) {
      for (const extra of extras) {
        const { studentId, grupo1, grupo2, grupo3, grupo4, observacion, obsBoletin } = extra
        if (!studentId) continue

        await prisma.boletaExtra.upsert({
          where: {
            studentId_anioEscolar_grado_seccion: {
              studentId,
              anioEscolar,
              grado,
              seccion,
            },
          },
          create: {
            studentId,
            anioEscolar,
            grado,
            seccion,
            grupo1: grupo1 || null,
            grupo2: grupo2 || null,
            grupo3: grupo3 || null,
            grupo4: grupo4 || null,
            observacion: observacion || null,
            obsBoletin: obsBoletin || null,
          },
          update: {
            grupo1: grupo1 || null,
            grupo2: grupo2 || null,
            grupo3: grupo3 || null,
            grupo4: grupo4 || null,
            observacion: observacion || null,
            obsBoletin: obsBoletin || null,
          },
        })
      }
    }

    return NextResponse.json({ success: true, count: results.length, notas: results })
  } catch (error) {
    console.error('Error saving boletas:', error)
    return NextResponse.json({ error: 'Error al guardar notas' }, { status: 500 })
  }
}
