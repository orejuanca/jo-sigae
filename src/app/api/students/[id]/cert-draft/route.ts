import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET — Cargar el borrador de certificación del estudiante
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const plan = request.nextUrl.searchParams.get('plan') || 'vigente'
  const db = getDb(plan)
  const student = await db.student.findUnique({
    where: { id },
    select: { certDraft: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
  }

  if (!student.certDraft) {
    return NextResponse.json({ draft: null })
  }

  try {
    const draft = JSON.parse(student.certDraft)
    return NextResponse.json({ draft })
  } catch {
    return NextResponse.json({ error: 'Error al parsear el borrador' }, { status: 500 })
  }
}

// PUT — Guardar el borrador de certificación del estudiante
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { datos } = body

  if (!datos || typeof datos !== 'object') {
    return NextResponse.json({ error: 'Se requiere "datos" (objeto JSON)' }, { status: 400 })
  }

  try {
    const student = await db.student.update({
      where: { id },
      data: {
        certDraft: typeof datos === 'string' ? datos : JSON.stringify(datos),
      },
      select: { id: true, updatedAt: true },
    })

    return NextResponse.json({ ok: true, updatedAt: student.updatedAt })
  } catch (error) {
    console.error('Error guardando cert-draft:', error)
    return NextResponse.json({ error: 'Error al guardar el borrador' }, { status: 500 })
  }
}