import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mapeo de códigos EF a nombres de estados
const EF_MAP: Record<string, string> = {
  'AM': 'AMAZONAS', 'AN': 'ANZOÁTEGUI', 'AP': 'APURE', 'AR': 'ARAGUA',
  'BA': 'BARINAS', 'BO': 'BOLÍVAR', 'CA': 'CARABOBO', 'CO': 'COJEDES',
  'DA': 'DELTA AMACURO', 'DC': 'DISTRITO CAPITAL', 'DF': 'DISTRITO CAPITAL',
  'FA': 'FALCÓN', 'GU': 'GUÁRICO', 'LA': 'LARA', 'ME': 'MÉRIDA',
  'MI': 'MIRANDA', 'MO': 'MONAGAS', 'NE': 'NUEVA ESPARTA', 'PO': 'PORTUGUESA',
  'SU': 'SUCRE', 'TA': 'TÁCHIRA', 'TR': 'TRUJILLO', 'VA': 'VARGAS',
  'YA': 'YARACUY', 'ZU': 'ZULIA',
}
const EF_CODES = new Set(Object.keys(EF_MAP))

function cleanName(val: string): string {
  return val.replace(/^[\s*]+|[\s*]+$/g, '').trim()
}
function isEFCode(val: string): boolean {
  const upper = val.toUpperCase().trim()
  return upper.length <= 3 && EF_CODES.has(upper)
}

// POST /api/seed-ce — Extrae centros escolares únicos del rawData de todos los alumnos
export async function POST(request: NextRequest) {
  try {
    const { dryRun } = await request.json().catch(() => ({}))

    // Obtener todos los alumnos (solo rawData)
    const students = await prisma.student.findMany({
      select: { rawData: true },
    })

    // Extraer instituciones únicas
    const seen = new Map<string, { nombre: string; localidad: string; estado: string }>()
    const instSlots = [
      [8, 9, 10], [11, 12, 13], [14, 15, 16], [17, 18, 19], [20, 21, 22],
    ]

    for (const student of students) {
      let data: Record<string, string>
      try {
        data = typeof student.rawData === 'string' ? JSON.parse(student.rawData) : (student.rawData as Record<string, string>)
      } catch { continue }

      for (const [nameKey, locKey, efKey] of instSlots) {
        const nombre = cleanName(String(data[String(nameKey)] || ''))
        if (!nombre || /^\*+$/.test(nombre)) continue
        // Saltar si el "nombre" es en realidad un código EF (datos desplazados)
        if (isEFCode(nombre)) continue

        const localidad = cleanName(String(data[String(locKey)] || ''))
        // Si la localidad parece un código EF, los datos están desplazados
        if (isEFCode(localidad)) continue

        const efRaw = cleanName(String(data[String(efKey)] || '')).toUpperCase()
        const estado = EF_MAP[efRaw] || efRaw || ''

        const key = nombre.toUpperCase()
        if (!seen.has(key)) {
          seen.set(key, { nombre, localidad, estado })
        }
      }
    }

    const unique = Array.from(seen.values())
    const existing = await prisma.centroEscolar.findMany({ select: { nombre: true } })
    const existingNames = new Set(existing.map(e => e.nombre.toUpperCase()))

    const toInsert = unique.filter(u => !existingNames.has(u.nombre.toUpperCase()))

    if (dryRun) {
      return NextResponse.json({
        totalFound: unique.length,
        alreadyExist: unique.length - toInsert.length,
        toInsert: toInsert.length,
        centros: toInsert,
      })
    }

    // Insertar
    let inserted = 0
    for (let i = 0; i < toInsert.length; i++) {
      const c = toInsert[i]
      try {
        await prisma.centroEscolar.create({
          data: {
            codigo: String(i + 1).padStart(4, '0'),
            nombre: c.nombre,
            localidad: c.localidad,
            estado: c.estado,
            municipio: '',
            activo: true,
          },
        })
        inserted++
      } catch (e: unknown) {
        const err = e as { code?: string }
        if (err.code !== 'P2002') {
          console.error(`Error inserting ${c.nombre}:`, e)
        }
      }
    }

    return NextResponse.json({
      totalFound: unique.length,
      alreadyExist: unique.length - toInsert.length,
      inserted,
    })
  } catch (error) {
    console.error('Error seeding CE:', error)
    return NextResponse.json({ error: 'Error al importar centros escolares', details: String(error) }, { status: 500 })
  }
}