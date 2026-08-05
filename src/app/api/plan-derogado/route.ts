import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Normalizar cédula para búsqueda flexible
function normalizeCedula(c: string): string {
  return c.replace(/[\s.\-]/g, '').toUpperCase()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Listar todos sin búsqueda
    if (!q.trim()) {
      const [students, total] = await Promise.all([
        prisma.planDerogado.findMany({
          take: limit,
          skip: (page - 1) * limit,
          orderBy: [{ cedula: 'asc' }, { apellidos: 'asc' }],
        }),
        prisma.planDerogado.count(),
      ])
      return NextResponse.json({ students: students.map(s => ({ ...s, plan: 'derogado' })), total, page, limit, totalPages: Math.ceil(total / limit) })
    }

    // Búsqueda por cédula, apellidos o nombres (igual que plan-vigente)
    const where = {
      OR: [
        { cedula: { contains: q } },
        { cedula: { contains: q.toUpperCase() } },
        { apellidos: { contains: q } },
        { nombres: { contains: q } },
      ],
    }

    const [students, total] = await Promise.all([
      prisma.planDerogado.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [{ cedula: 'asc' }, { apellidos: 'asc' }],
      }),
      prisma.planDerogado.count({ where }),
    ])

    // Fallback: búsqueda normalizada por cédula (igual que plan-vigente)
    if (students.length === 0 && normalizeCedula(q).length >= 4) {
      const allStudents = await prisma.planDerogado.findMany({
        where: {
          OR: [
            { cedula: { contains: normalizeCedula(q).substring(0, 3) } },
            { cedula: { contains: q.substring(0, 3) } },
          ],
        },
        take: limit * 5,
        orderBy: [{ cedula: 'asc' }, { apellidos: 'asc' }],
      })

      const filtered = allStudents.filter(s =>
        normalizeCedula(s.cedula).includes(normalizeCedula(q))
      )

      if (filtered.length > 0) {
        const totalFiltered = await prisma.planDerogado.count({
          where: { id: { in: filtered.map(s => s.id) } },
        })
        return NextResponse.json({
          students: filtered.slice(0, limit).map(s => ({ ...s, plan: 'derogado' })),
          total: totalFiltered,
          page,
          limit,
          totalPages: Math.ceil(totalFiltered / limit),
        })
      }
    }

    return NextResponse.json({
      students: students.map(s => ({ ...s, plan: 'derogado' })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching plan derogado:', error)
    return NextResponse.json({ error: 'Error al buscar alumnos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cedula, rawData } = body
    if (!cedula || !rawData) return NextResponse.json({ error: 'Cedula y rawData son requeridos' }, { status: 400 })
    const existing = await prisma.planDerogado.findUnique({ where: { cedula: cedula.trim() } })
    if (existing) return NextResponse.json({ error: 'Ya existe un registro con esa cedula' }, { status: 409 })
    const record = await prisma.planDerogado.create({ data: { cedula: cedula.trim(), rawData } })
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('POST /api/plan-derogado:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}
