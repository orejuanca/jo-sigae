'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StudentSearch } from '@/components/student-search'
import { BookOpen, Printer, Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  fechaNacimiento?: string | null
  pais?: string | null
}

const materias = [
  'Castellano y Literatura',
  'Matemáticas',
  'Ciencias de la Naturaleza',
  'Ciencias Sociales',
  'Educación Física',
  'Inglés',
  'Artes y Cultura',
  'Tecnología',
]

interface Calificacion {
  materia: string
  lapso1: string
  lapso2: string
  lapso3: string
  definitiva: string
}

export default function BoletinPage() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([])
  const [grado, setGrado] = useState('6to Grado')
  const [seccion, setSeccion] = useState('A')
  const [periodo, setPeriodo] = useState('2024-2025')
  const [generating, setGenerating] = useState(false)
  const [saved, setSaved] = useState(false)
  const { toast } = useToast()

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    setSaved(false)
    setCalificaciones(
      materias.map(m => ({ materia: m, lapso1: '', lapso2: '', lapso3: '', definitiva: '' }))
    )
  }

  const updateCalificacion = (index: number, field: keyof Calificacion, value: string) => {
    setCalificaciones(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Auto-calc definitive
      const l1 = parseFloat(updated[index].lapso1) || 0
      const l2 = parseFloat(updated[index].lapso2) || 0
      const l3 = parseFloat(updated[index].lapso3) || 0
      const total = l1 + l2 + l3
      updated[index].definitiva = total > 0 ? (total / 3).toFixed(2) : ''
      return updated
    })
  }

  const handleSave = async () => {
    if (!selectedStudent) return
    setGenerating(true)
    try {
      const datos = {
        escuela: 'U.E.N. Creación Cúa',
        codigo: 'EMG 31059',
        od: 'OD16751520',
        direccion: 'Urb. José de S. Martín — Sector Los Bloques — Nueva Cúa, Municipio Rafael Urdaneta, Miranda',
        estudiante: {
          cedula: selectedStudent.cedula,
          apellidos: selectedStudent.apellidos,
          nombres: selectedStudent.nombres,
        },
        grado,
        seccion,
        periodo,
        calificaciones,
      }

      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'BOLETIN',
          studentId: selectedStudent.id,
          datos,
        }),
      })

      if (!res.ok) throw new Error('Error al guardar')
      setSaved(true)
      toast({ title: 'Boletín Guardado', description: 'Se ha guardado el boletín de calificaciones' })
    } catch {
      toast({ title: 'Error', description: 'Error al guardar boletín', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const getNotaColor = (nota: string) => {
    const n = parseFloat(nota)
    if (isNaN(n) || nota === '') return ''
    if (n >= 20) return 'text-emerald-600 font-bold'
    if (n >= 15) return 'text-blue-600 font-medium'
    if (n >= 10) return 'text-amber-600'
    return 'text-red-600 font-bold'
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Boletín de Calificaciones</h1>
          <p className="text-muted-foreground">Registro y emisión de boletines — EMG 31059</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Buscar Alumno</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentSearch onSelect={handleSelectStudent} placeholder="Buscar alumno por cédula, apellidos o nombres..." />
          </CardContent>
        </Card>

        {selectedStudent && calificaciones.length > 0 && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{selectedStudent.apellidos}, {selectedStudent.nombres} — C.I.: {selectedStudent.cedula}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="grid gap-2">
                    <Label>Grado</Label>
                    <Input value={grado} onChange={(e) => setGrado(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Sección</Label>
                    <Input value={seccion} onChange={(e) => setSeccion(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Período Escolar</Label>
                    <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Materia</th>
                        <th className="text-center py-2 px-2 w-20">Lapso 1</th>
                        <th className="text-center py-2 px-2 w-20">Lapso 2</th>
                        <th className="text-center py-2 px-2 w-20">Lapso 3</th>
                        <th className="text-center py-2 px-2 w-20 font-bold">Definitiva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calificaciones.map((cal, index) => (
                        <tr key={cal.materia} className="border-b">
                          <td className="py-2 px-2 font-medium">{cal.materia}</td>
                          <td className="py-2 px-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              step="0.01"
                              className="text-center h-8 w-16 mx-auto"
                              value={cal.lapso1}
                              onChange={(e) => updateCalificacion(index, 'lapso1', e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              step="0.01"
                              className="text-center h-8 w-16 mx-auto"
                              value={cal.lapso2}
                              onChange={(e) => updateCalificacion(index, 'lapso2', e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              step="0.01"
                              className="text-center h-8 w-16 mx-auto"
                              value={cal.lapso3}
                              onChange={(e) => updateCalificacion(index, 'lapso3', e.target.value)}
                            />
                          </td>
                          <td className={`py-2 px-2 text-center ${getNotaColor(cal.definitiva)}`}>
                            {cal.definitiva || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSave} disabled={generating}>
                    {generating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" /> Guardar Boletín</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" /> Imprimir
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Boletín de Calificaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border p-8 bg-white text-black rounded-lg max-w-3xl mx-auto print:shadow-none" id="boletin-preview">
                  <div className="text-center space-y-1 mb-6">
                    <h2 className="text-base font-bold uppercase">República Bolivariana de Venezuela</h2>
                    <h2 className="text-base font-bold uppercase">Ministerio del Poder Popular para la Educación</h2>
                    <h1 className="text-lg font-bold text-primary mt-2">U.E.N. Creación Cúa</h1>
                    <p className="text-xs">Código EMG 31059 | OD16751520</p>
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-sm font-semibold uppercase">Boletín de Calificaciones — Período {periodo}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="font-medium">Estudiante:</span> {selectedStudent.nombres} {selectedStudent.apellidos}</div>
                    <div><span className="font-medium">C.I.:</span> {selectedStudent.cedula}</div>
                    <div><span className="font-medium">Grado:</span> {grado} — Sección {seccion}</div>
                  </div>

                  <table className="w-full text-xs border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-emerald-100">
                        <th className="border border-gray-400 p-1 text-left">Materia</th>
                        <th className="border border-gray-400 p-1 text-center">L1</th>
                        <th className="border border-gray-400 p-1 text-center">L2</th>
                        <th className="border border-gray-400 p-1 text-center">L3</th>
                        <th className="border border-gray-400 p-1 text-center font-bold">Def.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calificaciones.map((cal) => (
                        <tr key={cal.materia}>
                          <td className="border border-gray-400 p-1">{cal.materia}</td>
                          <td className={`border border-gray-400 p-1 text-center ${getNotaColor(cal.lapso1)}`}>{cal.lapso1 || '—'}</td>
                          <td className={`border border-gray-400 p-1 text-center ${getNotaColor(cal.lapso2)}`}>{cal.lapso2 || '—'}</td>
                          <td className={`border border-gray-400 p-1 text-center ${getNotaColor(cal.lapso3)}`}>{cal.lapso3 || '—'}</td>
                          <td className={`border border-gray-400 p-1 text-center font-bold ${getNotaColor(cal.definitiva)}`}>{cal.definitiva || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="grid grid-cols-2 gap-16 mt-8 text-xs">
                    <div className="text-center">
                      <div className="border-b border-black w-48 mx-auto mb-1" />
                      <p className="font-medium">Prof. Tutor(a)</p>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-black w-48 mx-auto mb-1" />
                      <p className="font-medium">Dirección(a)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
