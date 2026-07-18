import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/stats?plan=vigente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const planFilter = { plan }

    const db = getDb(plan)

    const [totalStudents, totalCertificaciones, totalConstancias, totalBoletines, totalTitulos] =
      await Promise.all([
        db.student.count({ where: planFilter }),
        db.certification.count({ where: { tipo: 'CERTIFICACION', student: planFilter } }),
        db.certification.count({ where: { tipo: 'CONSTANCIA', student: planFilter } }),
        db.certification.count({ where: { tipo: 'BOLETIN', student: planFilter } }),
        db.certification.count({ where: { tipo: 'TITULO', student: planFilter } }),
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