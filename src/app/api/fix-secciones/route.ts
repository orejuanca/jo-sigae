import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/fix-secciones — corrección única de datos importados con columnas mal mapeadas
//
// Bug: import-excel.ts leía SECCION de cols 233-237 (que son PG.GRUPO)
//      y literalesFinales de cols 248-252 (que son SECCION real)
//
// Fix:  secciones ← literalesFinales antiguos (cols 248-252)
//       literalesFinales ← grupos[i].literal (cols 238-242 = PG.LITERAL)
//       tituloExpedicion ← actaFecha antiguo (col 254 = TITULO.EXPEDICION)
//       actaFecha ← col 256 (CERT.EXPEDICION)

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

      // Solo procesar structured_v1 que tenga el bug
      if (raw._format !== 'structured_v1') { skipped++; continue }

      const secciones = raw.secciones
      const literalesFinales = raw.literalesFinales
      const grupos = raw.grupos
      const actaFecha = raw.actaFecha
      const tituloExpedicion = raw.tituloExpedicion

      // Detectar si hay algo que corregir
      // Si literalesFinales tiene datos y secciones tiene los mismos que grupos[].grupo, hay bug
      const gruposGrupo = Array.isArray(grupos) ? grupos.map((g: Record<string, string>) => g.grupo || '') : []
      const seccionesArr = Array.isArray(secciones) ? secciones : []
      const literalesArr = Array.isArray(literalesFinales) ? literalesFinales : []

      // Verificar si secciones coincide con grupos (el bug)
      const seccionesMatchGrupos = seccionesArr.length > 0 &&
        seccionesArr.every((s: string, i: number) => s === (gruposGrupo[i] || ''))

      // Verificar si tituloExpedicion vino de actaFecha (col 254) y actaFecha no existe
      const needsTituloFix = tituloExpedicion && !actaFecha

      if (!seccionesMatchGrupos && !needsTituloFix) { skipped++; continue }

      // Aplicar corrección
      // 1. secciones ← lo que estaba en literalesFinales (cols 248-252)
      if (seccionesMatchGrupos && literalesArr.length > 0) {
        raw.secciones = literalesArr
      }

      // 2. literalesFinales ← grupos[i].literal (cols 238-242 = PG.LITERAL)
      if (seccionesMatchGrupos && Array.isArray(grupos)) {
        raw.literalesFinales = grupos.map((g: Record<string, string>) => g.literal || '')
      }

      // 3. tituloExpedicion ya estaba en raw.tituloExpedicion (correcto ahora)
      //    actaFecha necesita venir de col 256 — pero ya no tenemos la col original.
      //    Lo que estaba como tituloExpedicion era de col 254 (TITULO.EXPEDICION) — correcto.
      //    actaFecha estaba de col 254 también — era wrong. Ahora debería ser null/vacío si no hay col 256.
      if (needsTituloFix && tituloExpedicion) {
        // tituloExpedicion ya es correcto (venía de col 254)
        // actaFecha no existe en datos viejos, lo dejamos vacío
        raw.actaFecha = ''
      }

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
      message: `Corregidos ${fixed} registros. Omitidos: ${skipped}`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
