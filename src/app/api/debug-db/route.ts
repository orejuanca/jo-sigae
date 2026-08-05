import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  try {
    const prisma = new PrismaClient()
    const info: Record<string, string> = {}
    info.DATABASE_URL = process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 60) + '...' : 'NOT SET'
    info.DIRECT_URL = process.env.DIRECT_DATABASE_URL ? 'SET' : 'NOT SET'
    const result = await prisma.centroEscolar.findMany({ take: 1 })
    info.query = 'OK, rows=' + result.length
    await prisma.$disconnect()
    return NextResponse.json(info)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : ''
    return NextResponse.json({ error: msg, stack: stack?.substring(0, 500) }, { status: 500 })
  }
}