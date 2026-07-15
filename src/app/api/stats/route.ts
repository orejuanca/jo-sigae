import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stats?plan=vigente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const planFilter = { plan }

    const [totalStudents, totalCertificaciones, totalConstancias, totalBoletines, totalTitulos] =
      await Promise.all([
        prisma.student.count({ where: planFilter }),
        prisma.certification.count({ where: { tipo: 'CERTIFICACION', student: planFilter } }),
        prisma.certification.count({ where: { tipo: 'CONSTANCIA', student: planFilter } }),
        prisma.certification.count({ where: { tipo: 'BOLETIN', student: planFilter } }),
        prisma.certification.count({ where: { tipo: 'TITULO', student: planFilter } }),
      ])

    return NextResponse.json({
      totalStudents,
      totalCertificaciones,
      totalConstancias,
      totalBoletines,
      totalTitulos,
      totalDocumentos: totalCertificaciones + totalConstancias + totalBoletines + totalTitulos,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadisticas' }, { status: 500 })
  }
}