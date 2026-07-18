import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// Convertir fecha de cualquier formato a DD/MM/YYYY
function normalizeFecha(fecha: string): string {
  if (!fecha) return ''
  const trimmed = fecha.trim()
  if (!trimmed) return ''
  // Ya en DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/')
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`
  }
  // Formato YYYY-MM-DD (de input type="date") → DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-')
    return `${day}/${month}/${year}`
  }
  return trimmed
}

// GET /api/students/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'
    const db = getDb(plan)
    const student = await db.student.findUnique({
      where: { id },
      include: { certifications: { orderBy: { fechaEmision: 'desc' } } },
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
    const { cedula, apellidos, nombres, fechaNacimiento, pais, estado, municipio, rawData } = body
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'
    const db = getDb(plan)
    const student = await db.student.update({
      where: { id },
      data: {
        ...(cedula && { cedula: cedula.trim() }),
        ...(apellidos && { apellidos: apellidos.trim() }),
        ...(nombres && { nombres: nombres.trim() }),
        ...(fechaNacimiento !== undefined && { fechaNacimiento: normalizeFecha(fechaNacimiento) || null }),
        ...(pais !== undefined && { pais: pais?.trim() || 'VENEZUELA' }),
        ...(estado !== undefined && { estado: estado?.trim() || '' }),
        ...(municipio !== undefined && { municipio: municipio?.trim() || '' }),
        ...(rawData !== undefined && { rawData: typeof rawData === 'string' ? rawData : JSON.stringify(rawData) }),
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
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'
    const db = getDb(plan)
    await db.student.delete({ where: { id } })
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
