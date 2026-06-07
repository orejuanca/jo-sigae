'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table2, Save, Printer, Search, Loader2, FileSpreadsheet, Eye } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { planEMG, formatCedulaFinal, type PlanAnio, type MateriaAnio } from '@/lib/school-config'

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
  pl1: string | null
  pl2: string | null
  pl3: string | null
  pl4: string | null
  pl5: string | null
  scoreCA: string | null
  scoreILE: string | null
  scoreMA: string | null
  scoreEF: string | null
  scoreAP: string | null
  scoreCN: string | null
  scoreGHC: string | null
}

interface StudentNota {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  seccion: string
  fechaNacimiento: string | null
  municipio: string
  estado: string
  pais: string
  boletaNotas: BoletaNotaRecord[]
  boletaExtras: BoletaExtraRecord[]
}

type NotasMap = Record<string, Record<string, { lapso1: string; lapso2: string; lapso3: string; revision: string }>>
type ExtrasMap = Record<string, Record<string, string>>

const EXTRAS_DEFAULT: Record<string, string> = {}

// ── Grado options ────────────────────────────────────────────────────────
const GRADO_OPTIONS = [
  { label: '1er Año', value: '1' },
  { label: '2do Año', value: '2' },
  { label: '3er Año', value: '3' },
  { label: '4to Año', value: '4' },
  { label: '5to Año', value: '5' },
]

const ANIO_ESCOLAR_OPTIONS = Array.from({ length: 2026 - 2017 + 1 }, (_, i) => {
  const y = 2017 + i
  return `${y}-${y + 1}`
})

// ── Helpers ──────────────────────────────────────────────────────────────
function getMateriasForGrado(grado: string): MateriaAnio[] {
  const idx = parseInt(grado, 10) - 1
  if (idx < 0 || idx >= planEMG.length) return []
  return planEMG[idx].materias
}

function calcDef(materia: MateriaAnio, l1: string, l2: string, l3: string): string {
  if (materia.tipo === 'cualitativa') {
    const vals = [l1, l2, l3].filter(v => v.trim() !== '')
    if (vals.length === 0) return ''
    return vals[0].trim()
  }
  const vals = [l1, l2, l3]
  for (const v of vals) {
    if (v.trim().toUpperCase() === 'IN' || v.trim().toUpperCase() === 'PE') return v.trim().toUpperCase()
  }
  const nums = vals.map(v => parseFloat(v))
  const valid = nums.filter(n => !isNaN(n) && n > 0)
  if (valid.length === 0) return ''
  const avg = valid.reduce((a, b) => a + b, 0) / 3
  return String(Math.round(avg))
}

function calcProm(materias: MateriaAnio[], notas: Record<string, { lapso1: string; lapso2: string; lapso3: string }>, lapso: number): string {
  let sum = 0, count = 0
  const lapsoKey = lapso === 1 ? 'lapso1' : lapso === 2 ? 'lapso2' : 'lapso3'
  for (const m of materias) {
    if (m.tipo === 'cualitativa') continue
    const val = notas[m.nombre]?.[lapsoKey] || ''
    const trimmed = val.trim()
    if (trimmed === '' || trimmed === 'IN' || trimmed === 'PE') continue
    const n = parseFloat(trimmed)
    if (!isNaN(n) && n > 0) { sum += n; count++ }
  }
  if (count === 0) return ''
  return (sum / count).toFixed(2).replace('.', ',')
}

// Mapping de nombres completos → abreviaturas exactas del Excel BOLETAS
const EXCEL_SUBJECT_NAMES: Record<string, string> = {
  'Castellano': 'CASTELLANO',
  'Inglés y otras Lenguas Extranjeras': 'INGLES',
  'Matemáticas': 'MATEMATICA',
  'Educación Física': 'ED. FISICA',
  'Arte y Patrimonio': 'ARTE Y PATR.',
  'Ciencias Naturales': 'CS. NATURAL.',
  'Geografía, Historia y Ciudadanía': 'GEO. HIST.',
  'Orientación y Convivencia': 'ORI.CONV.',
  'Participación Grupal': 'PART.GRUP.',
  'Física': 'FISICA',
  'Química': 'QUIMICA',
  'Biología': 'BIOLOGIA',
  'Formación para la Soberanía Nacional': 'FORM. SOBERANIA',
  'Ciencias de la Tierra': 'CS. DE LA TIERRA',
}

function getExcelSubjectName(nombre: string): string {
  return EXCEL_SUBJECT_NAMES[nombre] || nombre.toUpperCase()
}

