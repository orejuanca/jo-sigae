import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stats
export async function GET() {
  try {
    const [totalStudents, totalCertificaciones, totalConstancias, totalBoletines, totalTitulos] =
      await Promise.all([
        prisma.student.count(),
        prisma.certification.count({ where: { tipo: 'CERTIFICACION' } }),
        prisma.certification.count({ where: { tipo: 'CONSTANCIA' } }),
        prisma.certification.count({ where: { tipo: 'BOLETIN' } }),
        prisma.certification.count({ where: { tipo: 'TITULO' } }),
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
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
