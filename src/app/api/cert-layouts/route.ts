import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/cert-layouts?plan=derogado — Listar layouts del plan indicado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    // Si se pasa ?id=..., devolver layout completo con datos
    const id = searchParams.get('id')
    if (id) {
      const layout = await db.certLayout.findFirst({ where: { id, activo: true } })
      if (!layout) return NextResponse.json({ error: 'Layout no encontrado.' }, { status: 404 })
      return NextResponse.json(layout)
    }

    const layouts = await db.certLayout.findMany({
      where: { activo: true, plan },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        plan: true,
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

// POST /api/cert-layouts?plan=derogado — Crear layout en el plan indicado
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    const body = await request.json()
    const { nombre, datos } = body

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { error: 'El nombre del layout es obligatorio.' },
        { status: 400 }
      )
    }
    if (!datos) {
      return NextResponse.json(
        { error: 'Los datos del layout son obligatorios.' },
        { status: 400 }
      )
    }

    const layout = await db.certLayout.create({
      data: {
        nombre: nombre.trim(),
        datos: typeof datos === 'string' ? datos : JSON.stringify(datos),
        plan,
      },
    })

    return NextResponse.json(layout, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT /api/cert-layouts?id=XXX&plan=derogado — Actualizar layout existente
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el parametro id.' }, { status: 400 })
    }

    const db = getDb(plan)
    const body = await request.json()
    const { nombre, datos } = body

    const layout = await db.certLayout.update({
      where: { id },
      data: {
        nombre: nombre?.trim(),
        datos: typeof datos === 'string' ? datos : JSON.stringify(datos),
      },
    })

    return NextResponse.json(layout)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
