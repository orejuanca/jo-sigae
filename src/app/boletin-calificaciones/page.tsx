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
    if (!isNaN(num) && num > 0) {
      sum += num
      count++
    }
  }

  if (count === 0) return 0
  return sum / count
}

// Cualitative grade descriptions for Orientación y Convivencia / Participación Grupal
const CUALITATIVA_DESCRIPTIONS: Record<string, string> = {
  'A': 'EVIDENCIA UN EXCELENTE DESARROLLO DE SUS POTENCIALIDADES, TOMANDO EN CUENTA SU PARTICIPACIÓN INDIVIDUAL Y COLECTIVA DURANTE EL PROCESO',
  'B': 'EVIDENCIA UN BUEN DESARROLLO DE SUS POTENCIALIDADES, TOMANDO EN CUENTA SU PARTICIPACIÓN INDIVIDUAL Y COLECTIVA. DEBE CONTINUAR FORTALECIENDO',
  'C': 'EVIDENCIA UN SATISFACTORIO DESARROLLO DE SUS POTENCIALIDADES, TOMANDO EN CUENTA SU PARTICIPACIÓN REQUIERE ORIENTACIÓN PARA SU CONSOLIDACIÓN',
  'D': 'EVIDENCIA UN ACEPTABLE DESARROLLO DE SUS POTENCIALIDADES, TOMANDO EN CUENTA SU PARTICIPACIÓN REQUIERE REFORZAR Y REORIENTAR EL APRENDIZAJE',
}

function getFechaActual(): string {
  const hoy = new Date()
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  return `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`
}

function formatDate(fechaStr: string | null): string {
  if (!fechaStr) return ''
  // Handle date string like "2005-01-15T00:00:00.000Z" or "2005-01-15"
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return fechaStr
  }
}

