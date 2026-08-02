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

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del plantel es requerido' }, { status: 400 })
    }

    // Unicidad: si codigo tiene valor, debe ser único
    if (codigo && codigo.trim()) {
      const existing = await prisma.centroEscolar.findFirst({ where: { codigo: codigo.trim() } })
      if (existing) {
        return NextResponse.json({ error: `Ya existe un centro con código ${codigo.trim()}` }, { status: 409 })
      }
    }
    // Si codigo vacío: nombre+localidad no pueden repetirse
    if (!codigo || !codigo.trim()) {
      const existing = await prisma.centroEscolar.findFirst({ where: { nombre, localidad: localidad || '' } })
      if (existing) {
        return NextResponse.json({ error: `Ya existe un centro con nombre "${nombre}" en ${localidad || 'sin localidad'}` }, { status: 409 })
      }
    }

    const centro = await prisma.centroEscolar.create({
      data: {
        nombre,
        localidad: localidad || '',
        codigo: (codigo || '').trim(),
        ef: ef || '',
      },
    })

    return NextResponse.json(centro, { status: 201 })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Registro duplicado' }, { status: 409 })
    }
    console.error('Error creating centro escolar:', error)
    return NextResponse.json({ error: 'Error al crear centro escolar' }, { status: 500 })
  }
}
