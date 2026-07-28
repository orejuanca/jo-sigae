import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import * as XLSX from 'xlsx'

// Formatear fecha YYYY-MM-DDTHH:mm:ss.sssZ → DD/MM/YYYY
function fmtDate(val: string | null | undefined): string {
  if (!val) return ''
  const s = val.trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    try {
      const p = s.substring(0, 10).split('-')
      return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`
    } catch { return s }
  }
  return s
}

export async function GET() {
  try {
    const db = getDb('vigente')
    const students = await db.student.findMany({
      orderBy: { apellidos: 'asc' },
    })

    // Preparar filas para el Excel
    const rows = students.map((s, idx) => {
      // Parsear rawData para extraer campos útiles
      let raw: Record<string, unknown> = {}
      try {
        raw = typeof s.rawData === 'string' ? JSON.parse(s.rawData) : (s.rawData || {})
      } catch {}

      // Función auxiliar para obtener valor del rawData (soporta ambos formatos)
      const getRaw = (key: string): string => {
        const v = raw[key]
        if (v !== null && v !== undefined && String(v).trim()) return String(v).trim()
        return ''
      }

      // Calcular promedio si hay notas
      let promedio = ''
      const notas: number[] = []
      for (const [k, v] of Object.entries(raw)) {
        if (k.startsWith('NOTA.')) {
          const n = parseFloat(String(v))
          if (!isNaN(n) && n >= 1 && n <= 20) notas.push(n)
        }
      }
      if (notas.length > 0) promedio = (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2)

      return {
        '#': idx + 1,
        'CEDULA': s.cedula || '',
        'FECHA NACIMIENTO': fmtDate(s.fechaNacimiento),
        'APELLIDOS': s.apellidos || '',
        'NOMBRES': s.nombres || '',
        'PAIS': s.pais || 'VENEZUELA',
        'ESTADO': s.estado || '',
        'MUNICIPIO': s.municipio || '',
        'PROMEDIO': promedio,
        // Plan 1
        'INST.1': getRaw('INST.1'),
        'LOCAL.1': getRaw('LOCAL.1'),
        'EF.1': getRaw('EF.1'),
        'SECCION.1': getRaw('SECCION.1'),
        // Plan 2
        'INST.2': getRaw('INST.2'),
        'LOCAL.2': getRaw('LOCAL.2'),
        'EF.2': getRaw('EF.2'),
        'SECCION.2': getRaw('SECCION.2'),
        // Plan 3
        'INST.3': getRaw('INST.3'),
        'LOCAL.3': getRaw('LOCAL.3'),
        'EF.3': getRaw('EF.3'),
        'SECCION.3': getRaw('SECCION.3'),
        // Plan 4
        'INST.4': getRaw('INST.4'),
        'LOCAL.4': getRaw('LOCAL.4'),
        'EF.4': getRaw('EF.4'),
        'SECCION.4': getRaw('SECCION.4'),
        // Plan 5
        'INST.5': getRaw('INST.5'),
        'LOCAL.5': getRaw('LOCAL.5'),
        'EF.5': getRaw('EF.5'),
        'SECCION.5': getRaw('SECCION.5'),
        // Título
        'TITULO.SERIAL': getRaw('TITULO.SERIAL'),
        'TITULO.EXPEDICION': getRaw('TITULO.EXPEDICION'),
        'TITULO.EGRESO': getRaw('TITULO.EGRESO'),
        // Certificación
        'CERT.EXPEDICION': getRaw('CERT.EXPEDICION'),
        'OBS.CERT.L1': getRaw('OBS.CERT.L1'),
        'OBS.CERT.L2': getRaw('OBS.CERT.L2'),
        'OBS.CERT.L3': getRaw('OBS.CERT.L3'),
        'OBS.CERT.L4': getRaw('OBS.CERT.L4'),
      }
    })

    // Crear workbook y hoja
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 14 },  // CEDULA
      { wch: 14 },  // FECHA NACIMIENTO
      { wch: 25 },  // APELLIDOS
      { wch: 25 },  // NOMBRES
      { wch: 14 },  // PAIS
      { wch: 16 },  // ESTADO
      { wch: 16 },  // MUNICIPIO
      { wch: 8 },   // PROMEDIO
      // 5 planes x 4 campos cada uno = 20 columnas
      ...Array(20).fill(null).map(() => ({ wch: 14 })),
      // Título y certificación = 7 columnas
      ...Array(7).fill(null).map(() => ({ wch: 18 })),
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Plan Vigente')

    // Generar buffer
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    // Nombre del archivo con fecha y hora
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const filename = `Base de Datos de Certificaciones plan vigente ${dd}-${mm}-${yyyy} ${hh}.${mi}.${ss}.xlsx`

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
