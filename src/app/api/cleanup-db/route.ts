import { NextRequest, NextResponse } from 'next/server'
import { dbVigente, dbDerogado } from '@/lib/db-helper'

// One-time cleanup: remove derogado students from BD (vigente) and vigente students from BD2 (derogado)
// GET = preview (no changes), POST = execute deletion

export async function GET() {
  const results: Record<string, any> = {}

  // 1. Students with plan='derogado' in BD (vigente) — should be in BD2 only
  const wrongInVigente = await dbVigente.student.findMany({
    where: { plan: 'derogado' },
    select: { id: true, cedula: true, apellidos: true, nombres: true, plan: true },
    orderBy: { apellidos: 'asc' },
  })
  results.wrongInBD_vigente = { count: wrongInVigente.length, students: wrongInVigente }

  // 2. Students with plan='vigente' in BD2 (derogado) — should be in BD only
  const wrongInDerogado = await dbDerogado.student.findMany({
    where: { plan: 'vigente' },
    select: { id: true, cedula: true, apellidos: true, nombres: true, plan: true },
    orderBy: { apellidos: 'asc' },
  })
  results.wrongInBD2_derogado = { count: wrongInDerogado.length, students: wrongInDerogado }

  // 3. Duplicates: same cedula in both DBs
  const allVigente = await dbVigente.student.findMany({ select: { id: true, cedula: true, apellidos: true, nombres: true, plan: true } })
  const allDerogado = await dbDerogado.student.findMany({ select: { id: true, cedula: true, apellidos: true, nombres: true, plan: true } })
  const vigenteCedulas = new Set(allVigente.map(s => s.cedula.replace(/[\s.-]/g, '').toUpperCase()))
  const duplicates = allDerogado.filter(s => vigenteCedulas.has(s.cedula.replace(/[\s.-]/g, '').toUpperCase()))
  results.duplicatesInBothDBs = { count: duplicates.length, students: duplicates }

  // 4. Totals
  results.totals = {
    BD_vigente_total: allVigente.length,
    BD2_derogado_total: allDerogado.length,
  }

  return NextResponse.json({ action: 'cleanup_preview', timestamp: new Date().toISOString(), results })
}

export async function POST(request: NextRequest) {
  const { confirm } = await request.json()
  if (confirm !== 'DELETE_WRONG_PLAN_RECORDS') {
    return NextResponse.json({ error: 'Send { "confirm": "DELETE_WRONG_PLAN_RECORDS" } to execute' }, { status: 400 })
  }

  const deleted: Record<string, number> = {}

  // Delete plan='derogado' from BD (vigente)
  const wrongInVigente = await dbVigente.student.findMany({ where: { plan: 'derogado' }, select: { id: true } })
  if (wrongInVigente.length > 0) {
    await dbVigente.student.deleteMany({ where: { plan: 'derogado' } })
    deleted.from_BD_vigente = wrongInVigente.length
  }

  // Delete plan='vigente' from BD2 (derogado)
  const wrongInDerogado = await dbDerogado.student.findMany({ where: { plan: 'vigente' }, select: { id: true } })
  if (wrongInDerogado.length > 0) {
    await dbDerogado.student.deleteMany({ where: { plan: 'vigente' } })
    deleted.from_BD2_derogado = wrongInDerogado.length
  }

  return NextResponse.json({
    action: 'cleanup_executed',
    timestamp: new Date().toISOString(),
    deleted,
    message: `Eliminados ${wrongInVigente.length} registros de BD (vigente) y ${wrongInDerogado.length} de BD2 (derogado). Ejecuta GET para verificar.`,
  })
}
