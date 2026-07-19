import { PrismaClient } from '@prisma/client'

// ─── Base de datos única (Postgres / Neon) ───
// Ambos planes (vigente y derogado) comparten la misma BD.
// La separación de datos se hace mediante el campo `plan` en cada registro.

const globalForDb = globalThis as unknown as { db: PrismaClient | undefined }

/** Asegura que la URL tenga parámetros SSL necesarios para Vercel Postgres */
function ensureSSL(url: string): string {
  if (!url) return url
  if (!url.includes('sslmode')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require'
  }
  return url
}

/** Prisma client único — conecta a la BD principal */
export const db =
  globalForDb.db ??
  new PrismaClient({
    datasources: { db: { url: ensureSSL(process.env.DATABASE_URL || '') } }
  })

if (process.env.NODE_ENV !== 'production') globalForDb.db = db

/**
 * Obtiene el Prisma client.
 * Ambos planes usan la misma BD; la separación se hace
 * filtrando por el campo `plan` en las consultas.
 */
export function getDb(_plan: string): PrismaClient {
  return db
}