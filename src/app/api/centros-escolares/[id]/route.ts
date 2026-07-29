import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/centros-escolares/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const centro = await prisma.centroEscolar.findUnique({ where: { id } })
    if (!centro) {
      return NextResponse.json({ error: 'Centro escolar no encontrado' }, { status: 404 })
    }
    return NextResponse.json(centro)
  } catch (error) {
    console.error('Error fetching centro escolar:', error)
    return NextResponse.json({ error: 'Error al buscar centro escolar' }, { status: 500 })
  }
}

// PUT /api/centros-escolares/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, localidad, codigo, ef, activo } = body

    const centro = await prisma.centroEscolar.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(localidad !== undefined && { localidad: localidad || '' }),
        ...(codigo !== undefined && { codigo: codigo || '' }),
        ...(ef !== undefined && { ef: ef || '' }),
        ...(activo !== undefined && { activo }),
      },
    })

    return NextResponse.json(centro)
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un centro con ese nombre' }, { status: 409 })
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Centro escolar no encontrado' }, { status: 404 })
    }
    console.error('Error updating centro escolar:', error)
    return NextResponse.json({ error: 'Error al actualizar centro escolar' }, { status: 500 })
  }
}

// DELETE /api/centros-escolares/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.centroEscolar.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Centro escolar no encontrado' }, { status: 404 })
    }
    console.error('Error deleting centro escolar:', error)
    return NextResponse.json({ error: 'Error al eliminar centro escolar' }, { status: 500 })
  }
}
