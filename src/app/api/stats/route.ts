import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/stats?plan=vigente|derogado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'

    let totalStudents = 0
    if (plan === 'derogado') {
      totalStudents = await prisma.planDerogado.count()
    } else {
      totalStudents = await prisma.planVigente.count()
    }

    return NextResponse.json({
      totalStudents,
      totalCertificaciones: 0,
      totalConstancias: 0,
      totalBoletines: 0,
      totalTitulos: 0,
      totalDocumentos: 0,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadisticas' }, { status: 500 })
  }
}
