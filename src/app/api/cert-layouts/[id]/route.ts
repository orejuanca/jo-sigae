import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cert-layouts/[id] — Obtener un layout completo por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const layout = await prisma.certLayout.findUnique({
      where: { id },
    })

    if (!layout) {
      return NextResponse.json(
        { error: 'Layout no encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json(layout)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/cert-layouts/[id] — Eliminar (soft-delete) un layout
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.certLayout.update({
      where: { id },
      data: { activo: false },
    })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}