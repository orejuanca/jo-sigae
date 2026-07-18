import { NextResponse } from 'next/server'
import { dbDerogado } from '@/lib/db-helper'

// POST /api/setup-db2 — Crea las tablas necesarias en BD2 si no existen
export async function POST() {
  try {
    await dbDerogado.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Student" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "cedula" TEXT NOT NULL,
        "fechaNacimiento" TEXT,
        "apellidos" TEXT NOT NULL,
        "nombres" TEXT NOT NULL,
        "pais" TEXT NOT NULL DEFAULT 'VENEZUELA',
        "estado" TEXT NOT NULL DEFAULT '',
        "municipio" TEXT NOT NULL DEFAULT '',
        "seccion" TEXT NOT NULL DEFAULT '',
        "plan" TEXT NOT NULL DEFAULT 'vigente',
        "rawData" TEXT NOT NULL DEFAULT '{}',
        "certDraft" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Student_cedula_key" UNIQUE ("cedula")
      )
    `)
    await dbDerogado.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Student_cedula_idx" ON "Student"("cedula")
    `)
    await dbDerogado.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Student_apellidos_idx" ON "Student"("apellidos")
    `)
    await dbDerogado.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Student_nombres_idx" ON "Student"("nombres")
    `)
    return NextResponse.json({ success: true, message: 'Tablas BD2 creadas/verificadas' })
  } catch (error) {
    console.error('Error creating BD2 tables:', error)
    return NextResponse.json({ error: 'Error al crear tablas en BD2', details: String(error) }, { status: 500 })
  }
}