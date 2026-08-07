import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  try {
    const prisma = new PrismaClient()
    const info: Record<string, unknown> = {}
    const url = process.env.DATABASE_URL || ''
    try {
      const parsed = new URL(url)
      info.db_host = parsed.hostname
      info.db_name = parsed.pathname.replace('/', '')
      info.full_url_no_pass = url.replace(/:([^@/]+)@/, ':***@')
    } catch { info.raw_url = url }
    info.DIRECT_URL = process.env.DIRECT_DATABASE_URL ? 'SET' : 'NOT SET'
    const tables: Record<string, string> = {}
    try { tables.CentroEscolar = 'OK rows=' + (await prisma.centroEscolar.count()) } catch(e: unknown) { tables.CentroEscolar = (e as Error).message.substring(0,80) }
    try { tables.PlanVigente = 'OK rows=' + (await prisma.planVigente.count()) } catch(e: unknown) { tables.PlanVigente = (e as Error).message.substring(0,80) }
    try { tables.DashboardState = 'OK rows=' + (await prisma.dashboardState.count()) } catch(e: unknown) { tables.DashboardState = (e as Error).message.substring(0,80) }
    try { tables.Student = 'OK rows=' + (await prisma.student.count()) } catch(e: unknown) { tables.Student = (e as Error).message.substring(0,80) }
    info.tables = tables
    await prisma.$disconnect()
    return NextResponse.json(info)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}