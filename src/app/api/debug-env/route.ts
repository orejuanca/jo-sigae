import { NextResponse } from 'next/server'

// GET /api/debug-env — temporary debug endpoint
export async function GET() {
  const info: Record<string, string> = {}

  // Check DATABASE_URL_DB2* vars (vigente)
  info['DATABASE_URL_DB2_POSTGRES_PRISMA_URL'] = process.env.DATABASE_URL_DB2_POSTGRES_PRISMA_URL
    ? `${process.env.DATABASE_URL_DB2_POSTGRES_PRISMA_URL.substring(0, 40)}...` : 'NOT SET'
  info['DATABASE_URL_DB2'] = process.env.DATABASE_URL_DB2
    ? `${process.env.DATABASE_URL_DB2.substring(0, 40)}...` : 'NOT SET'
  info['DATABASE_URL_DB2_POSTGRES_URL'] = process.env.DATABASE_URL_DB2_POSTGRES_URL
    ? `${process.env.DATABASE_URL_DB2_POSTGRES_URL.substring(0, 40)}...` : 'NOT SET'

  // Check DATABASE_URL_2* vars (derogado)
  info['DATABASE_URL_2_POSTGRES_PRISMA_URL'] = process.env.DATABASE_URL_2_POSTGRES_PRISMA_URL
    ? `${process.env.DATABASE_URL_2_POSTGRES_PRISMA_URL.substring(0, 40)}...` : 'NOT SET'
  info['DATABASE_URL_2'] = process.env.DATABASE_URL_2
    ? `${process.env.DATABASE_URL_2.substring(0, 40)}...` : 'NOT SET'
  info['DATABASE_URL_2_POSTGRES_URL'] = process.env.DATABASE_URL_2_POSTGRES_URL
    ? `${process.env.DATABASE_URL_2_POSTGRES_URL.substring(0, 40)}...` : 'NOT SET'

  // Check DATABASE_URL (original)
  info['DATABASE_URL'] = process.env.DATABASE_URL
    ? `${process.env.DATABASE_URL.substring(0, 40)}...` : 'NOT SET'

  return NextResponse.json(info)
}