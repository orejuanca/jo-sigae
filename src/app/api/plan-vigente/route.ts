import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Normalizar cédula para búsqueda flexible
function normalizeCedula(c: string): string {
  return c.replace(/[\s.\-]/g, '').toUpperCase()
}

// GET /api/plan-vigente?q=...&page=1&limit=20
// GET /api/plan-vigente?cedula_exact=...  (verificar duplicados)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const cedulaExact = searchParams.get('cedula_exact') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Verificación exacta de cédula para duplicados
    if (cedulaExact) {
      const existing = await prisma.planVigente.findFirst({
        where: { cedula: cedulaExact.trim() },
      })
      return NextResponse.json({ exists: !!existing, student: existing || null })
    }

    // Listar todos sin búsqueda
    if (!q) {
      const [students, total] = await Promise.all([
        prisma.planVigente.findMany({
          take: limit,
          skip: (page - 1) * limit,
          orderBy: [{ cedula: 'asc' }, { apellidos: 'asc' }],
        }),
        prisma.planVigente.count(),
      ])
      return NextResponse.json({ students: students.map(s => ({ ...s, plan: 'vigente' })), total, page, limit, totalPages: Math.ceil(total / limit) })
    }

    // Búsqueda por cédula, apellidos o nombres
    const where = {
      OR: [
        { cedula: { contains: q } },
        { cedula: { contains: q.toUpperCase() } },
        { apellidos: { contains: q } },
        { nombres: { contains: q } },
      ],
    }

    const [students, total] = await Promise.all([
      prisma.planVigente.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [{ cedula: 'asc' }, { apellidos: 'asc' }],
      }),
      prisma.planVigente.count({ where }),
    ])

    // Fallback: búsqueda normalizada por cédula
    if (students.length === 0 && normalizeCedula(q).length >= 4) {
      const allStudents = await prisma.planVigente.findMany({
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
        const totalFiltered = await prisma.planVigente.count({
          where: { id: { in: filtered.map(s => s.id) } },
        })
        return NextResponse.json({
          students: filtered.slice(0, limit),
          total: totalFiltered,
          page,
          limit,
          totalPages: Math.ceil(totalFiltered / limit),
        })
      }
    }

    return NextResponse.json({
      students: students.map(s => ({ ...s, plan: 'vigente' })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching plan vigente:', error)
    return NextResponse.json({ error: 'Error al buscar alumnos' }, { status: 500 })
  }
}

// POST /api/plan-vigente (crear nuevo registro)
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

    const student = await prisma.planVigente.create({
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

    return NextResponse.json(student, { status: 201 })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un alumno con esa cédula' }, { status: 409 })
    }
    console.error('Error creating plan vigente:', error)
    return NextResponse.json({ error: 'Error al crear alumno' }, { status: 500 })
  }
}
