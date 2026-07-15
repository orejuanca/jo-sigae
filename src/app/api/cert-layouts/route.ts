import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cert-layouts — Listar todos los layouts guardados
export async function GET() {
  try {
    const layouts = await prisma.certLayout.findMany({
      where: { activo: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(layouts)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/cert-layouts — Crear un nuevo layout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, datos } = body

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { error: 'El nombre del layout es obligatorio.' },
        { status: 400 }
      )
    }
    if (!datos) {
      return NextResponse.json(
        { error: 'Los datos del layout son obligatorios.' },
        { status: 400 }
      )
    }

    const layout = await prisma.certLayout.create({
      data: {
        nombre: nombre.trim(),
        datos: typeof datos === 'string' ? datos : JSON.stringify(datos),
      },
    })

    return NextResponse.json(layout, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}