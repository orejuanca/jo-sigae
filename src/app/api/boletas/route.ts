import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/boletas?anioEscolar=2024-2025&grado=2&seccion=A
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const anioEscolar = searchParams.get('anioEscolar') || ''
    const grado = searchParams.get('grado') || ''
    const seccion = searchParams.get('seccion') || ''
    const plan = searchParams.get('plan') || 'vigente'

    if (!anioEscolar || !grado) {
      return NextResponse.json({ students: [], materias: [] })
    }

    const whereNotas: Record<string, unknown> = {
      anioEscolar,
      grado,
    }
    if (seccion) whereNotas.seccion = seccion

    // Obtener notas sin include (la relación student apunta al modelo Student vacío)
    const notas = await prisma.boletaNota.findMany({ where: whereNotas })

    // Recolectar studentIds únicos
    const studentIds = [...new Set(notas.map(n => n.studentId))]

    // Buscar datos de alumnos en la tabla correcta según plan
    const model = plan === 'derogado' ? prisma.planDerogado : prisma.planVigente
    const studentsData = studentIds.length > 0
      ? await model.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, cedula: true, apellidos: true, nombres: true },
        })
      : []
    const studentInfoMap = new Map(studentsData.map(s => [s.id, s]))

    // Agrupar por estudiante
    const studentMap = new Map<string, {
      id: string
      cedula: string
      apellidos: string
      nombres: string
      seccion: string
      boletaNotas: typeof notas
      boletaExtras: Array<Record<string, unknown>>
    }>()

    for (const nota of notas) {
      const sid = nota.studentId
      const info = studentInfoMap.get(sid)
      if (!info) continue // Skip si el alumno no existe en la tabla del plan

      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          id: info.id,
          cedula: info.cedula,
          apellidos: info.apellidos,
          nombres: info.nombres,
          seccion: nota.seccion || '',
          boletaNotas: [],
          boletaExtras: [],
        })
      }
      studentMap.get(sid)!.boletaNotas.push(nota)
    }

    // Buscar extras para los mismos students
    if (studentIds.length > 0) {
      const whereExtras: Record<string, unknown> = {
        studentId: { in: studentIds },
        anioEscolar,
        grado,
      }
      if (seccion) whereExtras.seccion = seccion

      const extras = await prisma.boletaExtra.findMany({ where: whereExtras })
      for (const extra of extras) {
        const entry = studentMap.get(extra.studentId)
        if (entry) entry.boletaExtras.push(extra as unknown as Record<string, unknown>)
      }
    }

    const students = [...studentMap.values()].sort((a, b) => {
      const cmp = a.cedula.localeCompare(b.cedula)
      return cmp !== 0 ? cmp : a.apellidos.localeCompare(b.apellidos)
    })

    return NextResponse.json({ students, anioEscolar, grado, seccion })
  } catch (error) {
    console.error('Error fetching boletas:', error)
    return NextResponse.json({ error: 'Error al buscar boletas' }, { status: 500 })
  }
}

// PUT /api/boletas
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

    if (extras && Array.isArray(extras)) {
      for (const extra of extras) {
        const {
          studentId,
          grupo1, grupo2, grupo3, grupo4,
          observacion, obsBoletin,
          materiaPendiente1, materiaPendiente2,
          mp1m1, mp1m2, mp1m3, mp1m4,
          mp2m1, mp2m2, mp2m3, mp2m4,
          pl1, pl2, pl3, pl4, pl5,
          scoreCA, scoreILE, scoreMA, scoreEF, scoreAP, scoreCN, scoreGHC,
        } = extra
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
            studentId, anioEscolar, grado, seccion,
            grupo1: grupo1 || null, grupo2: grupo2 || null,
            grupo3: grupo3 || null, grupo4: grupo4 || null,
            observacion: observacion || null, obsBoletin: obsBoletin || null,
            materiaPendiente1: materiaPendiente1 || null,
            materiaPendiente2: materiaPendiente2 || null,
            mp1m1: mp1m1 || null, mp1m2: mp1m2 || null,
            mp1m3: mp1m3 || null, mp1m4: mp1m4 || null,
            mp2m1: mp2m1 || null, mp2m2: mp2m2 || null,
            mp2m3: mp2m3 || null, mp2m4: mp2m4 || null,
            pl1: pl1 || null, pl2: pl2 || null, pl3: pl3 || null,
            pl4: pl4 || null, pl5: pl5 || null,
            scoreCA: scoreCA || null, scoreILE: scoreILE || null,
            scoreMA: scoreMA || null, scoreEF: scoreEF || null,
            scoreAP: scoreAP || null, scoreCN: scoreCN || null,
            scoreGHC: scoreGHC || null,
          },
          update: {
            grupo1: grupo1 || null, grupo2: grupo2 || null,
            grupo3: grupo3 || null, grupo4: grupo4 || null,
            observacion: observacion || null, obsBoletin: obsBoletin || null,
            materiaPendiente1: materiaPendiente1 || null,
            materiaPendiente2: materiaPendiente2 || null,
            mp1m1: mp1m1 || null, mp1m2: mp1m2 || null,
            mp1m3: mp1m3 || null, mp1m4: mp1m4 || null,
            mp2m1: mp2m1 || null, mp2m2: mp2m2 || null,
            mp2m3: mp2m3 || null, mp2m4: mp2m4 || null,
            pl1: pl1 || null, pl2: pl2 || null, pl3: pl3 || null,
            pl4: pl4 || null, pl5: pl5 || null,
            scoreCA: scoreCA || null, scoreILE: scoreILE || null,
            scoreMA: scoreMA || null, scoreEF: scoreEF || null,
            scoreAP: scoreAP || null, scoreCN: scoreCN || null,
            scoreGHC: scoreGHC || null,
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
