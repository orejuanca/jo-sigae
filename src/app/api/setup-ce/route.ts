import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/setup-ce — Crea la tabla CentroEscolar si no existe
export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CentroEscolar" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "codigo" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "localidad" TEXT NOT NULL DEFAULT '',
        "estado" TEXT NOT NULL DEFAULT '',
        "municipio" TEXT NOT NULL DEFAULT '',
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CentroEscolar_codigo_key" UNIQUE ("codigo")
      );
      CREATE INDEX IF NOT EXISTS "CentroEscolar_codigo_idx" ON "CentroEscolar"("codigo");
      CREATE INDEX IF NOT EXISTS "CentroEscolar_nombre_idx" ON "CentroEscolar"("nombre");
    `)
    return NextResponse.json({ success: true, message: 'Tabla CentroEscolar creada/verificada' })
  } catch (error) {
    console.error('Error creating CentroEscolar table:', error)
    return NextResponse.json({ error: 'Error al crear tabla', details: String(error) }, { status: 500 })
  }
}