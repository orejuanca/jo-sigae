import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/cert-layouts/restore?plan=vigente — Listar layouts eliminados (activo=false)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    const layouts = await db.certLayout.findMany({
      where: { activo: false },
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

// POST /api/cert-layouts/restore?plan=vigente&all=true — Restaurar TODOS los layouts eliminados
// POST /api/cert-layouts/restore?plan=vigente&id=xxx — Restaurar un layout específico
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const id = searchParams.get('id')
    const restoreAll = searchParams.get('all') === 'true'
    const db = getDb(plan)

    if (restoreAll) {
      const result = await db.certLayout.updateMany({
        where: { activo: false },
        data: { activo: true },
      })
      return NextResponse.json({ restored: result.count })
    }

    if (id) {
      const layout = await db.certLayout.update({
        where: { id },
        data: { activo: true },
      })
      return NextResponse.json({ restored: layout.nombre, id: layout.id })
    }

    return NextResponse.json(
      { error: 'Especifica ?id=xxx o ?all=true' },
      { status: 400 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}