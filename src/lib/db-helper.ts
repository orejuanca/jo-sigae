import { PrismaClient } from '@prisma/client'

// ─── Single SQLite database for both plans ───
// Both Plan Vigente and Plan Derogado share the same DB.
// The `plan` field on each Student record determines which plan they belong to.

const globalForDb = globalThis as unknown as {
  db: PrismaClient | undefined
}

/** Single shared Prisma client (SQLite) */
export const db =
  globalForDb.db ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForDb.db = db

/**
 * Returns the Prisma client for the given plan.
 * Since both plans share a single DB, this always returns the same client.
 * The plan filter is applied at query level (where: { plan }).
 */
export function getDb(_plan: string): PrismaClient {
  return db
}

/** Aliases for backwards compatibility */
export const dbVigente = db
export const dbDerogado = db
