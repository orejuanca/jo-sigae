import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/fix-secciones — corrección única de datos importados con columnas mal mapeadas
//
// Bug original: import-excel.ts leía SECCION de cols 233-237 (PG.GRUPO)
//              y literalesFinales de cols 248-252 (SECCION real)
//              y PG.LITERAL de cols 248-252 (debía ser 238-242)
//
// Fix:  secciones ← literalesFinales antiguos (lo que estaba en 248-252 = SECCION real)
//       literalesFinales ← grupos[i].literal (cols 238-242 = PG.LITERAL)

export async function POST() {
  try {
    const students = await prisma.student.findMany({
      where: { plan: 'vigente' },
      select: { id: true, rawData: true },
    })

    let fixed = 0
    let skipped = 0

    for (const student of students) {
      if (!student.rawData || student.rawData === '{}') { skipped++; continue }

      let raw: Record<string, unknown>
      try { raw = JSON.parse(student.rawData) } catch { skipped++; continue }

      if (raw._format !== 'structured_v1') { skipped++; continue }

      const secciones: unknown[] = Array.isArray(raw.secciones) ? raw.secciones : []
      const literalesFinales: unknown[] = Array.isArray(raw.literalesFinales) ? raw.literalesFinales : []
      const grupos: Record<string, string>[] = Array.isArray(raw.grupos) ? raw.grupos : []

      // Detectar bug: secciones tiene los mismos valores que grupos[].grupo
      // (ambos venían de cols 233-237)
      const gruposGrupo = grupos.map(g => g.grupo || '')
      const seccionesStr = secciones.map(s => String(s || ''))
      const literalesStr = literalesFinales.map(l => String(l || ''))

      // El bug está presente si secciones == grupos[].grupo
      const tieneBug = seccionesStr.length > 0 &&
        seccionesStr.every((s, i) => s === (gruposGrupo[i] || ''))

      // También si secciones está vacío pero literalesFinales tiene datos
      const seccionVacia = seccionesStr.every(s => s === '')
      const literalesTieneDatos = literalesStr.some(l => l !== '')

      if (!tieneBug && !(seccionVacia && literalesTieneDatos)) { skipped++; continue }

      // Corregir: intercambiar secciones y literalesFinales
      if (literalesTieneDatos) {
        raw.secciones = literalesStr
      }

      // literalesFinales ahora viene de grupos[i].literal (cols 238-242)
      raw.literalesFinales = grupos.map(g => g.literal || '')

      await prisma.student.update({
        where: { id: student.id },
        data: { rawData: JSON.stringify(raw) },
      })
      fixed++
    }

    return NextResponse.json({
      ok: true,
      total: students.length,
      fixed,
      skipped,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
