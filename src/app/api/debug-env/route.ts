import { NextResponse } from 'next/server'

// GET /api/debug-env — Muestra vars de entorno enmascaradas (temporal)
export async function GET() {
  const du = process.env.DATABASE_URL || 'NO SET'
  const du2 = process.env.DATABASE_URL_2 || 'NO SET'
  const mask = (s: string) => s.replace(/(:\/\/[^:]+:)[^@]+(@.*)/, '$1****$2')
  return NextResponse.json({
    DATABASE_URL: mask(du),
    DATABASE_URL_2: mask(du2),
    has_DU2: !!process.env.DATABASE_URL_2,
  })
}