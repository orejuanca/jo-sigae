import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CE_SEED_DATA } from '@/lib/ce-seed-data'

// POST /api/init-ce — Inicialización completa de CE
export async function POST() {
  try {
    // 1) Drop tabla vieja si existe
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "CentroEscolar" CASCADE`)

    // 2) Crear tabla con schema correcto
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "CentroEscolar" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "codigo"    TEXT NOT NULL DEFAULT '',
        "nombre"    TEXT NOT NULL,
        "localidad" TEXT NOT NULL DEFAULT '',
        "ef"        TEXT NOT NULL DEFAULT '',
        "activo"    BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CentroEscolar_nombre_key" UNIQUE ("nombre")
      )
    `)

    // 3) Crear índices
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CentroEscolar_codigo_idx" ON "CentroEscolar"("codigo")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CentroEscolar_nombre_idx" ON "CentroEscolar"("nombre")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CentroEscolar_ef_idx" ON "CentroEscolar"("ef")`)

    // 4) Insertar datos con raw SQL (no depende de Prisma ORM)
    let inserted = 0
    const BATCH = 200
    for (let i = 0; i < CE_SEED_DATA.length; i += BATCH) {
      const batch = CE_SEED_DATA.slice(i, i + BATCH)
      const values = batch.map(r => {
        const nombre = r.nombre.replace(/'/g, "''")
        const localidad = (r.localidad || '').replace(/'/g, "''")
        const codigo = (r.codigo || '').replace(/'/g, "''")
        const ef = (r.ef || '').replace(/'/g, "''")
        const id = 'ce_' + Math.random().toString(36).slice(2, 15)
        return `('${id}','${codigo}','${nombre}','${localidad}','${ef}',true)`
      }).join(',')

      await prisma.$executeRawUnsafe(
        `INSERT INTO "CentroEscolar" ("id","codigo","nombre","localidad","ef","activo","createdAt","updatedAt") VALUES ${values}
         ON CONFLICT ("nombre") DO NOTHING`
      )
      inserted += batch.length
    }

    return NextResponse.json({ success: true, inserted, total: CE_SEED_DATA.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error init-ce:', msg)
    return NextResponse.json({ error: 'Error al inicializar CE', details: msg }, { status: 500 })
  }
}
