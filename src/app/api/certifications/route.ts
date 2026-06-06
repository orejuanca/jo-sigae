import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/certifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where = tipo ? { tipo } : {}

    const [certifications, total] = await Promise.all([
      prisma.certification.findMany({
        where,
        include: { student: true },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [
          { fechaEmision: 'desc' },
          { student: { cedula: 'asc' } },
          { student: { seccion: 'asc' } },
          { student: { apellidos: 'asc' } },
        ],
      }),
      prisma.certification.count({ where }),
    ])

    return NextResponse.json({
      certifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Error al buscar certificaciones' }, { status: 500 })
  }
}

// POST /api/certifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, studentId, datos, numero } = body

    if (!tipo || !studentId) {
      return NextResponse.json(
        { error: 'Tipo y studentId son requeridos' },
        { status: 400 }
      )
    }

    // Generate sequential number
    const count = await prisma.certification.count({ where: { tipo } })
    const certNumero = numero || `${tipo.substring(0, 3).toUpperCase()}-${String(count + 1).padStart(6, '0')}`

    const certification = await prisma.certification.create({
      data: {
        tipo,
        studentId,
        datos: datos ? JSON.stringify(datos) : '{}',
        numero: certNumero,
      },
      include: { student: true },
    })

    return NextResponse.json(certification, { status: 201 })
  } catch (error) {
    console.error('Error creating certification:', error)
    return NextResponse.json({ error: 'Error al crear certificación' }, { status: 500 })
  }
}
