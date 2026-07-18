import { PrismaClient } from '@prisma/client'

// ─── BD Principal (Plan Vigente) ───
const globalForDb = globalThis as unknown as {
  dbVigente: PrismaClient | undefined
  dbDerogado: PrismaClient | undefined
}

/** Prisma client para BD (Plan Vigente) */
export const dbVigente =
  globalForDb.dbVigente ??
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  })

if (process.env.NODE_ENV !== 'production') globalForDb.dbVigente = dbVigente

/** Prisma client para BD2 (Planes Derogados) */
export const dbDerogado =
  globalForDb.dbDerogado ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL_2 || process.env.DATABASE_URL }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForDb.dbDerogado = dbDerogado

/**
 * Obtiene el Prisma client correspondiente al plan.
 *
 * - "vigente"  → BD  (DATABASE_URL)
 * - "derogado" → BD2 (DATABASE_URL_2, fallback a DATABASE_URL)
 *
 * Para activar BD2 independiente, configura la variable de entorno:
 *   DATABASE_URL_2=postgresql://user:pass@host:5432/db2
 */
export function getDb(plan: string): PrismaClient {
  return plan === 'derogado' ? dbDerogado : dbVigente
}