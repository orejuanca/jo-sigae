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
}

interface BoletaExtraRecord {
  id: string
  studentId: string
  grupo1: string | null
  grupo2: string | null
  grupo3: string | null
  grupo4: string | null
  observacion: string | null
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
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch { return fechaStr }
}

function formatNumber(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function getIN(lapso: string): string {
  const v = lapso.trim().toUpperCase()
  if (v === 'IN') return 'IN'
  if (v === 'PE') return 'PE'
  return ''
}

// ── Shared styles ──────────────────────────────────────────────────────
const S = {
  cell: {
    fontSize: '9px',
    padding: '3px 5px',
    border: '1px solid #000',
    verticalAlign: 'middle' as const,
  },
  hdr: {
    fontSize: '8px',
    padding: '3px 4px',
    border: '1px solid #000',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    backgroundColor: '#d9d9d9',
    verticalAlign: 'middle' as const,
  },
}

// ── Boletín Content Component ────────────────────────────────────────────
function BoletinContent({
  student,
  anioEscolar,
  grado,
  seccion,
  lapsoPositions,
  finalPosition,
  totalStudents,
  listaNum,
}: {
  student: StudentNota
  anioEscolar: string
  grado: string
  seccion: string
  lapsoPositions: number[]
  finalPosition: number
  totalStudents: number
  listaNum: number
}) {
  const materias = getMateriasForGrado(grado)
  const numericMaterias = materias.filter(m => m.tipo !== 'cualitativa')
  const cualitativas = materias.filter(m => m.tipo === 'cualitativa')

  // Build notas map
  const notasMap: Record<string, { lapso1: string; lapso2: string; lapso3: string }> = {}
  for (const nota of student.boletaNotas) {
    notasMap[nota.materia] = {
      lapso1: nota.lapso1 || '',
      lapso2: nota.lapso2 || '',
      lapso3: nota.lapso3 || '',
    }
  }

  const extra = student.boletaExtras?.[0]
  const observacion = extra?.observacion || ''
  const promedioFinal = calcStudentPromedio(materias, notasMap)

  // Cualitative grades (for highlighting reference tables)
  const oriNota = notasMap['Orientación y Convivencia']
  const partNota = notasMap['Participación Grupal']
  const oriGrade = oriNota?.lapso1?.trim().toUpperCase() || ''
  const partGrade = partNota?.lapso1?.trim().toUpperCase() || ''

  // GRUPO row values from BoletaExtra
  const grupo1 = extra?.grupo1 || ''
  const grupo2 = extra?.grupo2 || ''
  const grupo3 = extra?.grupo3 || ''
  const grupo4 = extra?.grupo4 || ''

  // Reprobadas (Final < 10)
  const reprobadas: { materia: string }[] = []
  for (const m of numericMaterias) {
    const n = notasMap[m.nombre]
    if (!n) continue
    const def = calcDef(n.lapso1 || null, n.lapso2 || null, n.lapso3 || null)
    const num = parseFloat(def)
    if (!isNaN(num) && num > 0 && num < 10) reprobadas.push({ materia: m.nombre })
  }
  const pendienteRows = reprobadas.length > 0 ? reprobadas : [{ materia: '' }]

  const gradoLabel = GRADO_LABELS[grado] || `Año ${grado}`
  const lugarNacimiento = [student.municipio, student.estado].filter(Boolean).join(', ') || ''

  // Per-lapso promedio for this student
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
    return formatNumber(sum / count)
  }

  return (
    <div id="boletin-print-area" style={{
      fontFamily: 'Times New Roman, Georgia, serif',
      fontSize: '10px',
      lineHeight: '1.3',
      color: '#000',
      background: '#fff',
      padding: '15px 20px',
      maxWidth: '850px',
      margin: '0 auto',
    }}>

      {/* ═══════════════════════════════════════════════════════════════
          1. ENCABEZADO INSTITUCIONAL
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '4px' }}>
        {/* Logo/escudo placeholder */}
        <div style={{
          width: '65px',
          minWidth: '65px',
          height: '65px',
          border: '2px solid #000',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          flexShrink: 0,
        }}>
          <div style={{ textAlign: 'center', fontSize: '7px', fontWeight: 'bold', lineHeight: '1.2' }}>
            <div>U.E.N.</div>
            <div style={{ fontSize: '6px' }}>CREACIÓN</div>
            <div style={{ fontSize: '6px' }}>CÚA</div>
          </div>
        </div>
        {/* Textos institucionales */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '1px' }}>
            República Bolivariana de Venezuela
          </div>
          <div style={{ fontSize: '8px', marginBottom: '1px' }}>
            Ministerio del Poder Popular Para La Educación
          </div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '1px' }}>
            U.E.N. CREACIÓN CÚA
          </div>
          <div style={{ fontSize: '8px' }}>
            {schoolConfig.od}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. TÍTULO
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '13px',
        letterSpacing: '2px',
        margin: '8px 0 10px 0',
      }}>
        BOLETIN DE CALIFICACIONES
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. DATOS DEL ALUMNO
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '9px', marginRight: '4px', minWidth: '50px' }}>Alumno:</span>
          <span style={{ fontSize: '10px' }}>{student.apellidos}, {student.nombres}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '9px', marginRight: '4px', minWidth: '25px' }}>C.I.:</span>
          <span style={{ fontSize: '10px', marginRight: '20px' }}>{formatCedulaFinal(student.cedula)}</span>
          <span style={{ fontWeight: 'bold', fontSize: '9px', marginRight: '4px' }}>Fecha y Lugar de Nac:</span>
          <span style={{ fontSize: '9px' }}>
            {formatDate(student.fechaNacimiento)}
            {lugarNacimiento ? ` — ${lugarNacimiento}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '2px 14px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Grado:</span>
          <span style={{ fontSize: '10px' }}>{gradoLabel}</span>
          <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Sección:</span>
          <span style={{ fontSize: '10px' }}>{seccion}</span>
          <span style={{ fontWeight: 'bold', fontSize: '9px' }}>N° de Lista:</span>
          <span style={{ fontSize: '10px' }}>{listaNum}</span>
          <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Año Escolar:</span>
          <span style={{ fontSize: '10px' }}>{anioEscolar}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          4. TABLA PRINCIPAL — ÁREAS DE FORMACIÓN
          Incluye: materias numéricas + Orientación y Convivencia +
          Participación Grupal + GRUPO + PROMEDIO + POSICIÓN
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...S.hdr, textAlign: 'left', width: '28%', paddingLeft: '5px' }}>Áreas de Formación</th>
            <th style={{ ...S.hdr, width: '10%' }}>Primer Lapso</th>
            <th style={{ ...S.hdr, width: '4%' }}>IN</th>
            <th style={{ ...S.hdr, width: '10%' }}>Segundo Lapso</th>
            <th style={{ ...S.hdr, width: '4%' }}>IN</th>
            <th style={{ ...S.hdr, width: '10%' }}>Tercer Lapso</th>
            <th style={{ ...S.hdr, width: '4%' }}>IN</th>
            <th style={{ ...S.hdr, width: '10%' }}>Final</th>
            <th style={{ ...S.hdr, width: '5%' }}>Rev.</th>
          </tr>
        </thead>
        <tbody>
          {/* ── Materias numéricas ── */}
          {numericMaterias.map((m) => {
            const n = notasMap[m.nombre]
            const l1 = n?.lapso1 || ''
            const l2 = n?.lapso2 || ''
            const l3 = n?.lapso3 || ''
            const def = calcDef(l1 || null, l2 || null, l3 || null)
            const defNum = parseFloat(def)
            return (
              <tr key={m.nombre}>
                <td style={{ ...S.cell, paddingLeft: '5px' }}>{m.nombre}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l1 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center', color: getIN(l1) ? '#c00' : 'transparent', fontSize: '7px' }}>{getIN(l1)}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l2 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center', color: getIN(l2) ? '#c00' : 'transparent', fontSize: '7px' }}>{getIN(l2)}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l3 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center', color: getIN(l3) ? '#c00' : 'transparent', fontSize: '7px' }}>{getIN(l3)}</td>
                <td style={{
                  ...S.cell,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: (!isNaN(defNum) && defNum > 0 && defNum < 10) ? '#c00' : '#000',
                }}>
                  {def || ''}
                </td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
              </tr>
            )
          })}

          {/* ── Orientación y Convivencia (fila cualitativa DENTRO de la tabla) ── */}
          {(() => {
            const n = notasMap['Orientación y Convivencia']
            const l1 = n?.lapso1 || ''
            const l2 = n?.lapso2 || ''
            const l3 = n?.lapso3 || ''
            return (
              <tr>
                <td style={{ ...S.cell, paddingLeft: '5px' }}>Orientación y Convivencia</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l1 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l2 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l3 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
                <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold' }}>{l1 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
              </tr>
            )
          })()}

          {/* ── Participación Grupal (fila cualitativa DENTRO de la tabla) ── */}
          {(() => {
            const n = notasMap['Participación Grupal']
            const l1 = n?.lapso1 || ''
            const l2 = n?.lapso2 || ''
            const l3 = n?.lapso3 || ''
            return (
              <tr>
                <td style={{ ...S.cell, paddingLeft: '5px' }}>Participación Grupal</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l1 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l2 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{l3 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
                <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold' }}>{l1 || ''}</td>
                <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
              </tr>
            )
          })()}

          {/* ── GRUPO (valores de BoletaExtra: grupo1-4) ── */}
          <tr>
            <td style={{ ...S.cell, paddingLeft: '5px', fontWeight: 'bold' }}>GRUPO</td>
            <td style={{ ...S.cell, textAlign: 'center', fontSize: '7px' }}>{grupo1}</td>
            <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontSize: '7px' }}>{grupo2}</td>
            <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontSize: '7px' }}>{grupo3}</td>
            <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontSize: '7px' }}>{grupo4}</td>
            <td style={{ ...S.cell, textAlign: 'center' }}>{''}</td>
          </tr>

          {/* ── Línea separadora punteada ── */}
          <tr>
            <td colSpan={9} style={{ border: 'none', borderBottom: '1px dotted #000', padding: '0' }}></td>
          </tr>

          {/* ── PROMEDIO (por lapso y final) ── */}
          <tr>
            <td style={{ ...S.cell, fontWeight: 'bold', paddingLeft: '5px', backgroundColor: '#f0f0f0' }}>
              PROMEDIO
            </td>
            <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              {calcPromLapso(1)}
            </td>
            <td style={{ ...S.cell, backgroundColor: '#f0f0f0' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              {calcPromLapso(2)}
            </td>
            <td style={{ ...S.cell, backgroundColor: '#f0f0f0' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              {calcPromLapso(3)}
            </td>
            <td style={{ ...S.cell, backgroundColor: '#f0f0f0' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              {promedioFinal > 0 ? formatNumber(promedioFinal) : ''}
            </td>
            <td style={{ ...S.cell, backgroundColor: '#f0f0f0' }}>{''}</td>
          </tr>

          {/* ── Posición Según Prom. (por lapso y final) ── */}
          <tr>
            <td style={{ ...S.cell, fontWeight: 'bold', paddingLeft: '5px', backgroundColor: '#f0f0f0' }}>
              Posición Según Prom.
            </td>
            <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              {lapsoPositions[0] > 0 ? lapsoPositions[0] : ''}
            </td>
            <td style={{ ...S.cell, backgroundColor: '#f0f0f0' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              {lapsoPositions[1] > 0 ? lapsoPositions[1] : ''}
            </td>
            <td style={{ ...S.cell, backgroundColor: '#f0f0f0' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              {lapsoPositions[2] > 0 ? lapsoPositions[2] : ''}
            </td>
            <td style={{ ...S.cell, backgroundColor: '#f0f0f0' }}>{''}</td>
            <td style={{ ...S.cell, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              {finalPosition > 0 ? finalPosition : ''}
            </td>
            <td style={{ ...S.cell, backgroundColor: '#f0f0f0' }}>{''}</td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════════════════════════════════════════════════════════
          5. MATERIA PENDIENTE
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...S.hdr, textAlign: 'left', width: '28%', paddingLeft: '5px' }}>Materia Pendiente</th>
            <th style={{ ...S.hdr, width: '18%' }}>Primer Momento</th>
            <th style={{ ...S.hdr, width: '18%' }}>Segundo Momento</th>
            <th style={{ ...S.hdr, width: '18%' }}>Tercer Momento</th>
            <th style={{ ...S.hdr, width: '18%' }}>Cuarto Momento</th>
          </tr>
        </thead>
        <tbody>
          {pendienteRows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...S.cell, paddingLeft: '5px' }}>{r.materia}</td>
              <td style={{ ...S.cell }}></td>
              <td style={{ ...S.cell }}></td>
              <td style={{ ...S.cell }}></td>
              <td style={{ ...S.cell }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══════════════════════════════════════════════════════════════
          6. ORIENTACIÓN Y CONVIVENCIA (tabla de referencia A/B/C/D)
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{
              ...S.cell,
              width: '20%',
              textAlign: 'center',
              verticalAlign: 'middle',
              fontWeight: 'bold',
              fontSize: '8px',
              padding: '6px 4px',
              writingMode: 'vertical-lr',
              transform: 'rotate(180deg)',
              letterSpacing: '2px',
              lineHeight: '1.4',
            }}>
              ORIENTACIÓN Y CONVIVENCIA
            </td>
            <td style={{
              ...S.cell,
              width: '20%',
              fontWeight: 'bold',
              backgroundColor: oriGrade === 'A' ? '#d4edda' : '#fff',
              padding: '3px 5px',
            }}>
              A: 20 a 17 pts
            </td>
            <td style={{
              ...S.cell,
              fontSize: '8px',
              backgroundColor: oriGrade === 'A' ? '#d4edda' : '#fff',
              padding: '3px 5px',
              lineHeight: '1.4',
            }}>
              {CUALITATIVA_DESCRIPTIONS['A']}
            </td>
          </tr>
          <tr>
            <td style={{
              ...S.cell,
              fontWeight: 'bold',
              backgroundColor: oriGrade === 'B' ? '#d4edda' : '#fff',
              padding: '3px 5px',
            }}>
              B: 16 a 14 pts
            </td>
            <td style={{
              ...S.cell,
              fontSize: '8px',
              backgroundColor: oriGrade === 'B' ? '#d4edda' : '#fff',
              padding: '3px 5px',
              lineHeight: '1.4',
            }}>
              {CUALITATIVA_DESCRIPTIONS['B']}
            </td>
          </tr>
          <tr>
            <td style={{
              ...S.cell,
              fontWeight: 'bold',
              backgroundColor: oriGrade === 'C' ? '#d4edda' : '#fff',
              padding: '3px 5px',
            }}>
              C: 13 a 10 pts
            </td>
            <td style={{
              ...S.cell,
              fontSize: '8px',
              backgroundColor: oriGrade === 'C' ? '#d4edda' : '#fff',
              padding: '3px 5px',
              lineHeight: '1.4',
            }}>
              {CUALITATIVA_DESCRIPTIONS['C']}
            </td>
          </tr>
          <tr>
            <td style={{
              ...S.cell,
              fontWeight: 'bold',
              backgroundColor: oriGrade === 'D' ? '#d4edda' : '#fff',
              padding: '3px 5px',
            }}>
              D: 09 a 01 pts
            </td>
            <td style={{
              ...S.cell,
              fontSize: '8px',
              backgroundColor: oriGrade === 'D' ? '#d4edda' : '#fff',
              padding: '3px 5px',
              lineHeight: '1.4',
            }}>
              {CUALITATIVA_DESCRIPTIONS['D']}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════════════════════════════════════════════════════════
          7. CREACIÓN, RECREACIÓN Y PRODUCCIÓN (tabla de referencia A/B/C/D)
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{
              ...S.cell,
              width: '20%',
              textAlign: 'center',
              verticalAlign: 'middle',
              fontWeight: 'bold',
              fontSize: '8px',
              padding: '6px 4px',
              writingMode: 'vertical-lr',
              transform: 'rotate(180deg)',
              letterSpacing: '2px',
              lineHeight: '1.4',
            }}>
              CREACIÓN, RECREACIÓN Y PRODUCCIÓN
            </td>
            <td style={{
              ...S.cell,
              width: '20%',
              fontWeight: 'bold',
              backgroundColor: partGrade === 'A' ? '#d4edda' : '#fff',
              padding: '3px 5px',
            }}>
              A: 20 a 17 pts
            </td>
            <td style={{
              ...S.cell,
              fontSize: '8px',
              backgroundColor: partGrade === 'A' ? '#d4edda' : '#fff',
              padding: '3px 5px',
              lineHeight: '1.4',
            }}>
              {CUALITATIVA_DESCRIPTIONS['A']}
            </td>
          </tr>
          <tr>
            <td style={{
              ...S.cell,
              fontWeight: 'bold',
              backgroundColor: partGrade === 'B' ? '#d4edda' : '#fff',
              padding: '3px 5px',
            }}>
              B: 16 a 14 pts
            </td>
            <td style={{
              ...S.cell,
              fontSize: '8px',
              backgroundColor: partGrade === 'B' ? '#d4edda' : '#fff',
              padding: '3px 5px',
              lineHeight: '1.4',
            }}>
              {CUALITATIVA_DESCRIPTIONS['B']}
            </td>
          </tr>
          <tr>
            <td style={{
              ...S.cell,
              fontWeight: 'bold',
              backgroundColor: partGrade === 'C' ? '#d4edda' : '#fff',
              padding: '3px 5px',
            }}>
              C: 13 a 10 pts
            </td>
            <td style={{
              ...S.cell,
              fontSize: '8px',
              backgroundColor: partGrade === 'C' ? '#d4edda' : '#fff',
              padding: '3px 5px',
              lineHeight: '1.4',
            }}>
              {CUALITATIVA_DESCRIPTIONS['C']}
            </td>
          </tr>
          <tr>
            <td style={{
              ...S.cell,
              fontWeight: 'bold',
              backgroundColor: partGrade === 'D' ? '#d4edda' : '#fff',
              padding: '3px 5px',
            }}>
              D: 09 a 01 pts
            </td>
            <td style={{
              ...S.cell,
              fontSize: '8px',
              backgroundColor: partGrade === 'D' ? '#d4edda' : '#fff',
              padding: '3px 5px',
              lineHeight: '1.4',
            }}>
              {CUALITATIVA_DESCRIPTIONS['D']}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════════════════════════════════════════════════════════
          8. OBSERVACIONES
          ═══════════════════════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ ...S.cell, fontWeight: 'bold', fontSize: '9px', width: '15%', paddingLeft: '5px' }}>
              Observaciones
            </td>
            <td style={{ ...S.cell, minHeight: '40px', fontSize: '9px', padding: '5px' }}>
              {observacion || '\u00A0'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════════════════════════════════════════════════════════
          9. FIRMAS
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: '25px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 30px' }}>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>DIRECTOR(A)</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>COORDINADOR(A)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          10. FECHA Y LUGAR DE EMISIÓN (debajo de las firmas)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '5px' }}>
        {schoolConfig.estado}, {getFechaActual()}
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

  // Calculate positions PER LAPSO + final position
  const { lapsoPositions, finalPosition, totalStudents, listaNum } = useMemo(() => {
    if (!selectedStudent || students.length === 0) {
      return { lapsoPositions: [0, 0, 0], finalPosition: 0, totalStudents: 0, listaNum: 0 }
    }

    const materias = getMateriasForGrado(grado)
    const numericMaterias = materias.filter(m => m.tipo !== 'cualitativa')

    // Build per-student per-lapso promedios
    interface StudentProms {
      studentId: string
      p1: number
      p2: number
      p3: number
      pFinal: number
    }

    const proms: StudentProms[] = []
    for (const s of students) {
      const nm: Record<string, { lapso1: string; lapso2: string; lapso3: string }> = {}
      for (const nota of s.boletaNotas) {
        nm[nota.materia] = {
          lapso1: nota.lapso1 || '',
          lapso2: nota.lapso2 || '',
          lapso3: nota.lapso3 || '',
        }
      }

      function calcLapso(key: 'lapso1' | 'lapso2' | 'lapso3'): number {
        let sum = 0, count = 0
        for (const m of numericMaterias) {
          const n = nm[m.nombre]
          if (!n) continue
          const val = (n[key] || '').trim()
          if (val === '' || val === 'IN' || val === 'PE') continue
          const num = parseFloat(val)
          if (!isNaN(num) && num > 0) { sum += num; count++ }
        }
        return count > 0 ? sum / count : 0
      }

      proms.push({
        studentId: s.id,
        p1: calcLapso('lapso1'),
        p2: calcLapso('lapso2'),
        p3: calcLapso('lapso3'),
        pFinal: calcStudentPromedio(materias, nm),
      })
    }

    // Position for each metric
    function getPosition(key: 'p1' | 'p2' | 'p3' | 'pFinal'): number {
      const sorted = [...proms].sort((a, b) => b[key] - a[key])
      return sorted.findIndex(p => p.studentId === selectedStudent.id) + 1
    }

    const fp = getPosition('pFinal')
    return {
      lapsoPositions: [getPosition('p1'), getPosition('p2'), getPosition('p3')],
      finalPosition: fp,
      totalStudents: students.length,
      listaNum: fp,
    }
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
                  <Input value={anioEscolar} onChange={(e) => setAnioEscolar(e.target.value)} className="h-9 w-36" placeholder="2025-2026" />
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
                  <Input value={seccion} onChange={(e) => setSeccion(e.target.value.toUpperCase())} className="h-9 w-16 text-center" maxLength={2} />
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
            <div className="max-w-[900px] mx-auto shadow-lg border border-gray-200 rounded">
              <BoletinContent
                student={selectedStudent}
                anioEscolar={anioEscolar}
                grado={grado}
                seccion={seccion || selectedStudent.seccion}
                lapsoPositions={lapsoPositions}
                finalPosition={finalPosition}
                totalStudents={totalStudents}
                listaNum={listaNum}
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
