import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

// POST /api/boletas/migrate — one-time migration of BOLETAS Excel data
export async function POST() {
  try {
    const filePath = join(process.cwd(), 'upload', 'boletas_data.json')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    // Build cedula -> studentId map
    const allStudents = await prisma.student.findMany({ select: { id: true, cedula: true } })
    const cedulaMap = new Map<string, string>()
    for (const s of allStudents) {
      const normalized = s.cedula.replace(/[\s.\-]/g, '').toUpperCase()
      cedulaMap.set(normalized, s.id)
      cedulaMap.set(s.cedula.toUpperCase(), s.id)
    }

    let matched = 0
    let notMatched = 0
    let notasInserted = 0
    let extrasInserted = 0
    const notFound: string[] = []

    for (const record of data) {
      const cedulaNormalized = record.cedula.replace(/[\s.\-]/g, '').toUpperCase()
      const studentId = cedulaMap.get(cedulaNormalized)

      if (!studentId) {
        notMatched++
        if (notFound.length < 10) notFound.push(record.cedula)
        continue
      }

      matched++
      const seccion = record.seccion || ''
      const anioEscolar = record.anio_escolar
      const grado = record.grado

      // Insert notas
      for (const nota of record.notas) {
        try {
          await prisma.boletaNota.upsert({
            where: {
              studentId_anioEscolar_grado_seccion_materia: {
                studentId,
                anioEscolar,
                grado,
                seccion,
                materia: nota.materia,
              },
            },
            create: {
              studentId,
              anioEscolar,
              grado,
              seccion,
              materia: nota.materia,
              lapso1: nota.lapso1 || null,
              lapso2: nota.lapso2 || null,
              lapso3: nota.lapso3 || null,
            },
            update: {
              lapso1: nota.lapso1 || null,
              lapso2: nota.lapso2 || null,
              lapso3: nota.lapso3 || null,
            },
          })
          notasInserted++
        } catch (e) {
          // skip duplicates
        }
      }

      // Insert extras (GRUPO + OBS)
      try {
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
            grupo1: record.grupo1 || null,
            grupo2: record.grupo2 || null,
            grupo3: record.grupo3 || null,
            grupo4: record.grupo4 || null,
            observacion: record.observacion || null,
          },
          update: {
            grupo1: record.grupo1 || null,
            grupo2: record.grupo2 || null,
            grupo3: record.grupo3 || null,
            grupo4: record.grupo4 || null,
            observacion: record.observacion || null,
          },
        })
        extrasInserted++
      } catch (e) {
        // skip
      }
    }

    return NextResponse.json({
      success: true,
      totalRecords: data.length,
      matched,
      notMatched,
      notasInserted,
      extrasInserted,
      notFound,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
