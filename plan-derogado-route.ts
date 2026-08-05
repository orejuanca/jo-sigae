// =============================================
// ARCHIVO: src/app/api/plan-derogado/route.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/plan-derogado — listar con búsqueda y paginación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const where: any = {}
    if (q.trim()) {
      where.OR = [
        { cedula: { contains: q.trim() } },
        { rawData: { contains: q.trim() } },
      ]
    }

    const [records, total] = await Promise.all([
      prisma.planDerogado.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.planDerogado.count({ where }),
    ])

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error en GET /api/plan-derogado:', error)
    return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 })
  }
}

// POST /api/plan-derogado — crear registro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cedula, rawData } = body

    if (!cedula || !rawData) {
      return NextResponse.json({ error: 'Cédula y rawData son requeridos' }, { status: 400 })
    }

    const existing = await prisma.planDerogado.findUnique({ where: { cedula } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un registro con esa cédula' }, { status: 409 })
    }

    const record = await prisma.planDerogado.create({
      data: { cedula: cedula.trim(), rawData },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/plan-derogado:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}
