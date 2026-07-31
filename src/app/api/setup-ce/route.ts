import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/setup-ce — Recrea la tabla CentroEscolar con el schema correcto
export async function POST() {
  try {
    // Drop tabla vieja si existe y crear nueva con schema actualizado
    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS "CentroEscolar" CASCADE;
      CREATE TABLE "CentroEscolar" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "codigo" TEXT NOT NULL DEFAULT '',
        "nombre" TEXT NOT NULL,
        "localidad" TEXT NOT NULL DEFAULT '',
        "ef" TEXT NOT NULL DEFAULT '',
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CentroEscolar_nombre_key" UNIQUE ("nombre")
      );
      CREATE INDEX IF NOT EXISTS "CentroEscolar_codigo_idx" ON "CentroEscolar"("codigo");
      CREATE INDEX IF NOT EXISTS "CentroEscolar_nombre_idx" ON "CentroEscolar"("nombre");
      CREATE INDEX IF NOT EXISTS "CentroEscolar_ef_idx" ON "CentroEscolar"("ef");
    `)
    return NextResponse.json({ success: true, message: 'Tabla CentroEscolar recreada con nuevo schema' })
  } catch (error) {
    console.error('Error recreating CentroEscolar table:', error)
    return NextResponse.json({ error: 'Error al crear tabla', details: String(error) }, { status: 500 })
  }
}
