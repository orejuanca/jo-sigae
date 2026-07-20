import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/cert-layouts/[id]?plan=derogado
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    const layout = await db.certLayout.findUnique({
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

// DELETE /api/cert-layouts/[id]?plan=derogado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    await db.certLayout.update({
      where: { id },
      data: { activo: false },
    })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}