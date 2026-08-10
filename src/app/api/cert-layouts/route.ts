import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

/**
 * Extrae el plan de un layout leyendo meta.plan del JSON.
 * Si no tiene meta.plan, devuelve "vigente" por defecto (layouts antiguos).
 */
function extractPlan(datos: string): string {
  try {
    const parsed = JSON.parse(datos)
    if (parsed?.meta?.plan === 'derogado' || parsed?.meta?.plan === 'vigente') {
      return parsed.meta.plan
    }
  } catch {}
  return 'vigente'
}

// GET /api/cert-layouts?plan=all — Listar layouts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const planFilter = searchParams.get('plan') || 'all'
    const db = getDb(planFilter)

    const id = searchParams.get('id')
    if (id) {
      const layout = await db.certLayout.findFirst({ where: { id, activo: true } })
      if (!layout) return NextResponse.json({ error: 'Layout no encontrado.' }, { status: 404 })
      const detectedPlan = extractPlan(layout.datos)
      return NextResponse.json({ ...layout, plan: detectedPlan })
    }

    const layouts = await db.certLayout.findMany({
      where: { activo: true },
      orderBy: { updatedAt: 'desc' },
    })

    const withPlan = layouts.map(l => ({
      id: l.id,
      nombre: l.nombre,
      plan: extractPlan(l.datos),
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }))

    const filtered = planFilter === 'all'
      ? withPlan
      : withPlan.filter(l => l.plan === planFilter)

    return NextResponse.json(filtered)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/cert-layouts?plan=derogado — Crear layout
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    const body = await request.json()
    const { nombre, datos } = body

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del layout es obligatorio.' }, { status: 400 })
    }
    if (!datos) {
      return NextResponse.json({ error: 'Los datos del layout son obligatorios.' }, { status: 400 })
    }

    const layout = await db.certLayout.create({
      data: {
        nombre: nombre.trim(),
        datos: typeof datos === 'string' ? datos : JSON.stringify(datos),
      },
    })

    return NextResponse.json(layout, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT /api/cert-layouts?id=XXX&plan=derogado — Actualizar layout
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
