import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

// POST /api/seed-ce — Carga los centros escolares desde el JSON pre-generado del Excel
export async function POST() {
  try {
    // Leer el JSON directamente desde el sistema de archivos
    const jsonPath = join(process.cwd(), 'db', 'ce_seed_data.json')
    const raw = readFileSync(jsonPath, 'utf-8')
    const records: { nombre: string; localidad: string; codigo: string; ef: string }[] = JSON.parse(raw)

    // Verificar si ya hay datos
    const existing = await prisma.centroEscolar.count()
    if (existing > 0) {
      return NextResponse.json({ message: `Ya existen ${existing} registros. No se insertaron nuevos.`, inserted: 0, total: existing })
    }

    // Insertar en lotes de 100
    const BATCH = 100
    let inserted = 0
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH)
      const result = await prisma.centroEscolar.createMany({
        data: batch.map(r => ({
          nombre: r.nombre,
          localidad: r.localidad || '',
          codigo: r.codigo || '',
          ef: r.ef || '',
        })),
        skipDuplicates: true,
      })
      inserted += result.count
    }

    return NextResponse.json({ message: `Se insertaron ${inserted} centros escolares`, inserted, total: records.length })
  } catch (error) {
    console.error('Error seeding CE:', error)
    return NextResponse.json({ error: 'Error al importar centros escolares', details: String(error) }, { status: 500 })
  }
}
