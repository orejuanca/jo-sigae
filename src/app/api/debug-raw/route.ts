import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import { flattenRawData } from '@/lib/flatten-raw'

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'

    const db = getDb(plan)
    let student
    if (id) {
      student = await db.student.findUnique({ where: { id } })
    } else {
      // Obtener el primer estudiante que tenga rawData no vacío
      student = await db.student.findFirst({ orderBy: { cedula: 'asc' } })
    }

    if (!student) {
      return NextResponse.json({ error: 'No hay estudiantes' }, { status: 404 })
    }

    // 1. Ver formato crudo del rawData
    const rawStr = student.rawData || '{}'
    const rawData = JSON.parse(rawStr)
    const allKeys = Object.keys(rawData)
    const format = rawData._format || 'desconocido'
    const hasNumericKeys = allKeys.some(k => /^\d+$/.test(k))
    const hasFieldMapKeys = allKeys.some(k => k.startsWith('NOTA.') || k.startsWith('INST.') || k.startsWith('EVAL.'))

    // 2. Aplicar flattenRawData
    const flat = flattenRawData(rawData)
    const flatKeys = Object.keys(flat)
    const flatSample: Record<string, string> = {}
    for (const k of flatKeys) {
      flatSample[k] = flat[k]
    }

    // 3. Contar campos por tipo
    const notaCount = flatKeys.filter(k => k.startsWith('NOTA.')).length
    const evalCount = flatKeys.filter(k => k.startsWith('EVAL.')).length
    const mesCount = flatKeys.filter(k => k.startsWith('MES.')).length
    const instCount = flatKeys.filter(k => k.startsWith('INST.')).length
    const totalNonPersonal = flatKeys.length

    return NextResponse.json({
      student: { id: student.id, cedula: student.cedula, apellidos: student.apellidos },
      rawDataAnalysis: {
        format,
        hasNumericKeys,
        hasFieldMapKeys,
        totalRawKeys: allKeys.length,
        first10Keys: allKeys.slice(0, 10),
      },
      flattenResult: {
        totalFlatKeys: totalNonPersonal,
        notaFields: notaCount,
        evalFields: evalCount,
        mesFields: mesCount,
        instFields: instCount,
        sampleFlatData: flatSample,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error), stack: (error as Error).stack }, { status: 500 })
  }
}
