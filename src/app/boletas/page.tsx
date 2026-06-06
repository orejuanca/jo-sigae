'use client'

import React, { useState, useCallback, useRef } from 'react'
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
  boletaNotas: BoletaNotaRecord[]
  boletaExtras: BoletaExtraRecord[]
}

// Local editable structures
type NotasMap = Record<string, Record<string, { lapso1: string; lapso2: string; lapso3: string; revision: string }>>
type ExtrasMap = Record<string, {
  grupo1: string; grupo2: string; grupo3: string; grupo4: string;
  observacion: string; obsBoletin: string;
  materiaPendiente1: string; materiaPendiente2: string;
  mp1m1: string; mp1m2: string; mp1m3: string; mp1m4: string;
  mp2m1: string; mp2m2: string; mp2m3: string; mp2m4: string;
}>

// ── Grado options ────────────────────────────────────────────────────────
const GRADO_OPTIONS = [
  { label: '1er Año', value: '1' },
  { label: '2do Año', value: '2' },
  { label: '3er Año', value: '3' },
  { label: '4to Año', value: '4' },
  { label: '5to Año', value: '5' },
]

// ── Helpers ──────────────────────────────────────────────────────────────
function getMateriasForGrado(grado: string): MateriaAnio[] {
  const idx = parseInt(grado, 10) - 1
  if (idx < 0 || idx >= planEMG.length) return []
  return planEMG[idx].materias
}

function calcDef(materia: MateriaAnio, l1: string, l2: string, l3: string): string {
  // For qualitative subjects, just use the first non-empty value (all lapsos are the same)
  if (materia.tipo === 'cualitativa') {
    const vals = [l1, l2, l3].filter(v => v.trim() !== '')
    if (vals.length === 0) return ''
    return vals[0].trim()
  }
  // For numeric subjects, calculate average
  const vals = [l1, l2, l3]
  for (const v of vals) {
    if (v.trim().toUpperCase() === 'IN' || v.trim().toUpperCase() === 'PE') {
      return v.trim().toUpperCase()
    }
  }
  const nums = vals.map(v => parseFloat(v))
  const valid = nums.filter(n => !isNaN(n) && n > 0)
  if (valid.length === 0) return ''
  const avg = valid.reduce((a, b) => a + b, 0) / 3
  return String(Math.round(avg))
}

