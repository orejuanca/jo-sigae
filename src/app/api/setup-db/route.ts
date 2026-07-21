import { NextResponse } from 'next/server'
import { dbVigente, dbDerogado } from '@/lib/db-helper'

// Crear tabla DashboardState si no existe en ambas BD
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "DashboardState" (
  "id" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "datos" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashboardState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DashboardState_plan_key" ON "DashboardState"("plan");
`

export async function GET() {
  const results: Record<string, string> = {}

  try {
    await dbVigente.$executeRawUnsafe(CREATE_TABLE_SQL)
    results.vigente = 'OK'
  } catch (e: unknown) {
    results.vigente = `ERROR: ${e instanceof Error ? e.message : 'unknown'}`
  }

  try {
    await dbDerogado.$executeRawUnsafe(CREATE_TABLE_SQL)
    results.derogado = 'OK'
  } catch (e: unknown) {
    results.derogado = `ERROR: ${e instanceof Error ? e.message : 'unknown'}`
  }

  return NextResponse.json({ message: 'Tablas DashboardState creadas', results })
}