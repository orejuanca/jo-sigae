import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'

export async function POST() {
  const db = getDb('vigente')
  const fixes = [
    { cedula: 'V 31699476', col: '33', newVal: '04' },
    { cedula: 'V 32257111', col: '33', newVal: '10' },
  ]
  const results = []
  for (const f of fixes) {
    const s = await db.student.findFirst({ where: { cedula: f.cedula }, select: { id: true, rawData: true } })
    if (!s?.rawData) { results.push({ cedula: f.cedula, error: 'sin rawData' }); continue }
    const parsed = JSON.parse(s.rawData)
    const oldVal = String(parsed[f.col] ?? 'MISSING')
    parsed[f.col] = f.newVal
    await db.student.update({ where: { id: s.id }, data: { rawData: JSON.stringify(parsed) } })
    results.push({ cedula: f.cedula, col: f.col, oldVal, newVal: f.newVal })
  }
  return NextResponse.json({ fixed: results })
}