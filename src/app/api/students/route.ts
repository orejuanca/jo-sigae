import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/students?q=...&page=1&limit=20&plan=vigente|derogado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const plan = searchParams.get('plan') || 'vigente'

    const model = plan === 'derogado' ? prisma.planDerogado : prisma.planVigente

    if (!q) {
      const [students, total] = await Promise.all([
        model.findMany({
          take: limit,
          skip: (page - 1) * limit,
          orderBy: [{ cedula: 'asc' }, { apellidos: 'asc' }],
        }),
        model.count(),
      ])
      return NextResponse.json({ students, total, page, limit, totalPages: Math.ceil(total / limit) })
    }

    const where = {
      OR: [
        { cedula: { contains: q } },
        { cedula: { contains: q.toUpperCase() } },
        { apellidos: { contains: q } },
        { nombres: { contains: q } },
      ],
    }

    const [students, total] = await Promise.all([
      model.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [{ cedula: 'asc' }, { apellidos: 'asc' }],
      }),
      model.count({ where }),
    ])

    return NextResponse.json({
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Error al buscar alumnos' }, { status: 500 })
  }
}

// POST /api/students
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, rawData } = body
    const plan = body.plan || 'vigente'

    if (!cedula || !apellidos || !nombres) {
      return NextResponse.json(
        { error: 'Cédula, apellidos y nombres son requeridos' },
        { status: 400 }
      )
    }

    const model = plan === 'derogado' ? prisma.planDerogado : prisma.planVigente

    const student = await model.create({
      data: {
        cedula: cedula.trim(),
        apellidos: apellidos.trim(),
        nombres: nombres.trim(),
        fechaNacimiento: fechaNacimiento?.trim() || null,
        pais: pais?.trim() || 'VENEZUELA',
        estado: estado?.trim() || '',
        municipio: municipio?.trim() || '',
        rawData: rawData || '{}',
        ...(plan === 'derogado' ? { certDraft: null } : {}),
      },
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un alumno con esa cédula' }, { status: 409 })
    }
    console.error('Error creating student:', error)
    return NextResponse.json({ error: 'Error al crear alumno' }, { status: 500 })
  }
}
