import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/centros-escolares?q=...&page=1&limit=50
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (q) {
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' as const } },
        { nombre: { contains: q, mode: 'insensitive' as const } },
        { localidad: { contains: q, mode: 'insensitive' as const } },
        { ef: { contains: q, mode: 'insensitive' as const } },
      ]
    }

    const [centros, total] = await Promise.all([
      prisma.centroEscolar.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { nombre: 'asc' },
      }),
      prisma.centroEscolar.count({ where }),
    ])

    return NextResponse.json({ centros, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Error fetching centros escolares:', error)
    return NextResponse.json({ error: 'Error al buscar centros escolares' }, { status: 500 })
  }
}

// POST /api/centros-escolares
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, localidad, codigo, ef } = body

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del plantel es requerido' }, { status: 400 })
    }

    const centro = await prisma.centroEscolar.create({
      data: {
        nombre: nombre.trim(),
        localidad: localidad?.trim() || '',
        codigo: codigo?.trim() || '',
        ef: ef?.trim() || '',
      },
    })

    return NextResponse.json(centro, { status: 201 })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un centro con ese nombre' }, { status: 409 })
    }
    console.error('Error creating centro escolar:', error)
    return NextResponse.json({ error: 'Error al crear centro escolar' }, { status: 500 })
  }
}
