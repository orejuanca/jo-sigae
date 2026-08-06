import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import { fmtDate } from '@/lib/flatten-raw'
import { FIELD_MAP_VIGENTE, FIELD_MAP_DEROGADO } from '@/lib/field-maps'
import * as XLSX from 'xlsx'

// Campos que se extraen directamente del registro (no del rawData)
const BASE_FIELDS = new Set(['CEDULA','FECHA','APELLIDOS','NOMBRES','PAIS','ESTADO','MUNICIPIO'])

// Obtener la lista de campos según el plan (mismo orden que el dashboard)
function getFieldsForPlan(plan: string): string[] {
  const map = plan === 'derogado' ? FIELD_MAP_DEROGADO : FIELD_MAP_VIGENTE
  return map.map(([field]) => field)
}

export async function GET(request: NextRequest) {
  try {
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'
    if (plan !== 'vigente' && plan !== 'derogado') {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const debug = request.nextUrl.searchParams.get('debug') === '1'
    const ALL_FIELDS = getFieldsForPlan(plan)
    const db = getDb(plan)
    const students = plan === 'vigente'
      ? await db.planVigente.findMany({ orderBy: { cedula: 'asc' } })
      : await db.planDerogado.findMany({ orderBy: { cedula: 'asc' } })

    // Para cada estudiante, leer directamente del rawData parseado
    const rows = students.map((s, idx) => {
      let raw: Record<string, unknown> = {}
      try {
        const parsed = typeof s.rawData === 'string' ? JSON.parse(s.rawData) : (s.rawData || {})
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          raw = parsed
        }
      } catch (e) {
        console.error(`[EXPORT] Error parseando rawData estudiante #${idx + 1}:`, e)
      }

      const row: Record<string, string> = { '#': String(idx + 1) }
      for (const field of ALL_FIELDS) {
        if (BASE_FIELDS.has(field)) {
          switch (field) {
            case 'CEDULA':    row[field] = s.cedula || ''; break
            case 'FECHA':     row[field] = fmtDate(s.fechaNacimiento); break
            case 'APELLIDOS': row[field] = s.apellidos || ''; break
            case 'NOMBRES':   row[field] = s.nombres || ''; break
            case 'PAIS':      row[field] = s.pais || 'VENEZUELA'; break
            case 'ESTADO':    row[field] = s.estado || ''; break
            case 'MUNICIPIO': row[field] = s.municipio || ''; break
          }
        } else {
          // Leer directamente del rawData — los datos ya están con la clave correcta
          row[field] = raw[field] != null ? String(raw[field]).trim() : ''
        }
      }
      return row
    })

    // MODO DEBUG
    if (debug) {
      return NextResponse.json({
        plan,
        totalStudents: students.length,
        totalFields: ALL_FIELDS.length,
        fields: ALL_FIELDS,
        first3: rows.slice(0, 3),
      })
    }

    // Crear workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows as Record<string, string>[])

    // Anchos de columna
    ws['!cols'] = [
      { wch: 5 }, // #
      ...ALL_FIELDS.map(() => ({ wch: 16 })),
    ]

    const sheetName = plan === 'vigente' ? 'Plan Vigente' : 'Plan Derogado'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Generar buffer
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    // Nombre del archivo: fecha y hora en zona Caracas (UTC-4), formato 12h AM/PM
    const now = new Date()
    const caracas = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }))
    const dd = String(caracas.getDate()).padStart(2, '0')
    const mm = String(caracas.getMonth() + 1).padStart(2, '0')
    const yyyy = caracas.getFullYear()
    let hh12 = caracas.getHours() % 12 || 12
    const ampm = caracas.getHours() < 12 ? 'AM' : 'PM'
    const mi = String(caracas.getMinutes()).padStart(2, '0')
    const ss = String(caracas.getSeconds()).padStart(2, '0')
    const planLabel = plan === 'vigente' ? 'plan vigente' : 'plan derogado'
    const filename = `Base de Datos de Certificaciones ${planLabel} ${dd}-${mm}-${yyyy} ${hh12}.${mi}.${ss} ${ampm}.xlsx`

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('Error exportando datos:', error)
    return NextResponse.json({ error: 'Error al exportar datos' }, { status: 500 })
  }
}
