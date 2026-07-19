import { PrismaClient } from '@prisma/client'

// ─── Dos bases de datos independientes ───
// BD (DATABASE_URL) → Plan Vigente
// BD2 (DATABASE_URL_2) → Plan Derogado

const globalForDb = globalThis as unknown as {
  dbVigente: PrismaClient | undefined
  dbDerogado: PrismaClient | undefined
}

/** Asegura que la URL tenga sslmode=require */
function ensureSSL(url: string): string {
  if (!url) return url
  if (!url.includes('sslmode')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require'
  }
  return url
}

/** Prisma client para BD (Plan Vigente) */
export const dbVigente =
  globalForDb.dbVigente ??
  new PrismaClient({
    datasources: { db: { url: ensureSSL(process.env.DATABASE_URL || '') } }
  })

if (process.env.NODE_ENV !== 'production') globalForDb.dbVigente = dbVigente

/** Prisma client para BD2 (Plan Derogado) */
export const dbDerogado =
  globalForDb.dbDerogado ??
  new PrismaClient({
    datasources: {
      db: { url: ensureSSL(process.env.DATABASE_URL_2 || process.env.DATABASE_URL || '') }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForDb.dbDerogado = dbDerogado

/**
 * Obtiene el Prisma client correspondiente al plan.
 * - "vigente"  → BD  (DATABASE_URL)
 * - "derogado" → BD2 (DATABASE_URL_2)
 */
export function getDb(plan: string): PrismaClient {
  return plan === 'derogado' ? dbDerogado : dbVigente
}