import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// Convertir fecha de cualquier formato a DD/MM/YYYY
function normalizeFecha(fecha: string): string {
  if (!fecha) return ''
  const trimmed = fecha.trim()
  if (!trimmed) return ''
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/')
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-')
    return `${day}/${month}/${year}`
  }
  return trimmed
}

// Normalize cedula: remove spaces, dashes, dots for flexible search
function normalizeCedula(c: string): string {
  return c.replace(/[\s.\-]/g, '').toUpperCase()
}

// GET /api/students?q=...&page=1&limit=20&plan=vigente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const plan = searchParams.get('plan') || 'vigente'

    const planFilter = { plan }

    const db = getDb(plan)

    if (!q) {
      const [students, total] = await Promise.all([
        db.student.findMany({ where: planFilter, take: limit, skip: (page - 1) * limit, orderBy: [{ cedula: 'asc' }, { seccion: 'asc' }, { apellidos: 'asc' }] }),
        db.student.count({ where: planFilter }),
      ])
      return NextResponse.json({ students, total, page, limit, totalPages: Math.ceil(total / limit) })
    }

    const normalized = normalizeCedula(q)

    const where = {
      ...planFilter,
      OR: [
        { cedula: { contains: q } },
        { cedula: { contains: q.toUpperCase() } },
        { apellidos: { contains: q, mode: 'insensitive' as const } },
        { nombres: { contains: q, mode: 'insensitive' as const } },
      ],
    }

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [{ cedula: 'asc' }, { seccion: 'asc' }, { apellidos: 'asc' }],
      }),
      db.student.count({ where }),
    ])

    // If no results with strict search, try normalized cedula matching
    if (students.length === 0 && normalized.length >= 4) {
      // Get all students and filter by normalized cedula on the app side
      // This is a fallback for when the user types "V12345678" but DB has "V 12345678"
      const allStudents = await db.student.findMany({
        where: {
          ...planFilter,
          OR: [
            { cedula: { contains: normalized.substring(0, 3) } },
            { cedula: { contains: q.substring(0, 3) } },
          ],
        },
        take: limit * 5,
        orderBy: [{ cedula: 'asc' }, { seccion: 'asc' }, { apellidos: 'asc' }],
      })

      const filtered = allStudents.filter(s =>
        normalizeCedula(s.cedula).includes(normalized)
      )

      if (filtered.length > 0) {
        const totalFiltered = await db.student.count({
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
    const { cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, plan, rawData } = body

    if (!cedula || !apellidos || !nombres) {
      return NextResponse.json(
        { error: 'Cédula, apellidos y nombres son requeridos' },
        { status: 400 }
      )
    }

    const plan = body.plan || 'vigente'
    const db = getDb(plan)

    const student = await db.student.create({
      data: {
        cedula: cedula.trim(),
        apellidos: apellidos.trim(),
        nombres: nombres.trim(),
        fechaNacimiento: normalizeFecha(fechaNacimiento) || null,
        pais: pais?.trim() || 'VENEZUELA',
        estado: estado?.trim() || '',
        municipio: municipio?.trim() || '',
        plan: plan || 'vigente',
        rawData: rawData || '{}',
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
