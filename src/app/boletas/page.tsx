'use client'

import React, { useState, useCallback, useRef } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table2, Save, Printer, Search, Loader2, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { planEMG, formatCedulaFinal, type PlanAnio, type MateriaAnio } from '@/lib/school-config'

// ── Types ──────────────────────────────────────────────────────────────
interface StudentNota {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  seccion: string
  boletaNotas: BoletaNotaRecord[]
}

interface BoletaNotaRecord {
  id: string
  studentId: string
  materia: string
  lapso1: string | null
  lapso2: string | null
  lapso3: string | null
}

// Local editable structure: studentId → materia → { lapso1, lapso2, lapso3 }
type NotasMap = Record<string, Record<string, { lapso1: string; lapso2: string; lapso3: string }>>

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

function calcDef(l1: string, l2: string, l3: string): string {
  const vals = [l1, l2, l3]
  // If any is IN or PE, definitive is IN or PE
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
      const params = new URLSearchParams({
        anioEscolar,
        grado,
        seccion,
      })
      const res = await fetch(`/api/boletas?${params}`)
      if (!res.ok) throw new Error('Error en la búsqueda')
      const data = await res.json()
      const loaded: StudentNota[] = data.students || []

      setStudents(loaded)

      // Build notasMap from loaded data
      const map: NotasMap = {}
      for (const s of loaded) {
        map[s.id] = {}
        for (const m of getMateriasForGrado(grado)) {
          const nota = s.boletaNotas?.find((n: BoletaNotaRecord) => n.materia === m.nombre)
          map[s.id][m.nombre] = {
            lapso1: nota?.lapso1 || '',
            lapso2: nota?.lapso2 || '',
            lapso3: nota?.lapso3 || '',
          }
        }
      }
      setNotasMap(map)
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
      const current = { ...(studentNotas[materia] || { lapso1: '', lapso2: '', lapso3: '' }) }
      current[lapso] = value
      studentNotas[materia] = current
      copy[studentId] = studentNotas
      return copy
    })
  }, [])

  // ── Save all notas ────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (students.length === 0) return
    setSaving(true)
    try {
      const notasPayload: { studentId: string; materia: string; lapso1: string; lapso2: string; lapso3: string }[] = []

      for (const student of students) {
        for (const m of materias) {
          const n = notasMap[student.id]?.[m.nombre]
          if (n) {
            notasPayload.push({
              studentId: student.id,
              materia: m.nombre,
              lapso1: n.lapso1 || '',
              lapso2: n.lapso2 || '',
              lapso3: n.lapso3 || '',
            })
          } else {
            // Create empty record for all students so they are included in the boleta
            notasPayload.push({
              studentId: student.id,
              materia: m.nombre,
              lapso1: '',
              lapso2: '',
              lapso3: '',
            })
          }
        }
      }

      const res = await fetch('/api/boletas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anioEscolar,
          grado,
          seccion,
          notas: notasPayload,
        }),
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
  }, [students, notasMap, materias, anioEscolar, grado, seccion, toast])

  // ── Handle Tab key navigation in inputs ──────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, studentIdx: number, materiaIdx: number, lapsoIdx: number) => {
    if (e.key === 'Tab') {
      // Let default Tab work - browser handles focus movement
      return
    }
    // Arrow keys for navigation
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
    if (el) {
      el.focus()
      el.select()
    }
  }, [students.length, materias.length])

  // ── Get grado label ──────────────────────────────────────────────────
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
              Registro masivo de notas por lapso — Plan EMG
            </p>
          </div>
          {students.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {students.length} alumno{students.length !== 1 ? 's' : ''} cargado{students.length !== 1 ? 's' : ''}
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

        {/* Empty state - before search */}
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

        {/* No results state */}
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
                  en el año escolar {anioEscolar}. Verifique que las notas hayan sido ingresadas
                  previamente o que los filtros sean correctos.
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
                      <><Save className="h-4 w-4 mr-2" /> Guardar Notas</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" />
                    Exportar a PDF
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
                <div ref={tableRef} className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        {/* Fixed columns header */}
                        <th
                          className="sticky left-0 z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-2 py-2 text-center font-semibold w-8"
                        >
                          Nº
                        </th>
                        <th
                          className="sticky left-[32px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-2 py-2 text-left font-semibold min-w-[100px]"
                        >
                          Cédula
                        </th>
                        <th
                          className="sticky left-[132px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-3 py-2 text-left font-semibold min-w-[180px]"
                        >
                          Apellidos y Nombres
                        </th>
                        <th
                          className="sticky left-[312px] z-20 bg-emerald-800 text-white border-b border-r border-emerald-700 px-2 py-2 text-center font-semibold w-10"
                        >
                          Sec.
                        </th>

                        {/* Subject columns */}
                        {materias.map((m) => (
                          <th
                            key={m.nombre}
                            colSpan={4}
                            className="bg-emerald-700 text-white border-b border-l border-emerald-600 px-1 py-2 text-center font-semibold"
                          >
                            <span className="block truncate max-w-[140px]" title={m.nombre}>
                              {m.nombre}
                            </span>
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {/* Fixed columns sub-header */}
                        <th className="sticky left-0 z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-2" />
                        <th className="sticky left-[32px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-2" />
                        <th className="sticky left-[132px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-3" />
                        <th className="sticky left-[312px] z-20 bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-2" />

                        {/* Subject sub-columns */}
                        {materias.map((m) => (
                          <React.Fragment key={`sub-${m.nombre}`}>
                            <th className="bg-emerald-900 text-emerald-300 border-b border-l border-r border-emerald-700 py-1 px-1 w-[48px] text-center text-[10px] font-medium">
                              L1
                            </th>
                            <th className="bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-1 w-[48px] text-center text-[10px] font-medium">
                              L2
                            </th>
                            <th className="bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-1 w-[48px] text-center text-[10px] font-medium">
                              L3
                            </th>
                            <th className="bg-emerald-900 text-emerald-300 border-b border-r border-emerald-700 py-1 px-1 w-[48px] text-center text-[10px] font-bold">
                              DEF
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, studentIdx) => (
                        <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                          {/* Fixed columns data */}
                          <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-2 py-1.5 text-center text-muted-foreground font-mono">
                            {studentIdx + 1}
                          </td>
                          <td className="sticky left-[32px] z-10 bg-white border-b border-r border-gray-200 px-2 py-1.5 font-mono text-[11px]">
                            {formatCedulaFinal(student.cedula)}
                          </td>
                          <td className="sticky left-[132px] z-10 bg-white border-b border-r border-gray-200 px-3 py-1.5 font-medium whitespace-nowrap text-[11px]">
                            {student.apellidos}, {student.nombres}
                          </td>
                          <td className="sticky left-[312px] z-10 bg-white border-b border-r border-gray-200 px-2 py-1.5 text-center font-semibold text-[11px]">
                            {student.seccion || seccion}
                          </td>

                          {/* Subject nota cells */}
                          {materias.map((m, materiaIdx) => {
                            const notas = notasMap[student.id]?.[m.nombre] || { lapso1: '', lapso2: '', lapso3: '' }
                            const def = calcDef(notas.lapso1, notas.lapso2, notas.lapso3)
                            const lapsoKeys = ['lapso1', 'lapso2', 'lapso3'] as const

                            return (
                              <React.Fragment key={`${student.id}-${m.nombre}`}>
                                {lapsoKeys.map((lapso, lapsoIdx) => {
                                  const val = notas[lapso]
                                  return (
                                    <td
                                      key={`${student.id}-${m.nombre}-${lapso}`}
                                      className={`border-b border-r border-gray-200 py-0 px-0.5 ${getNotaBgClass(val)}`}
                                    >
                                      <input
                                        id={`nota-${studentIdx}-${materiaIdx}-${lapsoIdx}`}
                                        type="text"
                                        value={val}
                                        onChange={(e) => updateNota(student.id, m.nombre, lapso, e.target.value.toUpperCase())}
                                        onKeyDown={(e) => handleKeyDown(e, studentIdx, materiaIdx, lapsoIdx)}
                                        className={`h-7 w-12 text-center text-xs border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded ${getNotaColorClass(val)}`}
                                        maxLength={3}
                                      />
                                    </td>
                                  )
                                })}
                                {/* Definitiva */}
                                <td
                                  className={`border-b border-r border-gray-200 py-1.5 px-1 text-center font-bold ${getNotaColorClass(def)} ${getNotaBgClass(def)}`}
                                >
                                  {def || '—'}
                                </td>
                              </React.Fragment>
                            )
                          })}
                        </tr>
                      ))}
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
