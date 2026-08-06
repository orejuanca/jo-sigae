import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import { PrismaClient } from '@prisma/client'

const prismaDirect = new PrismaClient()

// GET /api/stats?plan=vigente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'

    // Cada plan usa su tabla independiente
    let totalStudents = 0
    if (plan === 'vigente') {
      totalStudents = await prismaDirect.planVigente.count()
    } else if (plan === 'derogado') {
      totalStudents = await prismaDirect.planDerogado.count()
    } else {
      const db = getDb(plan)
      totalStudents = await db.student.count({ where: { plan } })
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