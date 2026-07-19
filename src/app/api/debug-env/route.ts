import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    db2_prisma: process.env.DATABASE_URL_2_POSTGRES_PRISMA_URL || 'NOT SET',
    db2_url: process.env.DATABASE_URL_2 || 'NOT SET',
  })
}