// ── Boletín Content Component (separated for print) ─────────────────────
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

  // Build notas map for this student
  const notasMap: Record<string, { lapso1: string; lapso2: string; lapso3: string }> = {}
  for (const nota of student.boletaNotas) {
    notasMap[nota.materia] = {
      lapso1: nota.lapso1 || '',
      lapso2: nota.lapso2 || '',
      lapso3: nota.lapso3 || '',
    }
  }

  // Get observacion from extras
  const extra = student.boletaExtras?.[0]
  const observacion = extra?.observacion || ''

  // Calculate promedio
  const promedio = calcStudentPromedio(materias, notasMap)

  // Get cualitativa grades
  const orientacionNota = notasMap['Orientación y Convivencia']
  const participacionNota = notasMap['Participación Grupal']
  const orientacionGrade = orientacionNota?.lapso1?.trim().toUpperCase() || ''
  const participacionGrade = participacionNota?.lapso1?.trim().toUpperCase() || ''

  // Reprobadas (Final < 10)
  const reprobadas: { materia: string; final: number }[] = []
  for (const m of numericMaterias) {
    const n = notasMap[m.nombre]
    if (!n) continue
    const def = calcDef(n.lapso1 || null, n.lapso2 || null, n.lapso3 || null)
    const num = parseFloat(def)
    if (!isNaN(num) && num > 0 && num < 10) {
      reprobadas.push({ materia: m.nombre, final: num })
    }
  }

  const gradoLabel = GRADO_LABELS[grado] || `Año ${grado}`

  // Calculate promedios per lapso
  function calcPromLapso(lapso: number): string {
    let sum = 0
    let count = 0
    const key = lapso === 1 ? 'lapso1' : lapso === 2 ? 'lapso2' : 'lapso3'

    for (const m of numericMaterias) {
      const n = notasMap[m.nombre]
      if (!n) continue
      const val = n[key] || ''
      const trimmed = val.trim()
      if (trimmed === '' || trimmed === 'IN' || trimmed === 'PE') continue
      const num = parseFloat(trimmed)
      if (!isNaN(num) && num > 0) {
        sum += num
        count++
      }
    }

    if (count === 0) return ''
    return (sum / count).toFixed(2).replace('.', ',')
  }

  const prom1 = calcPromLapso(1)
  const prom2 = calcPromLapso(2)
  const prom3 = calcPromLapso(3)

  // Lugar de nacimiento
  const lugarNacimiento = [student.municipio, student.estado].filter(Boolean).join(', ') || ''

  return (
    <div id="boletin-print-area" className="boletin-page bg-white p-5 text-black" style={{ fontFamily: 'Times New Roman, Georgia, serif', fontSize: '10px', lineHeight: '1.35', color: '#000' }}>
      {/* ─── HEADER ─── */}
      <div className="text-center mb-3">
        <h1 className="text-sm font-bold uppercase tracking-wide" style={{ fontSize: '13px' }}>
          BOLETIN DE CALIFICACIONES
        </h1>
        <p className="font-bold uppercase" style={{ fontSize: '11px' }}>
          {schoolConfig.nombre}
        </p>
        <p className="text-[9px]">
          Código OD: {schoolConfig.od}
        </p>
      </div>

      {/* ─── STUDENT DATA ─── */}
      <div className="border border-black mb-3" style={{ borderColor: '#000' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse', borderColor: '#000' }}>
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 font-bold w-[17%] align-middle" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '9px' }}>Alumno(a):</td>
              <td className="border border-black px-2 py-1" style={{ borderColor: '#000', fontSize: '10px' }}>{student.apellidos}, {student.nombres}</td>
              <td className="border border-black px-2 py-1 font-bold w-[8%] align-middle" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '9px' }}>C.I.:</td>
              <td className="border border-black px-2 py-1 w-[16%]" style={{ borderColor: '#000', fontSize: '10px' }}>{formatCedulaFinal(student.cedula)}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 font-bold align-middle" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '9px' }}>Fecha y Lugar de Nac.:</td>
              <td className="border border-black px-2 py-1" style={{ borderColor: '#000', fontSize: '10px' }}>
                {formatDate(student.fechaNacimiento)}{lugarNacimiento ? ` — ${lugarNacimiento}` : ''}
              </td>
              <td className="border border-black px-2 py-1 font-bold align-middle" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '9px' }}>Grado:</td>
              <td className="border border-black px-2 py-1" style={{ borderColor: '#000', fontSize: '10px' }}>{gradoLabel}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 font-bold align-middle" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '9px' }}>Sección:</td>
              <td className="border border-black px-2 py-1" style={{ borderColor: '#000', fontSize: '10px' }}>{seccion}</td>
              <td className="border border-black px-2 py-1 font-bold align-middle" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '9px' }}>Año Escolar:</td>
              <td className="border border-black px-2 py-1" style={{ borderColor: '#000', fontSize: '10px' }}>{anioEscolar}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── ÁREAS DE FORMACIÓN TABLE ─── */}
      <div className="mb-2">
        <div className="font-bold text-center text-[9px] uppercase py-0.5 border border-black" style={{ borderColor: '#000', backgroundColor: '#f0f0f0' }}>
          ÁREAS DE FORMACIÓN
        </div>
        <table className="w-full" style={{ borderCollapse: 'collapse', borderColor: '#000' }}>
          <thead>
            <tr>
              <th className="border border-black px-1 py-0.5 text-left font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '30%' }}>Áreas de Formación</th>
              <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '8%' }}>1er Lapso</th>
              <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '5%' }}>IN</th>
              <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '8%' }}>2do Lapso</th>
              <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '5%' }}>IN</th>
              <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '8%' }}>3er Lapso</th>
              <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '5%' }}>IN</th>
              <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '8%' }}>Final</th>
              <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '5%' }}>Rev.</th>
            </tr>
          </thead>
          <tbody>
            {numericMaterias.map((m) => {
              const n = notasMap[m.nombre]
              const l1 = n?.lapso1 || ''
              const l2 = n?.lapso2 || ''
              const l3 = n?.lapso3 || ''
              const def = calcDef(l1 || null, l2 || null, l3 || null)
              const defNum = parseFloat(def)
              const isInL1 = l1.trim().toUpperCase() === 'IN'
              const isInL2 = l2.trim().toUpperCase() === 'IN'
              const isInL3 = l3.trim().toUpperCase() === 'IN'
              const isPeL1 = l1.trim().toUpperCase() === 'PE'
              const isPeL2 = l2.trim().toUpperCase() === 'PE'
              const isPeL3 = l3.trim().toUpperCase() === 'PE'

              return (
                <tr key={m.nombre}>
                  <td className="border border-black px-1 py-0.5" style={{ borderColor: '#000', fontSize: '8px' }}>{m.nombre}</td>
                  <td className="border border-black px-1 py-0.5 text-center font-medium" style={{ borderColor: '#000', fontSize: '9px' }}>{l1 || ''}</td>
                  <td className="border border-black px-1 py-0.5 text-center" style={{ borderColor: '#000', fontSize: '8px', color: isInL1 ? 'red' : '#999' }}>{isInL1 ? 'IN' : isPeL1 ? 'PE' : ''}</td>
                  <td className="border border-black px-1 py-0.5 text-center font-medium" style={{ borderColor: '#000', fontSize: '9px' }}>{l2 || ''}</td>
                  <td className="border border-black px-1 py-0.5 text-center" style={{ borderColor: '#000', fontSize: '8px', color: isInL2 ? 'red' : '#999' }}>{isInL2 ? 'IN' : isPeL2 ? 'PE' : ''}</td>
                  <td className="border border-black px-1 py-0.5 text-center font-medium" style={{ borderColor: '#000', fontSize: '9px' }}>{l3 || ''}</td>
                  <td className="border border-black px-1 py-0.5 text-center" style={{ borderColor: '#000', fontSize: '8px', color: isInL3 ? 'red' : '#999' }}>{isInL3 ? 'IN' : isPeL3 ? 'PE' : ''}</td>
                  <td className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', fontSize: '9px', color: !isNaN(defNum) && defNum > 0 && defNum < 10 ? 'red' : '#000' }}>
                    {def || ''}
                  </td>
                  <td className="border border-black px-1 py-0.5 text-center" style={{ borderColor: '#000', fontSize: '8px' }}></td>
                </tr>
              )
            })}

            {/* PROMEDIO ROW */}
            <tr>
              <td className="border border-black px-1 py-0.5 font-bold" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '8px' }}>PROMEDIO</td>
              <td className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '9px' }}>{prom1}</td>
              <td className="border border-black px-1 py-0.5" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '8px' }}></td>
              <td className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '9px' }}>{prom2}</td>
              <td className="border border-black px-1 py-0.5" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '8px' }}></td>
              <td className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '9px' }}>{prom3}</td>
              <td className="border border-black px-1 py-0.5" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '8px' }}></td>
              <td className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '9px' }}>
                {promedio > 0 ? promedio.toFixed(2).replace('.', ',') : ''}
              </td>
              <td className="border border-black px-1 py-0.5" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '8px' }}></td>
            </tr>

            {/* POSICIÓN ROW */}
            <tr>
              <td className="border border-black px-1 py-0.5 font-bold" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '8px' }}>Posición Según Promedio</td>
              <td colSpan={8} className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f5f5f5', fontSize: '9px' }}>
                {position > 0 ? `${position}° de ${allStudentsPromedios.length}` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── MATERIA PENDIENTE TABLE ─── */}
      {reprobadas.length > 0 && (
        <div className="mb-2">
          <div className="font-bold text-center text-[9px] uppercase py-0.5 border border-black" style={{ borderColor: '#000', backgroundColor: '#f0f0f0' }}>
            MATERIA PENDIENTE
          </div>
          <table className="w-full" style={{ borderCollapse: 'collapse', borderColor: '#000' }}>
            <thead>
              <tr>
                <th className="border border-black px-1 py-0.5 text-left font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '35%' }}>Materia Pendiente</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '16%' }}>1er Momento</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '16%' }}>2do Momento</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '16%' }}>3er Momento</th>
                <th className="border border-black px-1 py-0.5 text-center font-bold" style={{ borderColor: '#000', backgroundColor: '#f0f0f0', fontSize: '8px', width: '16%' }}>4to Momento</th>
              </tr>
            </thead>
            <tbody>
              {reprobadas.map((r) => (
                <tr key={r.materia}>
                  <td className="border border-black px-1 py-0.5" style={{ borderColor: '#000', fontSize: '8px' }}>{r.materia}</td>
                  <td className="border border-black px-1 py-0.5 text-center" style={{ borderColor: '#000', fontSize: '8px' }}></td>
                  <td className="border border-black px-1 py-0.5 text-center" style={{ borderColor: '#000', fontSize: '8px' }}></td>
                  <td className="border border-black px-1 py-0.5 text-center" style={{ borderColor: '#000', fontSize: '8px' }}></td>
                  <td className="border border-black px-1 py-0.5 text-center" style={{ borderColor: '#000', fontSize: '8px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── ORIENTACIÓN Y CONVIVENCIA ─── */}
      <div className="mb-2">
        <div className="font-bold text-center text-[9px] uppercase py-0.5 border border-black" style={{ borderColor: '#000', backgroundColor: '#f0f0f0' }}>
          ORIENTACIÓN Y CONVIVENCIA
        </div>
        <div className="border border-black px-2 py-1" style={{ borderColor: '#000' }}>
          <div className="flex items-start gap-2">
            <span className="font-bold shrink-0" style={{ fontSize: '18px' }}>{orientacionGrade || '—'}</span>
            <span style={{ fontSize: '7px', lineHeight: '1.3' }}>
              {orientacionGrade ? CUALITATIVA_DESCRIPTIONS[orientacionGrade] || '' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ─── CREACIÓN, RECREACIÓN Y PRODUCCIÓN ─── */}
      <div className="mb-2">
        <div className="font-bold text-center text-[9px] uppercase py-0.5 border border-black" style={{ borderColor: '#000', backgroundColor: '#f0f0f0' }}>
          CREACIÓN, RECREACIÓN Y PRODUCCIÓN
        </div>
        <div className="border border-black px-2 py-1" style={{ borderColor: '#000' }}>
          <div className="flex items-start gap-2">
            <span className="font-bold shrink-0" style={{ fontSize: '18px' }}>{participacionGrade || '—'}</span>
            <span style={{ fontSize: '7px', lineHeight: '1.3' }}>
              {participacionGrade ? CUALITATIVA_DESCRIPTIONS[participacionGrade] || '' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ─── OBSERVACIONES ─── */}
      <div className="mb-3">
        <div className="font-bold text-center text-[9px] uppercase py-0.5 border border-black" style={{ borderColor: '#000', backgroundColor: '#f0f0f0' }}>
          OBSERVACIONES
        </div>
        <div className="border border-black px-2 py-1 min-h-[24px]" style={{ borderColor: '#000', fontSize: '8px' }}>
          {observacion || '\u00A0'}
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div className="mt-3">
        <div className="text-center mb-4" style={{ fontSize: '8px' }}>
          Miranda, {getFechaActual()}
        </div>

        <div className="flex justify-between items-end px-6">
          <div className="text-center" style={{ width: '45%' }}>
            <div className="border-t border-black pt-1 mx-auto" style={{ borderColor: '#000', width: '180px' }}>
              <p className="font-bold uppercase" style={{ fontSize: '8px' }}>DIRECTOR(A)</p>
              <p style={{ fontSize: '7px' }}>{schoolConfig.director.apellidosNombres}</p>
              <p style={{ fontSize: '7px' }}>C.I. {schoolConfig.director.cedula}</p>
            </div>
          </div>
          <div className="text-center" style={{ width: '45%' }}>
            <div className="border-t border-black pt-1 mx-auto" style={{ borderColor: '#000', width: '180px' }}>
              <p className="font-bold uppercase" style={{ fontSize: '8px' }}>COORDINADOR(A)</p>
              <p style={{ fontSize: '7px' }}>&nbsp;</p>
              <p style={{ fontSize: '7px' }}>&nbsp;</p>
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

  // Read params from URL
  const paramStudentId = searchParams.get('studentId')
  const paramAnio = searchParams.get('anioEscolar')
  const paramGrado = searchParams.get('grado')
  const paramSeccion = searchParams.get('seccion')

  // Auto-load if params present
  useEffect(() => {
    if (paramAnio && paramGrado) {
      setAnioEscolar(paramAnio)
      setGrado(paramGrado)
      setSeccion(paramSeccion || '')
      loadData(paramAnio, paramGrado, paramSeccion || '', paramStudentId || undefined)
    }
  }, [paramAnio, paramGrado, paramSeccion, paramStudentId])

  const loadData = useCallback(async (
    anio: string,
    grd: string,
    sec: string,
    studentId?: string
  ) => {
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
        else {
          toast({ title: 'Alumno no encontrado', description: 'No se encontró el alumno solicitado en esta sección.', variant: 'destructive' })
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Error al buscar datos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleSearch = useCallback(() => {
    if (!anioEscolar || !grado) {
      toast({ title: 'Campos requeridos', description: 'Seleccione Año Escolar y Grado', variant: 'destructive' })
      return
    }
    loadData(anioEscolar, grado, seccion)
  }, [anioEscolar, grado, seccion, loadData, toast])

  // Calculate position for selected student
  const { position, allPromedios, listaNum } = useMemo(() => {
    if (!selectedStudent || students.length === 0) return { position: 0, allPromedios: [], listaNum: 0 }

    const materias = getMateriasForGrado(grado)

    // Build promedios for ALL students
    const promedios: { studentId: string; promedio: number }[] = []
    for (const s of students) {
      const notasMap: Record<string, { lapso1: string; lapso2: string; lapso3: string }> = {}
      for (const nota of s.boletaNotas) {
        notasMap[nota.materia] = {
          lapso1: nota.lapso1 || '',
          lapso2: nota.lapso2 || '',
          lapso3: nota.lapso3 || '',
        }
      }
      const prom = calcStudentPromedio(materias, notasMap)
      promedios.push({ studentId: s.id, promedio: prom })
    }

    // Sort descending
    promedios.sort((a, b) => b.promedio - a.promedio)
    const allPromValues = promedios.map(p => p.promedio)
    const pos = promedios.findIndex(p => p.studentId === selectedStudent.id) + 1
    const num = promedios.findIndex(p => p.studentId === selectedStudent.id) + 1

    return { position: pos, allPromedios: allPromValues, listaNum: num }
  }, [selectedStudent, students, grado])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const goBack = useCallback(() => {
    setSelectedStudent(null)
    router.push('/boletin-calificaciones')
  }, [router])

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Boletín de Calificaciones
            </h1>
            <p className="text-muted-foreground text-sm">
              Formato 2 — Boletín individual por alumno
            </p>
          </div>
        </div>

        {/* Controls (hidden when viewing boletín) */}
        {!selectedStudent && (
          <Card className="no-print">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Año Escolar</Label>
                  <Input
                    value={anioEscolar}
                    onChange={(e) => setAnioEscolar(e.target.value)}
                    className="h-9 w-36"
                    placeholder="2025-2026"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Grado</Label>
                  <select
                    value={grado}
                    onChange={(e) => setGrado(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm w-32"
                  >
                    <option value="">Seleccionar...</option>
                    {Object.entries(GRADO_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Sección</Label>
                  <Input
                    value={seccion}
                    onChange={(e) => setSeccion(e.target.value.toUpperCase())}
                    className="h-9 w-16 text-center"
                    maxLength={2}
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading} className="h-9">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" /> Buscar</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student list */}
        {!selectedStudent && students.length > 0 && (
          <Card className="no-print">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                Alumnos encontrados ({students.length}) — Seleccione un alumno para ver el boletín
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {students.map((student, idx) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition text-left"
                  >
                    <span className="text-xs text-muted-foreground font-mono w-6 text-center">{idx + 1}</span>
                    <span className="text-xs font-mono text-muted-foreground w-28">{formatCedulaFinal(student.cedula)}</span>
                    <span className="text-sm font-medium">{student.apellidos}, {student.nombres}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <Card className="no-print">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando datos...</p>
            </CardContent>
          </Card>
        )}

        {/* Boletín View */}
        {selectedStudent && (
          <>
            {/* Action bar */}
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>

            {/* Boletín */}
            <div className="max-w-[850px] mx-auto shadow-lg">
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

// ── Page Component ─────────────────────────────────────────────────────
export default function BoletinCalificacionesPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
          Cargando...
        </div>
      </AppShell>
    }>
      <BoletinCalificacionesSearch />
    </Suspense>
  )
}
