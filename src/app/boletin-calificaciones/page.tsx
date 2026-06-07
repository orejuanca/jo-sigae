'use client'

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Printer, Search, Loader2, ArrowLeft, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  planEMG,
  formatCedulaFinal,
  schoolConfig,
  type MateriaAnio,
} from '@/lib/school-config'

// ── Types ──────────────────────────────────────────────────────────────
interface BoletaNotaRecord {
  id: string
  studentId: string
  materia: string
  lapso1: string | null
  lapso2: string | null
  lapso3: string | null
  revision: string | null
}

interface BoletaExtraRecord {
  id: string
  studentId: string
  grupo1: string | null
  grupo2: string | null
  grupo3: string | null
  grupo4: string | null
  observacion: string | null
  obsBoletin: string | null
  materiaPendiente1: string | null
  materiaPendiente2: string | null
  mp1m1: string | null
  mp1m2: string | null
  mp1m3: string | null
  mp1m4: string | null
  mp2m1: string | null
  mp2m2: string | null
  mp2m3: string | null
  mp2m4: string | null
}

interface StudentNota {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  seccion: string
  fechaNacimiento: string | null
  pais: string
  estado: string
  municipio: string
  boletaNotas: BoletaNotaRecord[]
  boletaExtras: BoletaExtraRecord[]
}

// ── Grade labels ──────────────────────────────────────────────────────
const GRADO_LABELS: Record<string, string> = {
  '1': 'Primer Año',
  '2': 'Segundo Año',
  '3': 'Tercer Año',
  '4': 'Cuarto Año',
  '5': 'Quinto Año',
}

const ANIO_ESCOLAR_OPTIONS = Array.from({ length: 2026 - 2017 + 1 }, (_, i) => {
  const y = 2017 + i
  return `${y}-${y + 1}`
})

const SECCION_OPTIONS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

// ── Helpers ────────────────────────────────────────────────────────────
function getMateriasForGrado(grado: string): MateriaAnio[] {
  const idx = parseInt(grado, 10) - 1
  if (idx < 0 || idx >= planEMG.length) return []
  return planEMG[idx].materias
}

function calcDef(l1: string | null, l2: string | null, l3: string | null): string {
  const vals = [l1 || '', l2 || '', l3 || '']
  for (const v of vals) {
    const trimmed = v.trim().toUpperCase()
    if (trimmed === 'IN' || trimmed === 'PE') return trimmed
  }
  const nums = vals.map(v => parseFloat(v.trim()))
  const valid = nums.filter(n => !isNaN(n) && n > 0)
  if (valid.length === 0) return ''
  const avg = valid.reduce((a, b) => a + b, 0) / 3
  return String(Math.round(avg))
}

function calcStudentPromedio(materias: MateriaAnio[], notas: Record<string, { lapso1: string; lapso2: string; lapso3: string }>): number {
  let sum = 0
  let count = 0
  for (const m of materias) {
    if (m.tipo === 'cualitativa') continue
    const n = notas[m.nombre]
    if (!n) continue
    const def = calcDef(n.lapso1 || null, n.lapso2 || null, n.lapso3 || null)
    const num = parseFloat(def)
    if (!isNaN(num) && num > 0) { sum += num; count++ }
  }
  if (count === 0) return 0
  return sum / count
}

const CUALITATIVA_DESCRIPTIONS: Record<string, string> = {
  'A': 'EVIDENCIA UN EXCELENTE DESARROLLO DE SUS POTENCIALIDADES, TOMANDO EN CUENTA SU PARTICIPACIÓN INDIVIDUAL Y COLECTIVA DURANTE EL PROCESO',
  'B': 'EVIDENCIA UN BUEN DESARROLLO DE SUS POTENCIALIDADES, TOMANDO EN CUENTA SU PARTICIPACIÓN INDIVIDUAL Y COLECTIVA. DEBE CONTINUAR FORTALECIENDO',
  'C': 'EVIDENCIA UN SATISFACTORIO DESARROLLO DE SUS POTENCIALIDADES, TOMANDO EN CUENTA SU PARTICIPACIÓN REQUIERE ORIENTACIÓN PARA SU CONSOLIDACIÓN',
  'D': 'EVIDENCIA UN ACEPTABLE DESARROLLO DE SUS POTENCIALIDADES, TOMANDO EN CUENTA SU PARTICIPACIÓN REQUIERE REFORZAR Y REORIENTAR EL APRENDIZAJE',
}

