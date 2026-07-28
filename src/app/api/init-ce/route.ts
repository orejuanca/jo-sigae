import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CE_SEED_DATA } from '@/lib/ce-seed-data'

// POST /api/init-ce — Inicialización completa de CE en una sola llamada
// 1. Recrea la tabla con el schema correcto
// 2. Siembra los 517 registros del Excel
export async function POST() {
  try {
    // 1) Recrear tabla con schema correcto (DROP + CREATE)
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

    // 2) Sembrar datos embebidos (no depende de archivos externos)
    const BATCH = 100
    let inserted = 0
    for (let i = 0; i < CE_SEED_DATA.length; i += BATCH) {
      const batch = CE_SEED_DATA.slice(i, i + BATCH)
      const result = await prisma.centroEscolar.createMany({
        data: batch.map(r => ({
          nombre: r.nombre,
          localidad: r.localidad || '',
          codigo: r.codigo || '',
          ef: r.ef || '',
        })),
        skipDuplicates: true,
      })
      inserted += result.count
    }

    return NextResponse.json({ success: true, inserted, total: CE_SEED_DATA.length })
  } catch (error) {
    console.error('Error init-ce:', error)
    return NextResponse.json({ error: 'Error al inicializar CE', details: String(error) }, { status: 500 })
  }
}
