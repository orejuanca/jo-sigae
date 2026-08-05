import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { parseCertData, parsedToCertData } from '@/lib/parse-rawdata'
const prisma = new PrismaClient()
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    let rawDataObj = {}
    try { rawDataObj = JSON.parse(record.rawData) } catch { return NextResponse.json({ error: 'rawData no es JSON valido' }, { status: 500 }) }
    const studentLike = {
      apellidos: record.apellidos || String(rawDataObj['APELLIDOS'] || ''),
      nombres: record.nombres || String(rawDataObj['NOMBRES'] || ''),
      cedula: record.cedula,
      fechaNacimiento: record.fechaNacimiento || '',
      pais: record.pais || String(rawDataObj['PAIS'] || 'VENEZUELA'),
      estado: record.estado || String(rawDataObj['ESTADO'] || ''),
      municipio: record.municipio || String(rawDataObj['MUNICIPIO'] || ''),
    }
    const parsed = parseCertData(record.rawData, 'derogado')
    const certData = parsedToCertData(parsed, studentLike)
    return NextResponse.json(certData)
  } catch (error) {
    console.error('GET /api/plan-derogado/[id]/cert-data:', error)
    return NextResponse.json({ error: 'Error al generar datos de certificacion' }, { status: 500 })
  }
}