function getFechaActual(): string {
  const hoy = new Date()
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}.`
}

function formatDate(fechaStr: string | null): string {
  if (!fechaStr) return ''
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  } catch { return fechaStr }
}

// Common table style
const B = 'border: 1px solid #000; border-collapse: collapse;'
const cell = { fontSize: '9pt', fontFamily: 'Calibri, sans-serif', padding: '2px 4px', border: '1px solid #000' }
const cellNB = { fontSize: '9pt', fontFamily: 'Calibri, sans-serif', padding: '2px 4px', border: 'none' }
const cellDot = { fontSize: '9pt', fontFamily: 'Calibri, sans-serif', padding: '2px 4px', border: '1px dotted #000' }
const hdr = { fontSize: '10pt', fontFamily: 'Calibri, sans-serif', padding: '2px 3px', border: '1px solid #000', fontWeight: 'bold', textAlign: 'center' as const }

// Format numeric grade: add leading zero for values > 0 and < 10
function fmtNota(val: string): string {
  const trimmed = val.trim()
  if (trimmed === '' || trimmed === 'IN' || trimmed === 'PE') return trimmed
  const num = parseFloat(trimmed)
  if (isNaN(num) || num <= 0 || num >= 10) return trimmed
  return num < 10 ? `0${Math.round(num)}` : trimmed
}

// ── Boletín Content Component ────────────────────────────────────────────
function BoletinContent({
  student,
  anioEscolar,
  grado,
  seccion,
  position,
  listaNum,
  allStudentsPromedios,
}: {
  student: StudentNota
  anioEscolar: string
  grado: string
  seccion: string
  position: number
  listaNum: number
  allStudentsPromedios: number[]
}) {
  const materias = getMateriasForGrado(grado)
  const numericMaterias = materias.filter(m => m.tipo !== 'cualitativa')
  const cualitativas = materias.filter(m => m.tipo === 'cualitativa')

  const notasMap: Record<string, { lapso1: string; lapso2: string; lapso3: string; revision: string }> = {}
  for (const nota of student.boletaNotas) {
    notasMap[nota.materia] = { lapso1: nota.lapso1 || '', lapso2: nota.lapso2 || '', lapso3: nota.lapso3 || '', revision: nota.revision || '' }
  }

  const extra = student.boletaExtras?.[0]
  const observacion = extra?.obsBoletin || extra?.observacion || ''

  // Mapping de notas de revisión: subject name → BoletaExtra score field
  const REVISION_SCORE_MAP: Record<string, string> = {
    'Castellano': extra?.scoreCA || '',
    'Inglés y otras Lenguas Extranjeras': extra?.scoreILE || '',
    'Matemáticas': extra?.scoreMA || '',
    'Educación Física': extra?.scoreEF || '',
    'Arte y Patrimonio': extra?.scoreAP || '',
    'Ciencias Naturales': extra?.scoreCN || '',
    'Geografía, Historia y Ciudadanía': extra?.scoreGHC || '',
  }
  const promedio = calcStudentPromedio(materias, notasMap)

  const orientacionNota = notasMap['Orientación y Convivencia']
  const participacionNota = notasMap['Participación Grupal']
  const orientacionGrade = orientacionNota?.lapso1?.trim().toUpperCase() || ''
  const participacionGrade = participacionNota?.lapso1?.trim().toUpperCase() || ''

  // Materias Pendientes — usar datos de BD (MP1/MP2 + momentos)
  const pendienteRows: { materia: string; momentos: [string, string, string, string] }[] = []
  if (extra?.materiaPendiente1) {
    pendienteRows.push({
      materia: extra.materiaPendiente1,
      momentos: [extra.mp1m1 || '', extra.mp1m2 || '', extra.mp1m3 || '', extra.mp1m4 || ''],
    })
  }
  if (extra?.materiaPendiente2) {
    pendienteRows.push({
      materia: extra.materiaPendiente2,
      momentos: [extra.mp2m1 || '', extra.mp2m2 || '', extra.mp2m3 || '', extra.mp2m4 || ''],
    })
  }

  const gradoLabel = GRADO_LABELS[grado] || `Año ${grado}`
  const lugarNacimiento = [student.municipio, student.estado].filter(Boolean).join(', ') || ''

  function calcPromLapso(lapso: number): string {
    let sum = 0, count = 0
    const key = lapso === 1 ? 'lapso1' : lapso === 2 ? 'lapso2' : 'lapso3'
    for (const m of numericMaterias) {
      const n = notasMap[m.nombre]
      if (!n) continue
      const val = (n[key] || '').trim()
      if (val === '' || val === 'IN' || val === 'PE') continue
      const num = parseFloat(val)
      if (!isNaN(num) && num > 0) { sum += num; count++ }
    }
    if (count === 0) return ''
    return (sum / count).toFixed(2).replace('.', ',')
  }

  function getIN(lapso: string): string {
    const v = lapso.trim().toUpperCase()
    if (v === 'IN') return 'IN'
    if (v === 'PE') return 'PE'
    return ''
  }

  // Siempre 3 filas en blanco después de GRUPO, como en el formato Excel

  return (
    <div id="boletin-print-area" style={{ fontFamily: 'Times New Roman, Georgia, serif', fontSize: '10px', lineHeight: '1.3', color: '#000', background: '#fff', padding: '20px 25px', maxWidth: '900px', margin: '0 auto' }}>

      {/* ═══════════════════════════════════════════════════════════════
          ROW 1: TÍTULO — "BOLETIN DE CALIFICACIONES"
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt', fontFamily: 'Arial, sans-serif', letterSpacing: '2px', marginBottom: '16px' }}>
        BOLETIN DE CALIFICACIONES
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ROWS 4-6: DATOS DEL ALUMNO (layout exacto del Excel)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '10px' }}>
        {/* Row 4: Alumno: */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '10pt', fontFamily: 'Arial, sans-serif', marginRight: '4px', minWidth: '55px' }}>Alumno:</span>
          <span style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>{student.apellidos}, {student.nombres}</span>
        </div>
        {/* Row 5: C.I.: | Fecha y Lugar de Nac: */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '10pt', fontFamily: 'Arial, sans-serif', marginRight: '4px', minWidth: '30px' }}>C.I.:</span>
          <span style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif', marginRight: '20px' }}>{formatCedulaFinal(student.cedula)}</span>
          <span style={{ fontWeight: 'bold', fontSize: '10pt', fontFamily: 'Arial, sans-serif', marginRight: '4px' }}>Fecha y Lugar de Nac:</span>
          <span style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>{formatDate(student.fechaNacimiento)}{lugarNacimiento ? ` — ${lugarNacimiento}` : ''}</span>
        </div>
        {/* Row 6: Grado: | Sección: | N° de Lista: | Año Escolar: */}
        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 16px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>Grado:</span>
          <span style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>{gradoLabel}</span>
          <span style={{ fontWeight: 'bold', fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>Sección:</span>
          <span style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>{seccion}</span>
          <span style={{ fontWeight: 'bold', fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>N° de Lista:</span>
          <span style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>{listaNum}</span>
          <span style={{ fontWeight: 'bold', fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>Año Escolar:</span>
          <span style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>{anioEscolar}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ROW 8+: ÁREAS DE FORMACIÓN (tabla con header en fila 8)
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
        {/* Header Row (Row 8) — marco sin divisiones internas */}
        <thead>
          <tr>
            <th style={{ ...hdr, textAlign: 'left', width: '28%', borderRight: 'none' }}>Áreas de Formación</th>
            <th style={{ ...hdr, width: '12%', borderLeft: 'none', borderRight: 'none' }}>Primer Lapso</th>
            <th style={{ ...hdr, width: '4%', borderLeft: 'none', borderRight: 'none' }}>IN</th>
            <th style={{ ...hdr, width: '12%', borderLeft: 'none', borderRight: 'none' }}>Segundo Lapso</th>
            <th style={{ ...hdr, width: '4%', borderLeft: 'none', borderRight: 'none' }}>IN</th>
            <th style={{ ...hdr, width: '12%', borderLeft: 'none', borderRight: 'none' }}>Tercer Lapso</th>
            <th style={{ ...hdr, width: '4%', borderLeft: 'none', borderRight: 'none' }}>IN</th>
            <th style={{ ...hdr, width: '12%', borderLeft: 'none', borderRight: 'none' }}>Final</th>
            <th style={{ ...hdr, width: '4%', borderLeft: 'none' }}>Rev.</th>
          </tr>
        </thead>
        <tbody>
          {/* Subject rows - ALL subjects including qualitative */}
          {materias.map((m) => {
            const n = notasMap[m.nombre]
            const l1 = n?.lapso1 || ''
            const l2 = n?.lapso2 || ''
            const l3 = n?.lapso3 || ''
            const isCualitativa = m.tipo === 'cualitativa'
            // Para cualitativas: la nota es la literal (A, B, C, EX, etc.) — same in all lapsos
            const cualitativaDef = isCualitativa ? (l1 || '') : ''
            const def = isCualitativa ? cualitativaDef : calcDef(l1 || null, l2 || null, l3 || null)
            const defNum = parseFloat(def)
            return (
              <tr key={m.nombre}>
                <td style={{ ...cellNB, paddingLeft: '6px', fontWeight: isCualitativa ? '500' : 'normal' }}>{m.nombre}</td>
                <td style={{ ...cellNB, textAlign: 'center', fontWeight: '500' }}>{isCualitativa ? l1 : fmtNota(l1) || ''}</td>
                <td style={{ ...cellNB, textAlign: 'center', color: getIN(l1) === 'IN' ? '#c00' : '#999', fontSize: '8px' }}>{isCualitativa ? '' : getIN(l1)}</td>
                <td style={{ ...cellNB, textAlign: 'center', fontWeight: '500' }}>{isCualitativa ? l2 : fmtNota(l2) || ''}</td>
                <td style={{ ...cellNB, textAlign: 'center', color: getIN(l2) === 'IN' ? '#c00' : '#999', fontSize: '8px' }}>{isCualitativa ? '' : getIN(l2)}</td>
                <td style={{ ...cellNB, textAlign: 'center', fontWeight: '500' }}>{isCualitativa ? l3 : fmtNota(l3) || ''}</td>
                <td style={{ ...cellNB, textAlign: 'center', color: getIN(l3) === 'IN' ? '#c00' : '#999', fontSize: '8px' }}>{isCualitativa ? '' : getIN(l3)}</td>
                <td style={{ ...cellNB, textAlign: 'center', fontWeight: 'bold', color: !isNaN(defNum) && defNum > 0 && defNum < 10 ? '#c00' : '#000' }}>{isCualitativa ? cualitativaDef : fmtNota(def) || ''}</td>
                <td style={{ ...cellNB, textAlign: 'center', fontWeight: '500', color: '#6d28d9' }}>{isCualitativa ? '' : fmtNota(REVISION_SCORE_MAP[m.nombre] || '')}</td>
              </tr>
            )
          })}

          {/* GRUPO row — una celda por columna, igual que las materias */}
          <tr>
            <td style={{ ...cellNB, paddingLeft: '6px', fontWeight: '500' }}>GRUPO</td>
            <td style={{ ...cellNB, textAlign: 'center', fontWeight: '500' }}>{fmtNota(extra?.grupo1 || '')}</td>
            <td style={cellNB}></td>
            <td style={{ ...cellNB, textAlign: 'center', fontWeight: '500' }}>{fmtNota(extra?.grupo2 || '')}</td>
            <td style={cellNB}></td>
            <td style={{ ...cellNB, textAlign: 'center', fontWeight: '500' }}>{fmtNota(extra?.grupo3 || '')}</td>
            <td style={cellNB}></td>
            <td style={{ ...cellNB, textAlign: 'center', fontWeight: '500' }}>{fmtNota(extra?.grupo4 || '')}</td>
            <td style={cellNB}></td>
          </tr>

          {/* 3 filas en blanco después de GRUPO — formato Excel */}
          {Array.from({ length: 3 }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td style={{ ...cellNB, height: '18px' }}></td>
              <td style={cellNB}></td>
              <td style={cellNB}></td>
              <td style={cellNB}></td>
              <td style={cellNB}></td>
              <td style={cellNB}></td>
              <td style={cellNB}></td>
              <td style={cellNB}></td>
              <td style={cellNB}></td>
            </tr>
          ))}

          {/* Row 22: P R O M E D I O */}
          <tr>
            <td style={{ ...cellDot, fontWeight: 'bold', letterSpacing: '1px', paddingLeft: '6px' }}>P R O M E D I O</td>
            <td style={{ ...cellDot, textAlign: 'center', fontWeight: 'bold' }}>{calcPromLapso(1)}</td>
            <td style={cellDot}></td>
            <td style={{ ...cellDot, textAlign: 'center', fontWeight: 'bold' }}>{calcPromLapso(2)}</td>
            <td style={cellDot}></td>
            <td style={{ ...cellDot, textAlign: 'center', fontWeight: 'bold' }}>{calcPromLapso(3)}</td>
            <td style={cellDot}></td>
            <td style={{ ...cellDot, textAlign: 'center', fontWeight: 'bold' }}>{promedio > 0 ? promedio.toFixed(2).replace('.', ',') : ''}</td>
            <td style={cellDot}></td>
          </tr>

          {/* Row 23: Posición Según Prom. */}
          <tr>
            <td style={{ ...cellNB, fontWeight: 'bold', paddingLeft: '6px' }}>Posición Según Prom.</td>
            <td colSpan={7} style={{ ...cellNB, textAlign: 'center', fontWeight: 'bold' }}>
              {position > 0 ? `${position}° de ${allStudentsPromedios.length}` : '—'}
            </td>
            <td style={cellNB}></td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════════════════════════════════════════════════════════
          ROW 24: MATERIA PENDIENTE (siempre visible, con filas vacías)
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none', marginBottom: '0' }}>
        <thead>
          <tr>
            <th style={{ ...hdr, textAlign: 'left', width: '28%' }}>Materia Pendiente</th>
            <th style={{ ...hdr, width: '18%' }}>Primer Momento</th>
            <th style={{ ...hdr, width: '18%' }}>Segundo Momento</th>
            <th style={{ ...hdr, width: '18%' }}>Tercer Momento</th>
            <th style={{ ...hdr, width: '18%' }}>Cuarto Momento</th>
          </tr>
        </thead>
        <tbody>
          {pendienteRows.length > 0 ? pendienteRows.map((r, i) => (
            <tr key={i}>
              <td style={cell}>{r.materia}</td>
              {r.momentos.map((m, j) => (
                <td key={j} style={{ ...cell, textAlign: 'center' }}>{fmtNota(m)}</td>
              ))}
            </tr>
          )) : (
            <tr>
              <td style={cell}>{'—'}</td>
              <td style={cell}></td>
              <td style={cell}></td>
              <td style={cell}></td>
              <td style={cell}></td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Fila en blanco sin bordes sobre Orientación y Convivencia */}
      <div style={{ width: '100%', height: '18px' }}></div>

      {/* ═══════════════════════════════════════════════════════════════
          ORIENTACIÓN Y CONVIVENCIA (2 columnas: rango | descripción)
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none', marginBottom: '0' }}>
        <tbody>
          {/* Fila con rango A y su descripción */}
          <tr>
            <td rowSpan={4} style={{ ...cell, width: '20%', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '9px', padding: '4px' }}>
              ORIENTACIÓN Y CONVIVENCIA
            </td>
            <td style={{ ...cell, width: '22%', fontWeight: 'bold', backgroundColor: '#fff', padding: '3px 5px' }}>A: 20 a 17 pts</td>
            <td style={{ ...cell, fontSize: '8px', backgroundColor: '#fff', padding: '3px 5px', lineHeight: '1.4' }}>
              {CUALITATIVA_DESCRIPTIONS['A']}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 'bold', backgroundColor: '#fff', padding: '3px 5px' }}>B: 16 a 14 pts</td>
            <td style={{ ...cell, fontSize: '8px', backgroundColor: '#fff', padding: '3px 5px', lineHeight: '1.4' }}>
              {CUALITATIVA_DESCRIPTIONS['B']}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 'bold', backgroundColor: '#fff', padding: '3px 5px' }}>C: 13 a 10 pts</td>
            <td style={{ ...cell, fontSize: '8px', backgroundColor: '#fff', padding: '3px 5px', lineHeight: '1.4' }}>
              {CUALITATIVA_DESCRIPTIONS['C']}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 'bold', backgroundColor: '#fff', padding: '3px 5px' }}>D: 09 a 01 pts</td>
            <td style={{ ...cell, fontSize: '8px', backgroundColor: '#fff', padding: '3px 5px', lineHeight: '1.4' }}>
              {CUALITATIVA_DESCRIPTIONS['D']}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Fila en blanco sin bordes entre Orientación y Participación */}
      <div style={{ width: '100%', height: '18px' }}></div>

      {/* ═══════════════════════════════════════════════════════════════
          CREACIÓN, RECREACIÓN Y PRODUCCIÓN (mismo formato 2 columnas)
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none', marginBottom: '0' }}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...cell, width: '20%', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '9px', padding: '4px' }}>
              CREACIÓN, RECREACIÓN Y PRODUCCIÓN
            </td>
            <td style={{ ...cell, width: '22%', fontWeight: 'bold', backgroundColor: '#fff', padding: '3px 5px' }}>A: 20 a 17 pts</td>
            <td style={{ ...cell, fontSize: '8px', backgroundColor: '#fff', padding: '3px 5px', lineHeight: '1.4' }}>
              {CUALITATIVA_DESCRIPTIONS['A']}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 'bold', backgroundColor: '#fff', padding: '3px 5px' }}>B: 16 a 14 pts</td>
            <td style={{ ...cell, fontSize: '8px', backgroundColor: '#fff', padding: '3px 5px', lineHeight: '1.4' }}>
              {CUALITATIVA_DESCRIPTIONS['B']}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 'bold', backgroundColor: '#fff', padding: '3px 5px' }}>C: 13 a 10 pts</td>
            <td style={{ ...cell, fontSize: '8px', backgroundColor: '#fff', padding: '3px 5px', lineHeight: '1.4' }}>
              {CUALITATIVA_DESCRIPTIONS['C']}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 'bold', backgroundColor: '#fff', padding: '3px 5px' }}>D: 09 a 01 pts</td>
            <td style={{ ...cell, fontSize: '8px', backgroundColor: '#fff', padding: '3px 5px', lineHeight: '1.4' }}>
              {CUALITATIVA_DESCRIPTIONS['D']}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════════════════════════════════════════════════════════
          OBSERVACIONES (fila 45 + filas 46-48 mergeadas)
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none', marginBottom: '0' }}>
        <tbody>
          <tr>
            <td style={{ ...cell, fontWeight: 'bold', fontSize: '9px', width: '15%', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>Observaciones</td>
            <td colSpan={8} style={{ ...cell, minHeight: '45px', fontSize: '9px', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
              {observacion || '\u00A0'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3 filas en blanco con marco, sin líneas internas */}
      <div style={{ width: '100%', border: '1px solid #000', marginTop: '0', marginBottom: '0' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: '20px' }}></div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER: Firmas y fecha
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ textAlign: 'center', fontSize: '9px', marginBottom: '30px' }}>
          Miranda, {getFechaActual()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>DIRECTOR(A)</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>COORDINADOR(A)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Search Wrapper Component ────────────────────────────────────────────
function BoletinCalificacionesSearch() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const [anioEscolar, setAnioEscolar] = useState('')
  const [grado, setGrado] = useState('')
  const [seccion, setSeccion] = useState('')
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<StudentNota[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentNota | null>(null)

  const paramStudentId = searchParams.get('studentId')
  const paramAnio = searchParams.get('anioEscolar')
  const paramGrado = searchParams.get('grado')
  const paramSeccion = searchParams.get('seccion')

  useEffect(() => {
    if (paramAnio && paramGrado) {
      setAnioEscolar(paramAnio)
      setGrado(paramGrado)
      setSeccion(paramSeccion || '')
      loadData(paramAnio, paramGrado, paramSeccion || '', paramStudentId || undefined)
    }
  }, [paramAnio, paramGrado, paramSeccion, paramStudentId])

  const loadData = useCallback(async (anio: string, grd: string, sec: string, studentId?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ anioEscolar: anio, grado: grd, seccion: sec })
      const res = await fetch(`/api/boletas?${params}`)
      if (!res.ok) throw new Error('Error en la búsqueda')
      const data = await res.json()
      const loaded: StudentNota[] = data.students || []
      setStudents(loaded)
      if (studentId) {
        const found = loaded.find(s => s.id === studentId)
        if (found) setSelectedStudent(found)
        else toast({ title: 'Alumno no encontrado', description: 'No se encontró el alumno solicitado.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error al buscar datos', variant: 'destructive' })
    } finally { setLoading(false) }
  }, [toast])

  const handleSearch = useCallback(() => {
    if (!anioEscolar || !grado) {
      toast({ title: 'Campos requeridos', description: 'Seleccione Año Escolar y Grado', variant: 'destructive' })
      return
    }
    loadData(anioEscolar, grado, seccion)
  }, [anioEscolar, grado, seccion, loadData, toast])

  const { position, allPromedios, listaNum } = useMemo(() => {
    if (!selectedStudent || students.length === 0) return { position: 0, allPromedios: [], listaNum: 0 }
    const materias = getMateriasForGrado(grado)
    const promedios: { studentId: string; promedio: number }[] = []
    for (const s of students) {
      const nm: Record<string, { lapso1: string; lapso2: string; lapso3: string }> = {}
      for (const nota of s.boletaNotas) {
        nm[nota.materia] = { lapso1: nota.lapso1 || '', lapso2: nota.lapso2 || '', lapso3: nota.lapso3 || '' }
      }
      promedios.push({ studentId: s.id, promedio: calcStudentPromedio(materias, nm) })
    }
    promedios.sort((a, b) => b.promedio - a.promedio)
    const allP = promedios.map(p => p.promedio)
    const pos = promedios.findIndex(p => p.studentId === selectedStudent.id) + 1
    return { position: pos, allPromedios: allP, listaNum: pos }
  }, [selectedStudent, students, grado])

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Boletín de Calificaciones
            </h1>
            <p className="text-muted-foreground text-sm">
              Boletín individual por alumno
            </p>
          </div>
        </div>

        {!selectedStudent && (
          <Card className="no-print">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Año Escolar</Label>
                  <select value={anioEscolar} onChange={(e) => setAnioEscolar(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-36">
                    <option value="">Seleccionar...</option>
                    {ANIO_ESCOLAR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Grado</Label>
                  <select value={grado} onChange={(e) => setGrado(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-32">
                    <option value="">Seleccionar...</option>
                    {Object.entries(GRADO_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Sección</Label>
                  <select value={seccion} onChange={(e) => setSeccion(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-16 text-center">
                    <option value="">...</option>
                    {SECCION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Button onClick={handleSearch} disabled={loading} className="h-9">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando...</> : <><Search className="h-4 w-4 mr-2" /> Buscar</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedStudent && students.length > 0 && (
          <Card className="no-print">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">Alumnos encontrados ({students.length})</h3>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {students.map((student, idx) => (
                  <button key={student.id} onClick={() => setSelectedStudent(student)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition text-left">
                    <span className="text-xs text-muted-foreground font-mono w-6 text-center">{idx + 1}</span>
                    <span className="text-xs font-mono text-muted-foreground w-28">{formatCedulaFinal(student.cedula)}</span>
                    <span className="text-sm font-medium">{student.apellidos}, {student.nombres}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="no-print"><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground">Cargando...</p></CardContent></Card>
        )}

        {selectedStudent && (
          <>
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" onClick={() => { setSelectedStudent(null); router.push('/boletin-calificaciones') }}>
                <ArrowLeft className="h-4 w-4 mr-2" />Volver
              </Button>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />Imprimir
              </Button>
            </div>
            <div className="max-w-[950px] mx-auto shadow-lg border border-gray-200">
              <BoletinContent
                student={selectedStudent}
                anioEscolar={anioEscolar}
                grado={grado}
                seccion={seccion || selectedStudent.seccion}
                position={position}
                listaNum={listaNum}
                allStudentsPromedios={allPromedios}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

export default function BoletinCalificacionesPage() {
  return (
    <Suspense fallback={<AppShell><div className="py-12 text-center text-muted-foreground"><Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />Cargando...</div></AppShell>}>
      <BoletinCalificacionesSearch />
    </Suspense>
  )
}