function calcProm(materias: MateriaAnio[], notas: Record<string, { lapso1: string; lapso2: string; lapso3: string }>, lapso: number): string {
  let sum = 0
  let count = 0
  const lapsoKey = lapso === 1 ? 'lapso1' : lapso === 2 ? 'lapso2' : 'lapso3'

  for (const m of materias) {
    if (m.tipo === 'cualitativa') continue // Skip qualitative subjects for average
    const val = notas[m.nombre]?.[lapsoKey] || ''
    const trimmed = val.trim()
    if (trimmed === '' || trimmed === 'IN' || trimmed === 'PE') continue
    const n = parseFloat(trimmed)
    if (!isNaN(n) && n > 0) {
      sum += n
      count++
    }
  }
  if (count === 0) return ''
  const avg = sum / count
  return avg.toFixed(2).replace('.', ',')
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

const emptyExtras = (): typeof ExtrasMap[string] => ({
  grupo1: '', grupo2: '', grupo3: '', grupo4: '',
  observacion: '', obsBoletin: '',
  materiaPendiente1: '', materiaPendiente2: '',
  mp1m1: '', mp1m2: '', mp1m3: '', mp1m4: '',
  mp2m1: '', mp2m2: '', mp2m3: '', mp2m4: '',
})

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

      // Build notasMap from loaded data
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

        // Load extras (GRUPO, OBS, MP)
        const extra = s.boletaExtras?.[0]
        eMap[s.id] = {
          grupo1: extra?.grupo1 || '',
          grupo2: extra?.grupo2 || '',
          grupo3: extra?.grupo3 || '',
          grupo4: extra?.grupo4 || '',
          observacion: extra?.observacion || '',
          obsBoletin: extra?.obsBoletin || '',
          materiaPendiente1: extra?.materiaPendiente1 || '',
          materiaPendiente2: extra?.materiaPendiente2 || '',
          mp1m1: extra?.mp1m1 || '',
          mp1m2: extra?.mp1m2 || '',
          mp1m3: extra?.mp1m3 || '',
          mp1m4: extra?.mp1m4 || '',
          mp2m1: extra?.mp2m1 || '',
          mp2m2: extra?.mp2m2 || '',
          mp2m3: extra?.mp2m3 || '',
          mp2m4: extra?.mp2m4 || '',
        }
      }

      setNotasMap(nMap)
      setExtrasMap(eMap)
    } catch {
      toast({ title: 'Error', description: 'Error al buscar alumnos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [anioEscolar, grado, seccion, toast])

  // ── Update a single nota cell ────────────────────────────────────────
  const updateNota = useCallback((studentId: string, materia: string, lapso: 'lapso1' | 'lapso2' | 'lapso3', value: string) => {
    setNotasMap(prev => {
      const copy = { ...prev }
      const studentNotas = { ...(copy[studentId] || {}) }
      const current = { ...(studentNotas[materia] || { lapso1: '', lapso2: '', lapso3: '', revision: '' }) }
      current[lapso] = value
      studentNotas[materia] = current
      copy[studentId] = studentNotas
      return copy
    })
  }, [])

  // ── Update REVISION cell ─────────────────────────────────────────────
  const updateRevision = useCallback((studentId: string, materia: string, value: string) => {
    setNotasMap(prev => {
      const copy = { ...prev }
      const studentNotas = { ...(copy[studentId] || {}) }
      const current = { ...(studentNotas[materia] || { lapso1: '', lapso2: '', lapso3: '', revision: '' }) }
      current.revision = value
      studentNotas[materia] = current
      copy[studentId] = studentNotas
      return copy
    })
  }, [])

  // ── Update an extra field ────────────────────────────────────────────
  const updateExtraField = useCallback((studentId: string, field: string, value: string) => {
    setExtrasMap(prev => {
      const copy = { ...prev }
      const current = { ...(copy[studentId] || emptyExtras()) }
      ;(current as Record<string, string>)[field] = value
      copy[studentId] = current
      return copy
    })
  }, [])

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
          notasPayload.push({
            studentId: student.id,
            materia: m.nombre,
            lapso1: n?.lapso1 || '',
            lapso2: n?.lapso2 || '',
            lapso3: n?.lapso3 || '',
            revision: n?.revision || '',
          })
        }

        const e = extrasMap[student.id] || emptyExtras()
        extrasPayload.push({
          studentId: student.id,
          ...e,
        })
      }

      const res = await fetch('/api/boletas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anioEscolar, grado, seccion, notas: notasPayload, extras: extrasPayload }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }

      toast({
        title: 'Notas Guardadas',
        description: `Se guardaron las notas de ${students.length} alumno(s) correctamente.`,
      })
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: (e as Error).message || 'Error al guardar las notas',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }, [students, notasMap, extrasMap, materias, anioEscolar, grado, seccion, toast])

  // ── Arrow key navigation ─────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, studentIdx: number, materiaIdx: number, lapsoIdx: number) => {
    let targetStudent = studentIdx
    let targetMateria = materiaIdx
    let targetLapso = lapsoIdx

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      targetStudent = Math.min(studentIdx + 1, students.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      targetStudent = Math.max(studentIdx - 1, 0)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (lapsoIdx < 2) {
        targetLapso = lapsoIdx + 1
      } else if (materiaIdx < materias.length - 1) {
        targetMateria = materiaIdx + 1
        targetLapso = 0
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (lapsoIdx > 0) {
        targetLapso = lapsoIdx - 1
      } else if (materiaIdx > 0) {
        targetMateria = materiaIdx - 1
        targetLapso = 2
      }
    } else {
      return
    }

    const lapsoKeys = ['lapso1', 'lapso2', 'lapso3'] as const
    const inputId = `nota-${targetStudent}-${targetMateria}-${lapsoKeys[targetLapso]}`
    const el = document.getElementById(inputId) as HTMLInputElement
    if (el) { el.focus(); el.select() }
  }, [students.length, materias.length])

  const gradoLabel = GRADO_OPTIONS.find(g => g.value === grado)?.label || grado

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Table2 className="h-6 w-6" />
              Boletas de Calificaciones
            </h1>
            <p className="text-muted-foreground text-sm">
              Registro masivo de notas por lapso — Plan EMG — {gradoLabel}
            </p>
          </div>
          {students.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {students.length} alumno{students.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Filter card */}
        <Card>
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
                  {GRADO_OPTIONS.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
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
                  <><Search className="h-4 w-4 mr-2" /> Buscar Alumnos</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {!searched && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Ingrese los filtros y presione &quot;Buscar Alumnos&quot;
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Seleccione el Año Escolar, Grado y Sección para cargar la lista de alumnos
                  y registrar sus calificaciones por lapso.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No results */}
        {searched && !loading && students.length === 0 && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  No se encontraron alumnos
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  No hay alumnos registrados con notas para {gradoLabel} — Sección {seccion}
                  en el año escolar {anioEscolar}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spreadsheet table */}
        {students.length > 0 && (
          <>
            {/* Action bar */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" /> Guardar Todo</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <div className="ml-auto text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-emerald-200 inline-block" /> 18-20
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-amber-200 inline-block" /> 15-17
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-orange-200 inline-block" /> 12-14
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-red-200 inline-block" /> 01-11
                    </span>
                    <span className="flex items-center gap-1 text-red-600 font-semibold">IN/PE</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div ref={tableRef} className="overflow-x-auto max-h-[75vh] overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      {/* Row 1: Main headers */}
                      <tr>
                        {/* Fixed identity columns */}
                        <th className="sticky left-0 z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-0.5 py-2 text-center font-semibold w-7 text-[10px]"></th>
                        <th className="sticky left-[28px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-1.5 py-2 text-center font-semibold w-7 text-[10px]">N°</th>
                        <th className="sticky left-[56px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-2 py-2 text-left font-semibold min-w-[95px] text-[10px]">CEDULA</th>
                        <th className="sticky left-[151px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-2 py-2 text-left font-semibold min-w-[170px] text-[10px]">APELLNOMB</th>
                        <th className="sticky left-[321px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-1.5 py-2 text-center font-semibold w-8 text-[10px]">S</th>

                        {/* Subject columns (1er, 2do, 3er, DEF — sin REV) */}
                        {materias.map((m) => (
                          <th
                            key={m.nombre}
                            colSpan={4}
                            className={`border-b border-l border-r border-emerald-600 px-1 py-1.5 text-center font-semibold text-[9px] ${m.tipo === 'cualitativa' ? 'bg-blue-700 text-white' : 'bg-emerald-700 text-white'}`}
                          >
                            <span className="block truncate max-w-[110px]" title={m.nombre}>
                              {m.nombre.toUpperCase()}
                            </span>
                          </th>
                        ))}

                        {/* REV. column group — separado después de las materias */}
                        <th colSpan={materias.length} className="bg-purple-700 text-white border-b border-l border-r border-purple-600 px-1 py-1.5 text-center font-semibold text-[9px]">REV.</th>

                        {/* GRUPO columns */}
                        <th colSpan={4} className="bg-slate-700 text-white border-b border-l border-r border-slate-600 px-1 py-1.5 text-center font-semibold text-[9px]">GRUPO</th>

                        {/* PROM columns */}
                        <th colSpan={4} className="bg-slate-600 text-white border-b border-l border-r border-slate-500 px-1 py-1.5 text-center font-semibold text-[9px]">PROM</th>

                        {/* Biographic columns */}
                        <th className="bg-stone-700 text-white border-b border-l border-r border-stone-600 px-1.5 py-1.5 text-center font-semibold text-[9px]">FN</th>
                        <th className="bg-stone-700 text-white border-b border-l border-r border-stone-600 px-1.5 py-1.5 text-center font-semibold text-[9px]">LN</th>
                        <th className="bg-stone-700 text-white border-b border-l border-r border-stone-600 px-1.5 py-1.5 text-center font-semibold text-[9px]">EN</th>

                        {/* MATERIA PENDIENTE */}
                        <th colSpan={10} className="bg-red-800 text-white border-b border-l border-r border-red-700 px-1 py-1.5 text-center font-semibold text-[9px]">MATERIA PENDIENTE</th>

                        {/* OBS */}
                        <th className="bg-amber-800 text-white border-b border-l border-r border-amber-700 px-2 py-1.5 text-center font-semibold text-[9px] min-w-[120px]">OBS</th>

                        {/* OBSBOLETIN */}
                        <th className="bg-amber-800 text-white border-b border-l border-r border-amber-700 px-2 py-1.5 text-center font-semibold text-[9px] min-w-[120px]">OBSBOLETIN</th>
                      </tr>

                      {/* Row 2: Sub-headers */}
                      <tr>
                        <th className="sticky left-0 z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-0.5" />
                        <th className="sticky left-[28px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-1" />
                        <th className="sticky left-[56px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-2" />
                        <th className="sticky left-[151px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-2" />
                        <th className="sticky left-[321px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-1" />

                        {/* Subject sub-columns: 1er, 2do, 3er, DEF (sin REV) */}
                        {materias.map((m) => (
                          <React.Fragment key={`sub-${m.nombre}`}>
                            <th className={`border-b border-l border-r border-emerald-700 py-1 px-0.5 w-[46px] text-center text-[9px] font-medium ${m.tipo === 'cualitativa' ? 'bg-blue-900 text-blue-300' : 'bg-emerald-900 text-emerald-300'}`}>1er</th>
                            <th className={`border-b border-r border-emerald-700 py-1 px-0.5 w-[46px] text-center text-[9px] font-medium ${m.tipo === 'cualitativa' ? 'bg-blue-900 text-blue-300' : 'bg-emerald-900 text-emerald-300'}`}>2do</th>
                            <th className={`border-b border-r border-emerald-700 py-1 px-0.5 w-[46px] text-center text-[9px] font-medium ${m.tipo === 'cualitativa' ? 'bg-blue-900 text-blue-300' : 'bg-emerald-900 text-emerald-300'}`}>3er</th>
                            <th className={`border-b border-r border-emerald-700 py-1 px-0.5 w-[46px] text-center text-[9px] font-bold ${m.tipo === 'cualitativa' ? 'bg-blue-900 text-blue-200' : 'bg-emerald-900 text-emerald-200'}`}>DEF</th>
                          </React.Fragment>
                        ))}

                        {/* REV. sub-columns (una por materia, separadas del grupo de materias) */}
                        {materias.map((m) => (
                          <th
                            key={`rev-sub-${m.nombre}`}
                            className={`border-b border-l border-r border-purple-700 py-1 px-0.5 w-[42px] text-center text-[8px] font-bold ${m.tipo === 'cualitativa' ? 'bg-purple-900 text-purple-200' : 'bg-purple-900 text-purple-200'}`}
                            title={`Rev. ${m.nombre}`}
                          >
                            {m.nombre.substring(0, 3).toUpperCase()}
                          </th>
                        ))}

                        {/* GRUPO sub-columns */}
                        <th className="bg-slate-800 text-slate-300 border-b border-l border-r border-slate-600 py-1 px-0.5 w-[52px] text-center text-[9px] font-medium">G1</th>
                        <th className="bg-slate-800 text-slate-300 border-b border-r border-slate-600 py-1 px-0.5 w-[52px] text-center text-[9px] font-medium">G2</th>
                        <th className="bg-slate-800 text-slate-300 border-b border-r border-slate-600 py-1 px-0.5 w-[52px] text-center text-[9px] font-medium">G3</th>
                        <th className="bg-slate-800 text-slate-200 border-b border-r border-slate-600 py-1 px-0.5 w-[52px] text-center text-[9px] font-bold">G4</th>

                        {/* PROM sub-columns */}
                        <th className="bg-slate-700 text-slate-300 border-b border-l border-r border-slate-500 py-1 px-0.5 w-[50px] text-center text-[9px] font-medium">P1</th>
                        <th className="bg-slate-700 text-slate-300 border-b border-r border-slate-500 py-1 px-0.5 w-[50px] text-center text-[9px] font-medium">P2</th>
                        <th className="bg-slate-700 text-slate-300 border-b border-r border-slate-500 py-1 px-0.5 w-[50px] text-center text-[9px] font-medium">P3</th>
                        <th className="bg-slate-700 text-slate-200 border-b border-r border-slate-500 py-1 px-0.5 w-[50px] text-center text-[9px] font-bold">P4</th>

                        {/* Bio sub-headers */}
                        <th className="bg-stone-800 text-stone-300 border-b border-l border-r border-stone-600 py-1 px-1" />
                        <th className="bg-stone-800 text-stone-300 border-b border-l border-r border-stone-600 py-1 px-1" />
                        <th className="bg-stone-800 text-stone-300 border-b border-l border-r border-stone-600 py-1 px-1" />

                        {/* MATERIA PENDIENTE sub-columns */}
                        <th className="bg-red-900 text-red-300 border-b border-l border-r border-red-700 py-1 px-0.5 w-[65px] text-center text-[8px] font-medium">MP1</th>
                        <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">1M</th>
                        <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">2M</th>
                        <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">3M</th>
                        <th className="bg-red-900 text-red-200 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-bold">4M</th>
                        <th className="bg-red-900 text-red-300 border-b border-l border-r border-red-700 py-1 px-0.5 w-[65px] text-center text-[8px] font-medium">MP2</th>
                        <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">1M</th>
                        <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">2M</th>
                        <th className="bg-red-900 text-red-300 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-medium">3M</th>
                        <th className="bg-red-900 text-red-200 border-b border-r border-red-700 py-1 px-0.5 w-[35px] text-center text-[8px] font-bold">4M</th>

                        {/* OBS sub-headers */}
                        <th className="bg-amber-900 text-amber-300 border-b border-l border-r border-amber-700 py-1 px-1" />
                        <th className="bg-amber-900 text-amber-300 border-b border-l border-r border-amber-700 py-1 px-1" />
                      </tr>
                    </thead>

                    <tbody>
                      {students.map((student, studentIdx) => {
                        const studentNotas = notasMap[student.id] || {}
                        const studentExtras = extrasMap[student.id] || emptyExtras()

                        return (
                          <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                            {/* Fixed identity columns */}
                            <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-0.5 py-1 text-center text-[10px]">
                              <Link
                                href={`/boletin-calificaciones?studentId=${student.id}&anioEscolar=${encodeURIComponent(anioEscolar)}&grado=${encodeURIComponent(grado)}&seccion=${encodeURIComponent(seccion)}`}
                                className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-emerald-100 text-emerald-700 transition"
                                title="Ver Boletín"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                            <td className="sticky left-[28px] z-10 bg-white border-b border-r border-gray-200 px-1.5 py-1 text-center text-muted-foreground font-mono text-[10px]">
                              {studentIdx + 1}
                            </td>
                            <td className="sticky left-[56px] z-10 bg-white border-b border-r border-gray-200 px-2 py-1 font-mono text-[10px] whitespace-nowrap">
                              {formatCedulaFinal(student.cedula)}
                            </td>
                            <td className="sticky left-[151px] z-10 bg-white border-b border-r border-gray-200 px-2 py-1 font-medium whitespace-nowrap text-[10px]">
                              {student.apellidos}, {student.nombres}
                            </td>
                            <td className="sticky left-[321px] z-10 bg-white border-b border-r border-gray-200 px-1.5 py-1 text-center font-semibold text-[10px]">
                              {student.seccion || seccion}
                            </td>

                            {/* Subject nota cells (1er, 2do, 3er, DEF — sin REV) */}
                            {materias.map((m, materiaIdx) => {
                              const notas = studentNotas[m.nombre] || { lapso1: '', lapso2: '', lapso3: '', revision: '' }
                              const def = calcDef(m, notas.lapso1, notas.lapso2, notas.lapso3)
                              const lapsoKeys = ['lapso1', 'lapso2', 'lapso3'] as const
                              const isCualitativa = m.tipo === 'cualitativa'

                              return (
                                <React.Fragment key={`${student.id}-${m.nombre}`}>
                                  {lapsoKeys.map((lapso, lapsoIdx) => {
                                    const val = notas[lapso]
                                    return (
                                      <td
                                        key={`${student.id}-${m.nombre}-${lapso}`}
                                        className={`border-b border-r border-gray-200 py-0 px-0 ${isCualitativa ? 'bg-blue-50/30' : getNotaBgClass(val)}`}
                                      >
                                        <input
                                          id={`nota-${studentIdx}-${materiaIdx}-${lapsoIdx}`}
                                          type="text"
                                          value={val}
                                          onChange={(e) => updateNota(student.id, m.nombre, lapso, isCualitativa ? e.target.value.toUpperCase() : e.target.value.toUpperCase())}
                                          onKeyDown={(e) => handleKeyDown(e, studentIdx, materiaIdx, lapsoIdx)}
                                          className={`h-7 w-full text-center text-[10px] border-0 bg-transparent focus:outline-none focus:ring-2 ${isCualitativa ? 'focus:ring-blue-400' : 'focus:ring-emerald-500'} rounded ${isCualitativa ? 'text-blue-700 font-medium' : getNotaColorClass(val)}`}
                                          maxLength={isCualitativa ? 12 : 3}
                                        />
                                      </td>
                                    )
                                  })}
                                  {/* Definitiva */}
                                  <td className={`border-b border-r border-gray-200 py-1 px-0.5 text-center font-bold text-[10px] ${isCualitativa ? (def ? 'text-blue-700 bg-blue-50/50' : 'text-muted-foreground') : getNotaColorClass(def) + ' ' + getNotaBgClass(def)}`}>
                                    {def || '—'}
                                  </td>
                                </React.Fragment>
                              )
                            })}

                            {/* REV. cells — grupo separado después de todas las materias */}
                            {materias.map((m) => {
                              const notas = studentNotas[m.nombre] || { lapso1: '', lapso2: '', lapso3: '', revision: '' }
                              const isCualitativa = m.tipo === 'cualitativa'
                              return (
                                <td
                                  key={`rev-${student.id}-${m.nombre}`}
                                  className={`border-b border-r border-gray-200 py-0 px-0 bg-purple-50/40`}
                                >
                                  <input
                                    type="text"
                                    value={notas.revision || ''}
                                    onChange={(e) => updateRevision(student.id, m.nombre, e.target.value.toUpperCase())}
                                    className="h-7 w-full text-center text-[10px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 rounded text-purple-600 font-medium"
                                    placeholder="—"
                                    maxLength={3}
                                  />
                                </td>
                              )
                            })}

                            {/* GRUPO cells (editable) */}
                            {(['grupo1', 'grupo2', 'grupo3', 'grupo4'] as const).map((gKey) => {
                              const val = studentExtras[gKey] || ''
                              return (
                                <td key={`${student.id}-${gKey}`} className="border-b border-r border-gray-200 py-0 px-0 bg-slate-50/50">
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={(e) => updateExtraField(student.id, gKey, e.target.value.toUpperCase())}
                                    className="h-7 w-full text-center text-[10px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-slate-400 rounded text-slate-600 font-medium"
                                    placeholder="—"
                                    maxLength={12}
                                  />
                                </td>
                              )
                            })}

                            {/* PROM cells (calculated) */}
                            {[1, 2, 3, 4].map((lapsoNum) => {
                              const prom = calcProm(materias, studentNotas, lapsoNum)
                              const n = parseFloat(prom.replace(',', '.'))
                              const promColor = !prom ? 'text-muted-foreground' : n >= 18 ? 'text-emerald-700 font-bold' : n >= 15 ? 'text-amber-600 font-semibold' : n >= 12 ? 'text-orange-500 font-medium' : n > 0 ? 'text-red-600 font-bold' : 'text-muted-foreground'
                              return (
                                <td key={`${student.id}-prom${lapsoNum}`} className="border-b border-r border-gray-200 py-1 px-0.5 text-center text-[10px] bg-slate-50/30">
                                  <span className={promColor}>{prom || '—'}</span>
                                </td>
                              )
                            })}

                            {/* FN - Fecha de Nacimiento */}
                            <td className="border-b border-r border-gray-200 py-1 px-1 text-center text-[9px] text-muted-foreground bg-stone-50/50 whitespace-nowrap">
                              {student.fechaNacimiento || '—'}
                            </td>

                            {/* LN - Lugar de Nacimiento (municipio) */}
                            <td className="border-b border-r border-gray-200 py-1 px-1 text-center text-[9px] text-muted-foreground bg-stone-50/50 whitespace-nowrap max-w-[80px] truncate" title={student.municipio}>
                              {student.municipio || '—'}
                            </td>

                            {/* EN - Entidad Federal (estado) */}
                            <td className="border-b border-r border-gray-200 py-1 px-1 text-center text-[9px] text-muted-foreground bg-stone-50/50 whitespace-nowrap">
                              {student.estado || '—'}
                            </td>

                            {/* MATERIA PENDIENTE: MP1 + momentos */}
                            <td className="border-b border-r border-gray-200 py-0 px-0 bg-red-50/40">
                              <input
                                type="text"
                                value={studentExtras.materiaPendiente1 || ''}
                                onChange={(e) => updateExtraField(student.id, 'materiaPendiente1', e.target.value)}
                                className="h-7 w-full text-left text-[8px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-0.5 text-stone-600"
                                placeholder="—"
                                maxLength={25}
                              />
                            </td>
                            {(['mp1m1', 'mp1m2', 'mp1m3', 'mp1m4'] as const).map((key) => (
                              <td key={`${student.id}-${key}`} className="border-b border-r border-gray-200 py-0 px-0 bg-red-50/30">
                                <input
                                  type="text"
                                  value={studentExtras[key] || ''}
                                  onChange={(e) => updateExtraField(student.id, key, e.target.value)}
                                  className="h-7 w-full text-center text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-400 rounded text-stone-600"
                                  placeholder="—"
                                  maxLength={3}
                                />
                              </td>
                            ))}

                            {/* MATERIA PENDIENTE: MP2 + momentos */}
                            <td className="border-b border-r border-gray-200 py-0 px-0 bg-red-50/40">
                              <input
                                type="text"
                                value={studentExtras.materiaPendiente2 || ''}
                                onChange={(e) => updateExtraField(student.id, 'materiaPendiente2', e.target.value)}
                                className="h-7 w-full text-left text-[8px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-0.5 text-stone-600"
                                placeholder="—"
                                maxLength={25}
                              />
                            </td>
                            {(['mp2m1', 'mp2m2', 'mp2m3', 'mp2m4'] as const).map((key) => (
                              <td key={`${student.id}-${key}`} className="border-b border-r border-gray-200 py-0 px-0 bg-red-50/30">
                                <input
                                  type="text"
                                  value={studentExtras[key] || ''}
                                  onChange={(e) => updateExtraField(student.id, key, e.target.value)}
                                  className="h-7 w-full text-center text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-400 rounded text-stone-600"
                                  placeholder="—"
                                  maxLength={3}
                                />
                              </td>
                            ))}

                            {/* OBS - Observaciones (editable) */}
                            <td className="border-b border-r border-gray-200 py-0 px-0 bg-amber-50/30">
                              <input
                                type="text"
                                value={studentExtras.observacion || ''}
                                onChange={(e) => updateExtraField(student.id, 'observacion', e.target.value)}
                                className="h-7 w-full text-left text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1 text-stone-600"
                                placeholder="—"
                                maxLength={100}
                              />
                            </td>

                            {/* OBSBOLETIN - Observación del Boletín (editable) */}
                            <td className="border-b border-r border-gray-200 py-0 px-0 bg-amber-50/30">
                              <input
                                type="text"
                                value={studentExtras.obsBoletin || ''}
                                onChange={(e) => updateExtraField(student.id, 'obsBoletin', e.target.value)}
                                className="h-7 w-full text-left text-[9px] border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1 text-stone-600"
                                placeholder="—"
                                maxLength={100}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
