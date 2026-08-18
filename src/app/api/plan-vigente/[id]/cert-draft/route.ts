import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/plan-vigente/[id]/cert-draft
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.planVigente.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    if (!record.certDraft) return NextResponse.json({ draft: null })
    return NextResponse.json({ draft: JSON.parse(record.certDraft) })  } catch (error) {
    console.error('Error loading draft:', error)
    return NextResponse.json({ error: 'Error al cargar borrador' }, { status: 500 })
  }
}

// PUT /api/plan-vigente/[id]/cert-draft
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    await prisma.planVigente.update({
      where: { id },
      data: { certDraft: JSON.stringify(body.datos) },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving draft:', error)
    return NextResponse.json({ error: 'Error al guardar borrador' }, { status: 500 })
  }
}