function getNotaColorClass(value: string): string {
  const v = value.trim().toUpperCase()
  if (v === 'IN' || v === 'PE') return 'text-red-600 font-semibold'
  const n = parseFloat(value)
  if (isNaN(n) || value.trim() === '') return 'text-muted-foreground'
  if (n >= 18) return 'text-emerald-700 font-bold'
  if (n >= 15) return 'text-amber-600 font-semibold'
  if (n >= 12) return 'text-orange-500 font-medium'
  return 'text-red-600 font-bold'
}

function getNotaBgClass(value: string): string {
  const v = value.trim().toUpperCase()
  if (v === 'IN' || v === 'PE') return 'bg-red-50'
  const n = parseFloat(value)
  if (isNaN(n) || value.trim() === '') return ''
  if (n >= 18) return 'bg-emerald-50'
  if (n >= 15) return 'bg-amber-50'
  if (n >= 12) return 'bg-orange-50'
  return 'bg-red-50'
}

// ── Page Component ─────────────────────────────────────────────────────
export default function BoletasPage() {
  const [anioEscolar, setAnioEscolar] = useState('2025-2026')
  const [grado, setGrado] = useState('1')
  const [seccion, setSeccion] = useState('A')
  const [students, setStudents] = useState<StudentNota[]>([])
  const [notasMap, setNotasMap] = useState<NotasMap>({})
  const [extrasMap, setExtrasMap] = useState<ExtrasMap>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searched, setSearched] = useState(false)
  const { toast } = useToast()
  const tableRef = useRef<HTMLDivElement>(null)

  const materias = getMateriasForGrado(grado)

  // ── Calcular posiciones P1-P4 según promedio de cada lapso ───────────
  const posicionesMap = useMemo(() => {
    if (students.length === 0) return {} as Record<string, Record<number, number>>
    const posMap: Record<string, Record<number, number>> = {}
    for (let ln = 1; ln <= 4; ln++) {
      // Calcular promedio numérico para cada alumno en este lapso
      const ranking = students.map(s => {
        const sn = notasMap[s.id] || {}
        const promStr = calcProm(materias, sn, ln)
        const n = parseFloat(promStr.replace(',', '.'))
        return { studentId: s.id, avg: isNaN(n) ? -1 : n }
      })
      // Ordenar descendente por promedio
      ranking.sort((a, b) => b.avg - a.avg)
      // Asignar posiciones (empates comparten posición)
      let pos = 1
      for (let i = 0; i < ranking.length; i++) {
        if (i > 0 && ranking[i].avg !== ranking[i - 1].avg) {
          pos = i + 1
        }
        if (!posMap[ranking[i].studentId]) posMap[ranking[i].studentId] = {}
        if (ranking[i].avg >= 0) {
          posMap[ranking[i].studentId][ln] = pos
        }
      }
    }
    return posMap
  }, [students, notasMap, materias])

  // Subject score columns: CA, ILE, MA, EF, AP, CN, GHC (cols 73-79)
  const scoreMaterias = [
    { key: 'scoreCA', label: 'CA' },
    { key: 'scoreILE', label: 'ILE' },
    { key: 'scoreMA', label: 'MA' },
    { key: 'scoreEF', label: 'EF' },
    { key: 'scoreAP', label: 'AP' },
    { key: 'scoreCN', label: 'CN' },
    { key: 'scoreGHC', label: 'GHC' },
  ]

  // ── Load students ────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ anioEscolar, grado, seccion })
      const res = await fetch(`/api/boletas?${params}`)
      if (!res.ok) throw new Error('Error en la búsqueda')
      const data = await res.json()
      const loaded: StudentNota[] = data.students || []
      setStudents(loaded)

      const nMap: NotasMap = {}
      const eMap: ExtrasMap = {}
      for (const s of loaded) {
        nMap[s.id] = {}
        for (const m of getMateriasForGrado(grado)) {
          const nota = s.boletaNotas?.find((n: BoletaNotaRecord) => n.materia === m.nombre)
          nMap[s.id][m.nombre] = {
            lapso1: nota?.lapso1 || '',
            lapso2: nota?.lapso2 || '',
            lapso3: nota?.lapso3 || '',
            revision: nota?.revision || '',
          }
        }
        const extra = s.boletaExtras?.[0]
        eMap[s.id] = {
          grupo1: extra?.grupo1 || '', grupo2: extra?.grupo2 || '', grupo3: extra?.grupo3 || '', grupo4: extra?.grupo4 || '',
          observacion: extra?.observacion || '', obsBoletin: extra?.obsBoletin || '',
          materiaPendiente1: extra?.materiaPendiente1 || '', materiaPendiente2: extra?.materiaPendiente2 || '',
          mp1m1: extra?.mp1m1 || '', mp1m2: extra?.mp1m2 || '', mp1m3: extra?.mp1m3 || '', mp1m4: extra?.mp1m4 || '',
          mp2m1: extra?.mp2m1 || '', mp2m2: extra?.mp2m2 || '', mp2m3: extra?.mp2m3 || '', mp2m4: extra?.mp2m4 || '',
          pl1: extra?.pl1 || '', pl2: extra?.pl2 || '', pl3: extra?.pl3 || '', pl4: extra?.pl4 || '', pl5: extra?.pl5 || '',
          scoreCA: extra?.scoreCA || '', scoreILE: extra?.scoreILE || '', scoreMA: extra?.scoreMA || '',
          scoreEF: extra?.scoreEF || '', scoreAP: extra?.scoreAP || '', scoreCN: extra?.scoreCN || '', scoreGHC: extra?.scoreGHC || '',
        }
      }
      setNotasMap(nMap)
      setExtrasMap(eMap)
    } catch {
      toast({ title: 'Error', description: 'Error al buscar alumnos', variant: 'destructive' })
    } finally { setLoading(false) }
  }, [anioEscolar, grado, seccion, toast])

  // ── Update helpers ──────────────────────────────────────────────────
  const updateNota = useCallback((studentId: string, materia: string, lapso: 'lapso1' | 'lapso2' | 'lapso3', value: string) => {
    setNotasMap(prev => {
      const copy = { ...prev }
      const sn = { ...(copy[studentId] || {}) }
      const cur = { ...(sn[materia] || { lapso1: '', lapso2: '', lapso3: '', revision: '' }) }
      cur[lapso] = value
      sn[materia] = cur
      copy[studentId] = sn
      return copy
    })
  }, [])

  const updateRevision = useCallback((studentId: string, materia: string, value: string) => {
    setNotasMap(prev => {
      const copy = { ...prev }
      const sn = { ...(copy[studentId] || {}) }
      const cur = { ...(sn[materia] || { lapso1: '', lapso2: '', lapso3: '', revision: '' }) }
      cur.revision = value
      sn[materia] = cur
      copy[studentId] = sn
      return copy
    })
  }, [])

  const updateExtraField = useCallback((studentId: string, field: string, value: string) => {
    setExtrasMap(prev => {
      const copy = { ...prev }
      const cur = { ...(copy[studentId] || EXTRAS_DEFAULT) }
      cur[field] = value
      copy[studentId] = cur
      return copy
    })
  }, [])

  // ── Arrow key navigation ─────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, studentIdx: number, materiaIdx: number, lapsoIdx: number) => {
    let tS = studentIdx, tM = materiaIdx, tL = lapsoIdx
    if (e.key === 'ArrowDown') { e.preventDefault(); tS = Math.min(studentIdx + 1, students.length - 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); tS = Math.max(studentIdx - 1, 0) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); tL < 2 ? tL++ : (tM < materias.length - 1 ? (tM++, tL = 0) : 0) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); tL > 0 ? tL-- : (tM > 0 ? (tM--, tL = 2) : 0) }
    else return
    const keys = ['lapso1', 'lapso2', 'lapso3'] as const
    const el = document.getElementById(`nota-${tS}-${tM}-${keys[tL]}`) as HTMLInputElement
    if (el) { el.focus(); el.select() }
  }, [students.length, materias.length])

  // ── Save all ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (students.length === 0) return
    setSaving(true)
    try {
      const notasPayload: { studentId: string; materia: string; lapso1: string; lapso2: string; lapso3: string; revision: string }[] = []
      const extrasPayload: Record<string, string>[] = []
      for (const student of students) {
        for (const m of materias) {
          const n = notasMap[student.id]?.[m.nombre]
          notasPayload.push({ studentId: student.id, materia: m.nombre, lapso1: n?.lapso1 || '', lapso2: n?.lapso2 || '', lapso3: n?.lapso3 || '', revision: n?.revision || '' })
        }
        extrasPayload.push({ studentId: student.id, ...(extrasMap[student.id] || EXTRAS_DEFAULT) })
      }
      const res = await fetch('/api/boletas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anioEscolar, grado, seccion, notas: notasPayload, extras: extrasPayload }) })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Error al guardar') }
      toast({ title: 'Notas Guardadas', description: `Se guardaron las notas de ${students.length} alumno(s) correctamente.` })
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message || 'Error al guardar las notas', variant: 'destructive' })
    } finally { setSaving(false) }
  }, [students, notasMap, extrasMap, materias, anioEscolar, grado, seccion, toast])

  const gradoLabel = GRADO_OPTIONS.find(g => g.value === grado)?.label || grado

  // ── Excel column order: ────────────────────────────────────────────
  // A-D: Nº, CEDULA, APELLNOMB, S
  // E-AN: 9 subjects × 4 cols (L1, L2, L3, DEF)
  // AO-AR: GRUPO21-24
  // AS-AV: PROM21-24
  // AW-AZ: P1-P4
  // BA-BC: FN, LN, EN
  // BD-BE: MP1, MP2
  // BF-BI: 1M,2M,3M,4M (MP1 momentos)
  // BJ-BM: 1M,2M,3M,4M (MP2 momentos)
  // BN: PAIS
  // BO-BS: PL1-PL5
  // BT: OBS
  // BU-CA: CA, ILE, MA, EF, AP, CN, GHC
  // DP: OBSBOLETIN

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Table2 className="h-6 w-6" />Boletas de Calificaciones</h1>
            <p className="text-muted-foreground text-sm">Registro masivo — Plan EMG — {gradoLabel}</p>
          </div>
          {students.length > 0 && <span className="text-sm text-muted-foreground">{students.length} alumno{students.length !== 1 ? 's' : ''}</span>}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="grid gap-1.5"><Label className="text-xs font-medium">Año Escolar</Label><select value={anioEscolar} onChange={(e) => setAnioEscolar(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-36">{ANIO_ESCOLAR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              <div className="grid gap-1.5"><Label className="text-xs font-medium">Grado</Label><select value={grado} onChange={(e) => setGrado(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-32">{GRADO_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
              <div className="grid gap-1.5"><Label className="text-xs font-medium">Sección</Label><Input value={seccion} onChange={(e) => setSeccion(e.target.value.toUpperCase())} className="h-9 w-16 text-center" maxLength={2} /></div>
              <Button onClick={handleSearch} disabled={loading} className="h-9">{loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Buscando...</> : <><Search className="h-4 w-4 mr-2" />Buscar Alumnos</>}</Button>
            </div>
          </CardContent>
        </Card>

        {!searched && (<Card><CardContent className="py-16"><div className="text-center"><FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" /><h3 className="text-lg font-semibold text-muted-foreground mb-2">Ingrese los filtros y presione &quot;Buscar Alumnos&quot;</h3></div></CardContent></Card>)}
        {searched && !loading && students.length === 0 && (<Card><CardContent className="py-16"><div className="text-center"><FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" /><h3 className="text-lg font-semibold text-muted-foreground mb-2">No se encontraron alumnos</h3></div></CardContent></Card>)}

        {students.length > 0 && (<>
          <Card><CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleSave} disabled={saving} size="sm">{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar Todo</>}</Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
              <div className="ml-auto text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" />18-20</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" />15-17</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" />12-14</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" />01-11</span>
                <span className="flex items-center gap-1 text-red-600 font-semibold">IN/PE</span>
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-0">
            <div ref={tableRef} className="overflow-x-auto max-h-[75vh] overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  {/* ═══ ROW 1: Main group headers (Excel order) ═══ */}
                  <tr>
                    {/* A-D: Identity */}
                    <th className="sticky left-0 z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-0.5 py-2 text-center font-semibold w-7 text-[10px]"></th>
                    <th className="sticky left-[28px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-1.5 py-2 text-center font-semibold w-7 text-[10px]">Nº</th>
                    <th className="sticky left-[56px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-2 py-2 text-left font-semibold min-w-[95px] text-[10px]">CEDULA</th>
                    <th className="sticky left-[151px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-2 py-2 text-left font-semibold min-w-[170px] text-[10px]">APELLNOMB</th>
                    <th className="sticky left-[321px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-1.5 py-2 text-center font-semibold w-8 text-[10px]">S</th>

                    {/* E-AN: 9 subjects × 4 cols */}
                    {materias.map((m) => (
                      <th key={m.nombre} colSpan={4} className={`border-b border-l border-r border-emerald-600 px-1 py-1.5 text-center font-semibold text-[9px] ${m.tipo === 'cualitativa' ? 'bg-blue-700 text-white' : 'bg-emerald-700 text-white'}`}>
                        <span className="block truncate max-w-[110px]" title={m.nombre}>{getExcelSubjectName(m.nombre)}</span>
                      </th>
                    ))}

                    {/* AO-AR: GRUPO */}
                    <th colSpan={4} className="bg-slate-700 text-white border-b border-l border-r border-slate-600 px-1 py-1.5 text-center font-semibold text-[9px]">GRUPO</th>
                    {/* AS-AV: PROM */}
                    <th colSpan={4} className="bg-slate-600 text-white border-b border-l border-r border-slate-500 px-1 py-1.5 text-center font-semibold text-[9px]">PROM</th>
                    {/* AW-AZ: P1-P4 */}
                    <th colSpan={4} className="bg-teal-700 text-white border-b border-l border-r border-teal-600 px-1 py-1.5 text-center font-semibold text-[9px]">POSICIÓN</th>
                    {/* BA-BC: FN, LN, EN */}
                    <th colSpan={3} className="bg-stone-700 text-white border-b border-l border-r border-stone-600 px-1.5 py-1.5 text-center font-semibold text-[9px]">DATOS</th>
                    {/* BD-BE: MP1, MP2 */}
                    <th colSpan={2} className="bg-red-800 text-white border-b border-l border-r border-red-700 px-1 py-1.5 text-center font-semibold text-[9px]">MATERIA PENDIENTE</th>
                    {/* BF-BM: Momentos */}
                    <th colSpan={8} className="bg-red-700 text-white border-b border-l border-r border-red-600 px-1 py-1.5 text-center font-semibold text-[9px]">MOMENTOS</th>
                    {/* BN: PAIS */}
                    <th className="bg-stone-600 text-white border-b border-l border-r border-stone-500 px-1 py-1.5 text-center font-semibold text-[9px]">PAIS</th>
                    {/* BO-BS: PL1-PL5 */}
                    <th colSpan={5} className="bg-orange-700 text-white border-b border-l border-r border-orange-600 px-1 py-1.5 text-center font-semibold text-[9px]">PLANTELES</th>
                    {/* BT: OBS */}
                    <th className="bg-amber-800 text-white border-b border-l border-r border-amber-700 px-2 py-1.5 text-center font-semibold text-[9px] min-w-[100px]">OBS</th>
                    {/* BU-CA: CA, ILE, MA, EF, AP, CN, GHC */}
                    <th colSpan={7} className="bg-indigo-700 text-white border-b border-l border-r border-indigo-600 px-1 py-1.5 text-center font-semibold text-[9px]">NOTAS REVISION</th>
                    {/* DP: OBSBOLETIN */}
                    <th className="bg-amber-800 text-white border-b border-l border-r border-amber-700 px-2 py-1.5 text-center font-semibold text-[9px] min-w-[100px]">OBSBOLETIN</th>
                  </tr>

                  {/* ═══ ROW 2: Sub-headers (Excel order) ═══ */}
                  <tr>
                    <th className="sticky left-0 z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-0.5" />
                    <th className="sticky left-[28px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-1" />
                    <th className="sticky left-[56px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-2" />
                    <th className="sticky left-[151px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-2" />
                    <th className="sticky left-[321px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-1" />

                    {/* Subject sub-columns: 1er, 2do, 3er, DEF */}
                    {materias.map((m) => (
                      <React.Fragment key={`sub-${m.nombre}`}>
                        {['1er','2do','3er'].map(label => (
                          <th key={label} className={`border-b border-l border-r border-emerald-700 py-1 px-0.5 w-[46px] text-center text-[9px] font-medium ${m.tipo === 'cualitativa' ? 'bg-blue-900 text-blue-300' : 'bg-emerald-900 text-emerald-300'}`}>{label}</th>
                        ))}
                        <th className={`border-b border-r border-emerald-700 py-1 px-0.5 w-[46px] text-center text-[9px] font-bold ${m.tipo === 'cualitativa' ? 'bg-blue-900 text-blue-200' : 'bg-emerald-900 text-emerald-200'}`}>DEF</th>
                      </React.Fragment>
                    ))}

                    {/* GRUPO sub: GRUPO21-24 */}
                    <th className="bg-slate-800 text-slate-300 border-b border-l border-r border-slate-600 py-1 px-0.5 w-[52px] text-center text-[8px] font-medium">GRUPO21</th>
                    <th className="bg-slate-800 text-slate-300 border-b border-r border-slate-600 py-1 px-0.5 w-[52px] text-center text-[8px] font-medium">GRUPO22</th>
                    <th className="bg-slate-800 text-slate-300 border-b border-r border-slate-600 py-1 px-0.5 w-[52px] text-center text-[8px] font-medium">GRUPO23</th>
                    <th className="bg-slate-800 text-slate-200 border-b border-r border-slate-600 py-1 px-0.5 w-[52px] text-center text-[8px] font-bold">GRUPO24</th>

                    {/* PROM sub: PROM21-24 */}
                    <th className="bg-slate-700 text-slate-300 border-b border-l border-r border-slate-500 py-1 px-0.5 w-[50px] text-center text-[8px] font-medium">PROM21</th>
                    <th className="bg-slate-700 text-slate-300 border-b border-r border-slate-500 py-1 px-0.5 w-[50px] text-center text-[8px] font-medium">PROM22</th>
                    <th className="bg-slate-700 text-slate-300 border-b border-r border-slate-500 py-1 px-0.5 w-[50px] text-center text-[8px] font-medium">PROM23</th>
                    <th className="bg-slate-700 text-slate-200 border-b border-r border-slate-500 py-1 px-0.5 w-[50px] text-center text-[8px] font-bold">PROM24</th>

                    {/* POSICIÓN sub: P1-P4 */}
                    <th className="bg-teal-800 text-teal-300 border-b border-l border-r border-teal-600 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">P1</th>
                    <th className="bg-teal-800 text-teal-300 border-b border-r border-teal-600 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">P2</th>
                    <th className="bg-teal-800 text-teal-300 border-b border-r border-teal-600 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">P3</th>
                    <th className="bg-teal-800 text-teal-200 border-b border-r border-teal-600 py-1 px-0.5 w-[35px] text-center text-[8px] font-bold">P4</th>

                    {/* DATOS sub: FN, LN, EN */}
                    <th className="bg-stone-800 text-stone-300 border-b border-l border-r border-stone-600 py-1 px-0.5 w-[70px] text-center text-[8px] font-medium">FN</th>
                    <th className="bg-stone-800 text-stone-300 border-b border-r border-stone-600 py-1 px-0.5 w-[70px] text-center text-[8px] font-medium">LN</th>
                    <th className="bg-stone-800 text-stone-300 border-b border-r border-stone-600 py-1 px-0.5 w-[55px] text-center text-[8px] font-medium">EN</th>

                    {/* MP sub: MP1, MP2 */}
                    <th className="bg-red-900 text-red-300 border-b border-l border-r border-red-700 py-1 px-0.5 w-[65px] text-center text-[8px] font-medium">MP1</th>
                    <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[65px] text-center text-[8px] font-medium">MP2</th>

                    {/* Momentos sub: 1M,2M,3M,4M × 2 */}
                    <th className="bg-red-900 text-red-300 border-b border-l border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">1M</th>
                    <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">2M</th>
                    <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">3M</th>
                    <th className="bg-red-900 text-red-200 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-bold">4M</th>
                    <th className="bg-red-900 text-red-300 border-b border-l border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">1M</th>
                    <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">2M</th>
                    <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">3M</th>
                    <th className="bg-red-900 text-red-200 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-bold">4M</th>

                    {/* PAIS */}
                    <th className="bg-stone-800 text-stone-300 border-b border-l border-r border-stone-500 py-1 px-0.5 w-[60px] text-center text-[8px] font-medium">PAIS</th>

                    {/* PL sub: PL1-PL5 */}
                    <th className="bg-orange-800 text-orange-300 border-b border-l border-r border-orange-600 py-1 px-0.5 w-[45px] text-center text-[8px] font-medium">PL1</th>
                    <th className="bg-orange-800 text-orange-300 border-b border-r border-orange-600 py-1 px-0.5 w-[45px] text-center text-[8px] font-medium">PL2</th>
                    <th className="bg-orange-800 text-orange-300 border-b border-r border-orange-600 py-1 px-0.5 w-[45px] text-center text-[8px] font-medium">PL3</th>
                    <th className="bg-orange-800 text-orange-300 border-b border-r border-orange-600 py-1 px-0.5 w-[45px] text-center text-[8px] font-medium">PL4</th>
                    <th className="bg-orange-800 text-orange-200 border-b border-r border-orange-600 py-1 px-0.5 w-[45px] text-center text-[8px] font-bold">PL5</th>

                    {/* OBS */}
                    <th className="bg-amber-900 text-amber-300 border-b border-l border-r border-amber-700 py-1 px-1" />
                    {/* NOTAS REVISION */}
                    {scoreMaterias.map(sm => (
                      <th key={sm.key} className="bg-indigo-800 text-indigo-300 border-b border-l border-r border-indigo-600 py-1 px-0.5 w-[40px] text-center text-[8px] font-bold">{sm.label}</th>
                    ))}
                    {/* OBSBOLETIN */}
                    <th className="bg-amber-900 text-amber-300 border-b border-l border-r border-amber-700 py-1 px-1" />
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, studentIdx) => {
                    const sn = notasMap[student.id] || {}
                    const se = extrasMap[student.id] || EXTRAS_DEFAULT
                    return (
                      <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                        {/* A-D: Identity */}
                        <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-0.5 py-1 text-center text-[10px]">
                          <Link href={`/boletin-calificaciones?studentId=${student.id}&anioEscolar=${encodeURIComponent(anioEscolar)}&grado=${encodeURIComponent(grado)}&seccion=${encodeURIComponent(seccion)}`} className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-emerald-100 text-emerald-700 transition" title="Ver Boletín"><Eye className="w-3.5 h-3.5" /></Link>
                        </td>
                        <td className="sticky left-[28px] z-10 bg-white border-b border-r border-gray-200 px-1.5 py-1 text-center text-muted-foreground font-mono text-[10px]">{studentIdx + 1}</td>
                        <td className="sticky left-[56px] z-10 bg-white border-b border-r border-gray-200 px-2 py-1 font-mono text-[10px] whitespace-nowrap">{formatCedulaFinal(student.cedula)}</td>
                        <td className="sticky left-[151px] z-10 bg-white border-b border-r border-gray-200 px-2 py-1 font-medium whitespace-nowrap text-[10px]">{student.apellidos}, {student.nombres}</td>
                        <td className="sticky left-[321px] z-10 bg-white border-b border-r border-gray-200 px-1.5 py-1 text-center font-semibold text-[10px]">{student.seccion || seccion}</td>

                        {/* E-AN: 9 subjects × 4 cols (1er, 2do, 3er, DEF) */}
                        {materias.map((m, materiaIdx) => {
                          const notas = sn[m.nombre] || { lapso1: '', lapso2: '', lapso3: '', revision: '' }
                          const def = calcDef(m, notas.lapso1, notas.lapso2, notas.lapso3)
                          const lapsoKeys = ['lapso1', 'lapso2', 'lapso3'] as const
                          const isC = m.tipo === 'cualitativa'
                          return (
                            <React.Fragment key={`${student.id}-${m.nombre}`}>
                              {lapsoKeys.map((lapso, lapsoIdx) => {
                                const val = notas[lapso]
                                return (
                                  <td key={`${student.id}-${m.nombre}-${lapso}`} className={`border-b border-r border-gray-200 py-0 px-0 ${isC ? 'bg-blue-50/30' : getNotaBgClass(val)}`}>
                                    <input id={`nota-${studentIdx}-${materiaIdx}-${lapsoIdx}`} type="text" value={val} onChange={(e) => updateNota(student.id, m.nombre, lapso, e.target.value.toUpperCase())} onKeyDown={(e) => handleKeyDown(e, studentIdx, materiaIdx, lapsoIdx)} className={`h-7 w-full text-center text-[10px] border-0 bg-transparent focus:outline-none focus:ring-2 ${isC ? 'focus:ring-blue-400' : 'focus:ring-emerald-500'} rounded ${isC ? 'text-blue-700 font-medium' : getNotaColorClass(val)}`} maxLength={isC ? 12 : 3} />
                                  </td>
                                )
                              })}
                              <td className={`border-b border-r border-gray-200 py-1 px-0.5 text-center font-bold text-[10px] ${isC ? (def ? 'text-blue-700 bg-blue-50/50' : 'text-muted-foreground') : getNotaColorClass(def) + ' ' + getNotaBgClass(def)}`}>{def || '—'}</td>
                            </React.Fragment>
                          )
                        })}

                        {/* AO-AR: GRUPO21-24 */}
                        {(['grupo1','grupo2','grupo3','grupo4'] as const).map((gKey) => (
                          <td key={`${student.id}-${gKey}`} className="border-b border-r border-gray-200 py-0 px-0 bg-slate-50/50">
                            <input type="text" value={se[gKey] || ''} onChange={(e) => updateExtraField(student.id, gKey, e.target.value.toUpperCase())} className="h-7 w-full text-center text-[10px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-slate-400 rounded text-slate-600 font-medium" placeholder="—" maxLength={12} />
                          </td>
                        ))}

                        {/* AS-AV: PROM21-24 */}
                        {[1,2,3,4].map((ln) => {
                          const prom = calcProm(materias, sn, ln)
                          const n = parseFloat(prom.replace(',', '.'))
                          const clr = !prom ? 'text-muted-foreground' : n >= 18 ? 'text-emerald-700 font-bold' : n >= 15 ? 'text-amber-600 font-semibold' : n >= 12 ? 'text-orange-500 font-medium' : n > 0 ? 'text-red-600 font-bold' : 'text-muted-foreground'
                          return <td key={`${student.id}-prom${ln}`} className="border-b border-r border-gray-200 py-1 px-0.5 text-center text-[10px] bg-slate-50/30"><span className={clr}>{prom || '—'}</span></td>
                        })}

                        {/* AW-AZ: P1-P4 (Posición por lapso) */}
                        {[1,2,3,4].map(ln => {
                          const pos = posicionesMap[student.id]?.[ln]
                          return (
                            <td key={`${student.id}-pos${ln}`} className="border-b border-r border-gray-200 py-1 px-0.5 text-center text-[10px] bg-teal-50/30 text-teal-700 font-semibold">
                              {pos || '—'}
                            </td>
                          )
                        })}

                        {/* BA-BC: FN, LN, EN */}
                        <td className="border-b border-r border-gray-200 py-1 px-1 text-center text-[9px] text-muted-foreground bg-stone-50/50 whitespace-nowrap">{student.fechaNacimiento || '—'}</td>
                        <td className="border-b border-r border-gray-200 py-1 px-1 text-center text-[9px] text-muted-foreground bg-stone-50/50 whitespace-nowrap max-w-[80px] truncate" title={student.municipio}>{student.municipio || '—'}</td>
                        <td className="border-b border-r border-gray-200 py-1 px-1 text-center text-[9px] text-muted-foreground bg-stone-50/50 whitespace-nowrap">{student.estado || '—'}</td>

                        {/* BD-BE: MP1, MP2 */}
                        <td className="border-b border-r border-gray-200 py-0 px-0 bg-red-50/40">
                          <input type="text" value={se.materiaPendiente1 || ''} onChange={(e) => updateExtraField(student.id, 'materiaPendiente1', e.target.value)} className="h-7 w-full text-left text-[8px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-0.5 text-stone-600" placeholder="—" maxLength={25} />
                        </td>
                        <td className="border-b border-r border-gray-200 py-0 px-0 bg-red-50/40">
                          <input type="text" value={se.materiaPendiente2 || ''} onChange={(e) => updateExtraField(student.id, 'materiaPendiente2', e.target.value)} className="h-7 w-full text-left text-[8px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-0.5 text-stone-600" placeholder="—" maxLength={25} />
                        </td>

                        {/* BF-BI: Momentos MP1 */}
                        {(['mp1m1','mp1m2','mp1m3','mp1m4'] as const).map(key => (
                          <td key={`${student.id}-${key}`} className="border-b border-r border-gray-200 py-0 px-0 bg-red-50/30">
                            <input type="text" value={se[key] || ''} onChange={(e) => updateExtraField(student.id, key, e.target.value)} className="h-7 w-full text-center text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-400 rounded text-stone-600" placeholder="—" maxLength={3} />
                          </td>
                        ))}

                        {/* BJ-BM: Momentos MP2 */}
                        {(['mp2m1','mp2m2','mp2m3','mp2m4'] as const).map(key => (
                          <td key={`${student.id}-${key}`} className="border-b border-r border-gray-200 py-0 px-0 bg-red-50/30">
                            <input type="text" value={se[key] || ''} onChange={(e) => updateExtraField(student.id, key, e.target.value)} className="h-7 w-full text-center text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-400 rounded text-stone-600" placeholder="—" maxLength={3} />
                          </td>
                        ))}

                        {/* BN: PAIS */}
                        <td className="border-b border-r border-gray-200 py-1 px-1 text-center text-[9px] text-muted-foreground bg-stone-50/50 whitespace-nowrap">{student.pais || '—'}</td>

                        {/* BO-BS: PL1-PL5 */}
                        {(['pl1','pl2','pl3','pl4','pl5'] as const).map(key => (
                          <td key={`${student.id}-${key}`} className="border-b border-r border-gray-200 py-0 px-0 bg-orange-50/30">
                            <input type="text" value={se[key] || ''} onChange={(e) => updateExtraField(student.id, key, e.target.value)} className="h-7 w-full text-center text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-400 rounded text-stone-600" placeholder="—" maxLength={20} />
                          </td>
                        ))}

                        {/* BT: OBS */}
                        <td className="border-b border-r border-gray-200 py-0 px-0 bg-amber-50/30">
                          <input type="text" value={se.observacion || ''} onChange={(e) => updateExtraField(student.id, 'observacion', e.target.value)} className="h-7 w-full text-left text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1 text-stone-600" placeholder="—" maxLength={100} />
                        </td>

                        {/* BU-CA: CA, ILE, MA, EF, AP, CN, GHC */}
                        {scoreMaterias.map(sm => (
                          <td key={`${student.id}-${sm.key}`} className="border-b border-r border-gray-200 py-0 px-0 bg-indigo-50/30">
                            <input type="text" value={se[sm.key] || ''} onChange={(e) => updateExtraField(student.id, sm.key, e.target.value)} className="h-7 w-full text-center text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded text-stone-600" placeholder="—" maxLength={5} />
                          </td>
                        ))}

                        {/* DP: OBSBOLETIN */}
                        <td className="border-b border-r border-gray-200 py-0 px-0 bg-amber-50/30">
                          <input type="text" value={se.obsBoletin || ''} onChange={(e) => updateExtraField(student.id, 'obsBoletin', e.target.value)} className="h-7 w-full text-left text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1 text-stone-600" placeholder="—" maxLength={100} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </>)}
      </div>
    </AppShell>
  )
}
