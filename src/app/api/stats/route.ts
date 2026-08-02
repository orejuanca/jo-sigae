import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import { PrismaClient } from '@prisma/client'

const prismaDirect = new PrismaClient()

// GET /api/stats?plan=vigente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'

    // Plan Vigente usa tabla independiente PlanVigente
    if (plan === 'vigente') {
      const totalStudents = await prismaDirect.planVigente.count()
      return NextResponse.json({
        totalStudents,
        totalCertificaciones: 0,
        totalConstancias: 0,
        totalBoletines: 0,
        totalTitulos: 0,
        totalDocumentos: 0,
      })
    }

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