import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    return NextResponse.json(record)
  } catch (error) {
    console.error('GET /api/plan-derogado/[id]:', error)
    return NextResponse.json({ error: 'Error al obtener registro' }, { status: 500 })
  }
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { cedula, rawData, certDraft } = body
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    const updated = await prisma.planDerogado.update({
      where: { id },
      data: {
        ...(cedula !== undefined && { cedula: cedula.trim() }),
        ...(rawData !== undefined && { rawData }),
        ...(certDraft !== undefined && { certDraft }),
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/plan-derogado/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
  }
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await prisma.planDerogado.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    await prisma.planDerogado.delete({ where: { id } })
    return NextResponse.json({ message: 'Registro eliminado' })
  } catch (error) {
    console.error('DELETE /api/plan-derogado/[id]:', error)
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 })
  }
}
