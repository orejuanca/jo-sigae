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
    const cedulaExact = searchParams.get('cedula_exact') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Verificación exacta de cédula para duplicados
    if (cedulaExact) {
      const existing = await prisma.planDerogado.findFirst({
        where: { cedula: cedulaExact.trim() },
      })
      return NextResponse.json({ exists: !!existing, student: existing || null })
    }

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
    const { cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, rawData } = body

    if (!cedula) {
      return NextResponse.json(
        { error: 'La cédula es requerida' },
        { status: 400 }
      )
    }

    const record = await prisma.planDerogado.create({
      data: {
        cedula: cedula.trim(),
        apellidos: apellidos.trim(),
        nombres: nombres.trim(),
        fechaNacimiento: fechaNacimiento?.trim() || null,
        pais: pais?.trim() || 'VENEZUELA',
        estado: estado?.trim() || '',
        municipio: municipio?.trim() || '',
        rawData: rawData || '{}',
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un alumno con esa cédula' }, { status: 409 })
    }
    console.error('POST /api/plan-derogado:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}
