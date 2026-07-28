import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db-helper'
import * as XLSX from 'xlsx'

// === CAMPOS DEL DASHBOARD (mismo orden que FIELD_MAP en dashboard-content.tsx) ===
const ALL_FIELDS: string[] = [
  'CEDULA','FECHA','APELLIDOS','NOMBRES','PAIS','ESTADO','MUNICIPIO',
  'INST.1','LOCAL.1','EF.1',
  'INST.2','LOCAL.2','EF.2',
  'INST.3','LOCAL.3','EF.3',
  'INST.4','LOCAL.4','EF.4',
  'INST.5','LOCAL.5','EF.5',
  'NOTA.CA.1','EVAL.CA.1','MES.CA.1','AÑO.CA.1','INST.CA.1',
  'NOTA.IN.1','EVAL.IN.1','MES.IN.1','AÑO.IN.1','INST.IN.1',
  'NOTA.MA.1','EVAL.MA.1','MES.MA.1','AÑO.MA.1','INST.MA.1',
  'NOTA.EF.1','EVAL.EF.1','MES.EF.1','AÑO.EF.1','INST.EF.1',
  'NOTA.AP.1','EVAL.AP.1','MES.AP.1','AÑO.AP.1','INST.AP.1',
  'NOTA.CN.1','EVAL.CN.1','MES.CN.1','AÑO.CN.1','INST.CN.1',
  'NOTA.GH.1','EVAL.GH.1','MES.GH.1','AÑO.GH.1','INST.GH.1',
  'NOTA.CA.2','EVAL.CA.2','MES.CA.2','AÑO.CA.2','INST.CA.2',
  'NOTA.IN.2','EVAL.IN.2','MES.IN.2','AÑO.IN.2','INST.IN.2',
  'NOTA.MA.2','EVAL.MA.2','MES.MA.2','AÑO.MA.2','INST.MA.2',
  'NOTA.EF.2','EVAL.EF.2','MES.EF.2','AÑO.EF.2','INST.EF.2',
  'NOTA.AP.2','EVAL.AP.2','MES.AP.2','AÑO.AP.2','INST.AP.2',
  'NOTA.CN.2','EVAL.CN.2','MES.CN.2','AÑO.CN.2','INST.CN.2',
  'NOTA.GH.2','EVAL.GH.2','MES.GH.2','AÑO.GH.2','INST.GH.2',
  'NOTA.CA.3','EVAL.CA.3','MES.CA.3','AÑO.CA.3','INST.CA.3',
  'NOTA.IN.3','EVAL.IN.3','MES.IN.3','AÑO.IN.3','INST.IN.3',
  'NOTA.MA.3','EVAL.MA.3','MES.MA.3','AÑO.MA.3','INST.MA.3',
  'NOTA.EF.3','EVAL.EF.3','MES.EF.3','AÑO.EF.3','INST.EF.3',
  'NOTA.FI.3','EVAL.FI.3','MES.FI.3','AÑO.FI.3','INST.FI.3',
  'NOTA.QU.3','EVAL.QU.3','MES.QU.3','AÑO.QU.3','INST.QU.3',
  'NOTA.BI.3','EVAL.BI.3','MES.BI.3','AÑO.BI.3','INST.BI.3',
  'NOTA.GH.3','EVAL.GH.3','MES.GH.3','AÑO.GH.3','INST.GH.3',
  'NOTA.CA.4','EVAL.CA.4','MES.CA.4','AÑO.CA.4','INST.CA.4',
  'NOTA.IN.4','EVAL.IN.4','MES.IN.4','AÑO.IN.4','INST.IN.4',
  'NOTA.MA.4','EVAL.MA.4','MES.MA.4','AÑO.MA.4','INST.MA.4',
  'NOTA.EF.4','EVAL.EF.4','MES.EF.4','AÑO.EF.4','INST.EF.4',
  'NOTA.FI.4','EVAL.FI.4','MES.FI.4','AÑO.FI.4','INST.FI.4',
  'NOTA.QU.4','EVAL.QU.4','MES.QU.4','AÑO.QU.4','INST.QU.4',
  'NOTA.BI.4','EVAL.BI.4','MES.BI.4','AÑO.BI.4','INST.BI.4',
  'NOTA.GH.4','EVAL.GH.4','MES.GH.4','AÑO.GH.4','INST.GH.4',
  'NOTA.FS.4','EVAL.FS.4','MES.FS.4','AÑO.FS.4','INST.FS.4',
  'NOTA.CA.5','EVAL.CA.5','MES.CA.5','AÑO.CA.5','INST.CA.5',
  'NOTA.IN.5','EVAL.IN.5','MES.IN.5','AÑO.IN.5','INST.IN.5',
  'NOTA.MA.5','EVAL.MA.5','MES.MA.5','AÑO.MA.5','INST.MA.5',
  'NOTA.EF.5','EVAL.EF.5','MES.EF.5','AÑO.EF.5','INST.EF.5',
  'NOTA.FI.5','EVAL.FI.5','MES.FI.5','AÑO.FI.5','INST.FI.5',
  'NOTA.QU.5','EVAL.QU.5','MES.QU.5','AÑO.QU.5','INST.QU.5',
  'NOTA.BI.5','EVAL.BI.5','MES.BI.5','AÑO.BI.5','INST.BI.5',
  'NOTA.CT.5','EVAL.CT.5','MES.CT.5','AÑO.CT.5','INST.CT.5',
  'NOTA.GH.5','EVAL.GH.5','MES.GH.5','AÑO.GH.5','INST.GH.5',
  'NOTA.FS.5','EVAL.FS.5','MES.FS.5','AÑO.FS.5','INST.FS.5',
  'OC.LITERAL.1','OC.LITERAL.2','OC.LITERAL.3','OC.LITERAL.4','OC.LITERAL.5',
  'PG.GRUPO.1','PG.GRUPO.2','PG.GRUPO.3','PG.GRUPO.4','PG.GRUPO.5',
  'PG.LITERAL.1','PG.LITERAL.2','PG.LITERAL.3','PG.LITERAL.4','PG.LITERAL.5',
  'OBS.CERT.L1','OBS.CERT.L2','OBS.NOTAS.L1','OBS.NOTAS.L2','OBS.NOTAS.L3',
  'SECCION.1','SECCION.2','SECCION.3','SECCION.4','SECCION.5',
  'TITULO.SERIAL','TITULO.EXPEDICION','TITULO.EGRESO','CERT.EXPEDICION',
  'OBS.BOLETA.L1','OBS.BOLETA.L2','OBS.BOLETA.L3','OBS.CERT.L3','OBS.CERT.L4',
]

