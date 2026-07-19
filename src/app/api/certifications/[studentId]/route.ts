import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/certifications/[studentId]?plan=vigente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'
    const db = getDb(plan)
    const certifications = await db.certification.findMany({
      where: { studentId },
      orderBy: { fechaEmision: 'desc' },
    })

    return NextResponse.json(certifications)
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Error al buscar certificaciones' }, { status: 500 })
  }
}