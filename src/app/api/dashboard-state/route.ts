export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

// GET /api/dashboard-state?plan=vigente — Cargar estado del dashboard desde la BD
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    const record = await db.dashboardState.findUnique({
      where: { plan },
    })

    if (!record) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({ found: true, datos: record.datos, updatedAt: record.updatedAt })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/dashboard-state?plan=vigente — Guardar estado del dashboard en la BD (upsert)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    const body = await request.json()
    const { datos } = body

    if (!datos) {
      return NextResponse.json(
        { error: 'Los datos son obligatorios.' },
        { status: 400 }
      )
    }

    const jsonStr = typeof datos === 'string' ? datos : JSON.stringify(datos)

    // Upsert: crear o actualizar el registro único por plan
    const record = await db.dashboardState.upsert({
      where: { plan },
      create: { plan, datos: jsonStr },
      update: { datos: jsonStr },
    })

    return NextResponse.json({ ok: true, updatedAt: record.updatedAt })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/dashboard-state?plan=vigente — Eliminar estado del dashboard de la BD
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') || 'vigente'
    const db = getDb(plan)

    await db.dashboardState.deleteMany({ where: { plan } })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}