import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/students/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const student = await prisma.student.findUnique({
      where: { id },
      include: { certifications: { orderBy: { emitidoEl: 'desc' } } },
    })

    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json({ error: 'Error al buscar alumno' }, { status: 500 })
  }
}

// PUT /api/students/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { cedula, apellidos, nombres, fechaNacimiento, pais } = body

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(cedula && { cedula: cedula.trim() }),
        ...(apellidos && { apellidos: apellidos.trim() }),
        ...(nombres && { nombres: nombres.trim() }),
        ...(fechaNacimiento !== undefined && { fechaNacimiento: fechaNacimiento?.trim() || null }),
        ...(pais !== undefined && { pais: pais?.trim() || 'VENEZUELA' }),
      },
    })

    return NextResponse.json(student)
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un alumno con esa cédula' }, { status: 409 })
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }
    console.error('Error updating student:', error)
    return NextResponse.json({ error: 'Error al actualizar alumno' }, { status: 500 })
  }
}

// DELETE /api/students/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.student.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }
    console.error('Error deleting student:', error)
    return NextResponse.json({ error: 'Error al eliminar alumno' }, { status: 500 })
  }
}
