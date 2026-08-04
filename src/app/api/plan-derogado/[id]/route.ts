import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/plan-vigente/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const student = await prisma.PlanDerogado.findUnique({ where: { id } })
    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }
    return NextResponse.json(student)
  } catch (error) {
    console.error('Error fetching plan Derogado by id:', error)
    return NextResponse.json({ error: 'Error al buscar alumno' }, { status: 500 })
  }
}

// PUT /api/plan-vigente/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, rawData } = body

    const updateData: Record<string, string | null> = {}
    if (cedula !== undefined) updateData.cedula = cedula.trim()
    if (apellidos !== undefined) updateData.apellidos = apellidos.trim()
    if (nombres !== undefined) updateData.nombres = nombres.trim()
    if (fechaNacimiento !== undefined) updateData.fechaNacimiento = fechaNacimiento?.trim() || null
    if (pais !== undefined) updateData.pais = pais?.trim() || 'VENEZUELA'
    if (estado !== undefined) updateData.estado = estado?.trim() || ''
    if (municipio !== undefined) updateData.municipio = municipio?.trim() || ''
    if (rawData !== undefined) updateData.rawData = rawData

    const student = await prisma.PlanDerogado.update({
      where: { id },
      data: updateData,
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
    console.error('Error updating plan Derogado:', error)
    return NextResponse.json({ error: 'Error al actualizar alumno' }, { status: 500 })
  }
}

// DELETE /api/plan-vigente/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.PlanDerogado.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }
    console.error('Error deleting plan Derogado:', error)
    return NextResponse.json({ error: 'Error al eliminar alumno' }, { status: 500 })
  }
}
