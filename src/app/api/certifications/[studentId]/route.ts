import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/certifications/[studentId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params
    const certifications = await prisma.certification.findMany({
      where: { studentId },
      orderBy: { emitidoEl: 'desc' },
    })

    return NextResponse.json(certifications)
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Error al buscar certificaciones' }, { status: 500 })
  }
}
