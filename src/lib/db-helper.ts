import { PrismaClient } from '@prisma/client'

// ─── Dos bases de datos totalmente independientes ───
// BD  (jo-sigae-db) → Plan Vigente  → env prefix: DATABASE_URL_DB2
// BD2 (bd2-derogados) → Plan Derogado → env prefix: DATABASE_URL_2

const globalForDb = globalThis as unknown as {
  dbVigente: PrismaClient | undefined
  dbDerogado: PrismaClient | undefined
}

/**
 * Resuelve la URL de conexión para un store de Vercel Postgres.
 * Prioridad: POSTGRES_PRISMA_URL > POSTGRES_URL > base URL > fallback
 */
function resolveUrl(prefix: string, fallback?: string): string {
  const prismaUrl = process.env[`${prefix}_POSTGRES_PRISMA_URL`]
  const directUrl = process.env[`${prefix}_POSTGRES_URL`]
  const dbUrl = process.env[prefix]
  return prismaUrl || directUrl || dbUrl || fallback || ''
}

/** Prisma client para BD - Plan Vigente */
export const dbVigente =
  globalForDb.dbVigente ??
  new PrismaClient({
    datasources: { db: { url: resolveUrl('DATABASE_URL_DB2', process.env.DATABASE_URL) } }
  })

if (process.env.NODE_ENV !== 'production') globalForDb.dbVigente = dbVigente

/**
 * Prisma client para BD2 - Plan Derogado.
 * IMPORTANTE: El POSTGRES_PRISMA_URL de BD2 apunta a la BD equivocada (neondb),
 * así que usamos DATABASE_URL_2 directamente que apunta a la BD correcta (bd2).
 */
export const dbDerogado =
  globalForDb.dbDerogado ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL_2
          || process.env.DATABASE_URL_2_POSTGRES_URL
          || ''
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForDb.dbDerogado = dbDerogado

/**
 * Obtiene el Prisma client correspondiente al plan.
 * - "vigente"  → BD  (DATABASE_URL_DB2)
 * - "derogado" → BD2 (DATABASE_URL_2)
 */
export function getDb(plan: string): PrismaClient {
  return plan === 'derogado' ? dbDerogado : dbVigente
}