// Campos personales que vienen del modelo Student, no del rawData
const PERSONAL_FIELDS = new Set(['CEDULA','FECHA','APELLIDOS','NOMBRES','PAIS','ESTADO','MUNICIPIO'])

// Formatear fecha YYYY-MM-DD → DD/MM/YYYY
function fmtDate(val: string | null | undefined): string {
  if (!val) return ''
  const s = val.trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    try { const p = s.substring(0, 10).split('-'); return `${p[2].padStart(2,'0')}/${p[1].padStart(2,'0')}/${p[0]}` } catch { return s }
  }
  return s
}

export async function GET(request: NextRequest) {
  try {
    const plan = request.nextUrl.searchParams.get('plan') || 'vigente'
    if (plan !== 'vigente' && plan !== 'derogado') {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const db = getDb(plan)
    const students = await db.student.findMany({
      orderBy: { cedula: 'asc' },
    })

    // Para cada estudiante, extraer los 261 campos
    const rows = students.map((s, idx) => {
      // Parsear rawData
      let raw: Record<string, string> = {}
      try {
        const parsed = typeof s.rawData === 'string' ? JSON.parse(s.rawData) : (s.rawData || {})
        // Si es formato estructurado, aplanar
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Formato plano (clave-valor directo)
          for (const [k, v] of Object.entries(parsed)) {
            if (v !== null && v !== undefined) raw[k] = String(v)
          }
        }
      } catch {}

      const getVal = (field: string): string => {
        // Campos personales vienen del modelo Student
        if (field === 'CEDULA') return s.cedula || ''
        if (field === 'FECHA') return fmtDate(s.fechaNacimiento)
        if (field === 'APELLIDOS') return s.apellidos || ''
        if (field === 'NOMBRES') return s.nombres || ''
        if (field === 'PAIS') return s.pais || 'VENEZUELA'
        if (field === 'ESTADO') return s.estado || ''
        if (field === 'MUNICIPIO') return s.municipio || ''
        // Demás campos del rawData
        return raw[field] || ''
      }

      const row: Record<string, string> = { '#': String(idx + 1) }
      for (const field of ALL_FIELDS) {
        row[field] = getVal(field)
      }
      return row
    })

    // Crear workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Anchos de columna: # + 261 campos
    ws['!cols'] = [
      { wch: 5 }, // #
      ...ALL_FIELDS.map(() => ({ wch: 16 })),
    ]

    const sheetName = plan === 'vigente' ? 'Plan Vigente' : 'Plan Derogado'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

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
    const planLabel = plan === 'vigente' ? 'plan vigente' : 'plan derogado'
    const filename = `Base de Datos de Certificaciones ${planLabel} ${dd}-${mm}-${yyyy} ${hh}.${mi}.${ss}.xlsx`

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
