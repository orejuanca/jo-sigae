// =============================================
// ARCHIVO: src/app/api/plan-derogado/[id]/cert-data/route.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { parseCertData, parsedToCertData } from '@/lib/parse-rawdata'

const prisma = new PrismaClient()

// GET /api/plan-derogado/[id]/cert-data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    // Parsear rawData como JSON para extraer campos de identificación
    let rawDataObj: Record<string, string> = {}
    try {
      rawDataObj = JSON.parse(record.rawData)
    } catch {
      return NextResponse.json({ error: 'rawData no es JSON válido' }, { status: 500 })
    }

    // Construir objeto studentLike desde rawData
    // (PlanDerogado no tiene campos separados en el modelo)
    const studentLike = {
      apellidos: String(rawDataObj['APELLIDOS'] || ''),
      nombres: String(rawDataObj['NOMBRES'] || ''),
      cedula: record.cedula,
      fechaNacimiento: '',
      pais: String(rawDataObj['PAIS'] || ''),
      estado: String(rawDataObj['ESTADO'] || ''),
      municipio: String(rawDataObj['MUNICIPIO'] || ''),
    }

    const parsed = parseCertData(record.rawData, 'derogado')
    const certData = parsedToCertData(parsed, studentLike)

    return NextResponse.json(certData)
  } catch (error) {
    console.error('Error en GET /api/plan-derogado/[id]/cert-data:', error)
    return NextResponse.json({ error: 'Error al generar datos de certificación' }, { status: 500 })
  }
}
