import { NextResponse } from 'next/server'
import { dbVigente, dbDerogado } from '@/lib/db-helper'

const SQL_1 = `CREATE TABLE IF NOT EXISTS "DashboardState" (
  "id" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "datos" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashboardState_pkey" PRIMARY KEY ("id")
)`

const SQL_2 = `CREATE UNIQUE INDEX IF NOT EXISTS "DashboardState_plan_key" ON "DashboardState"("plan")`

async function setupDb(db: any, name: string): Promise<string> {
  try {
    await db.$executeRawUnsafe(SQL_1)
    await db.$executeRawUnsafe(SQL_2)
    return 'OK'
  } catch (e: unknown) {
    return `ERROR: ${e instanceof Error ? e.message : 'unknown'}`
  }
}

export async function GET() {
  const results: Record<string, string> = {}
  results.vigente = await setupDb(dbVigente, 'vigente')
  results.derogado = await setupDb(dbDerogado, 'derogado')
  return NextResponse.json({ message: 'Tablas DashboardState creadas', results })
}