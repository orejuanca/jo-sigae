'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StudentSearch } from '@/components/student-search'
import { Award, Printer, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { schoolConfig, formatCedulaFinal } from '@/lib/school-config'

interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  fechaNacimiento?: string | null
  pais?: string | null
  estado?: string | null
  municipio?: string | null
}

export default function TitulosPage() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [grado, setGrado] = useState('5to Año')
  const [tituloObtenido, setTituloObtenido] = useState('Tecnico Medio en Ciencias')
  const [promedio, setPromedio] = useState('')
  const [fechaGraduacion, setFechaGraduacion] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [tituloNumero, setTituloNumero] = useState('')
  const { toast } = useToast()

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    setGenerated(false)
    setTituloNumero('')
  }

  const handleGenerate = async () => {
    if (!selectedStudent) return
    setGenerating(true)
    try {
      const datos = {
        escuela: schoolConfig.nombre,
        codigo: `EMG ${schoolConfig.planCodigo}`,
        od: schoolConfig.od,
        direccion: `${schoolConfig.direccion}, Municipio ${schoolConfig.municipio}, ${schoolConfig.estado}`,
        telefono: schoolConfig.telefono,
        municipio: schoolConfig.municipio,
        estado: schoolConfig.estado,
        planEstudio: schoolConfig.planEstudio,
        director: schoolConfig.director,
        estudiante: {
          cedula: formatCedulaFinal(selectedStudent.cedula),
          apellidos: selectedStudent.apellidos,
          nombres: selectedStudent.nombres,
          fechaNacimiento: selectedStudent.fechaNacimiento,
          pais: selectedStudent.pais || 'VENEZUELA',
          estado: selectedStudent.estado || '',
          municipio: selectedStudent.municipio || '',
        },
        grado,
        tituloObtenido,
        promedio: parseFloat(promedio) || 0,
        fechaGraduacion: fechaGraduacion || new Date().toISOString().split('T')[0],
      }

      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'TITULO', studentId: selectedStudent.id, datos }),
      })

      if (!res.ok) throw new Error('Error al generar')
      const cert = await res.json()
      setTituloNumero(cert.numero)
      setGenerated(true)
      toast({ title: 'Titulo Generado', description: `Numero: ${cert.numero}` })
    } catch {
      toast({ title: 'Error', description: 'Error al generar titulo', variant: 'destructive' })
    } finally { setGenerating(false) }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Titulos de Bachiller</h1>
          <p className="text-muted-foreground">Generar Titulo de Bachiller — Plan EMG {schoolConfig.planCodigo}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Buscar Alumno</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentSearch onSelect={handleSelectStudent} placeholder="Buscar alumno por cedula, apellidos o nombres..." />
          </CardContent>
        </Card>

        {selectedStudent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{selectedStudent.apellidos}, {selectedStudent.nombres}</CardTitle>
              <p className="text-sm text-muted-foreground">C.I.: {formatCedulaFinal(selectedStudent.cedula)}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Grado Cursado</Label>
                  <Input value={grado} onChange={(e) => setGrado(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Titulo Obtenido</Label>
                  <Input value={tituloObtenido} onChange={(e) => setTituloObtenido(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Promedio de Notas</Label>
                  <Input type="number" min="0" max="20" step="0.01" value={promedio} onChange={(e) => setPromedio(e.target.value)} placeholder="Ej: 16.50" />
                </div>
                <div className="grid gap-2">
                  <Label>Fecha de Graduacion</Label>
                  <Input type="date" value={fechaGraduacion} onChange={(e) => setFechaGraduacion(e.target.value)} />
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                ) : (
                  <><Award className="h-4 w-4 mr-2" /> Generar Titulo</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {generated && selectedStudent && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Vista Previa del Titulo</CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-4 border-emerald-600/30 p-8 bg-white text-black rounded-lg max-w-3xl mx-auto print:shadow-none" id="titulo-preview">
                <div className="text-center space-y-2 mb-6">
                  <h2 className="text-base font-bold uppercase">Gobierno Bolivariano de Venezuela</h2>
                  <h2 className="text-base font-bold uppercase">Ministerio del Poder Popular para la Educacion</h2>
                  <div className="w-full h-px bg-emerald-600 mt-2" />
                  <h1 className="text-xl font-bold text-emerald-700 mt-2">U.E.N. Creacion Cua</h1>
                  <p className="text-xs">Codigo EMG {schoolConfig.planCodigo} | {schoolConfig.od}</p>
                  <p className="text-xs">Municipio {schoolConfig.municipio}, {schoolConfig.estado}</p>
                  <div className="w-full h-px bg-emerald-600 mt-2" />
                </div>

                <div className="text-center my-8">
                  <h3 className="text-xl font-bold uppercase text-emerald-800">Titulo de Bachiller</h3>
                </div>

                <div className="text-center my-6 space-y-4">
                  <p className="text-sm">Se hace constar que el(la) ciudadano(a):</p>
                  <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-200 max-w-lg mx-auto">
                    <p className="text-xl font-bold">{selectedStudent.nombres} {selectedStudent.apellidos}</p>
                    <p className="text-sm mt-1">Cedula de Identidad: {formatCedulaFinal(selectedStudent.cedula)}</p>
                    {selectedStudent.fechaNacimiento && <p className="text-sm">Fecha de Nacimiento: {selectedStudent.fechaNacimiento}</p>}
                    {selectedStudent.estado && <p className="text-sm">Estado: {selectedStudent.estado}</p>}
                    {selectedStudent.municipio && <p className="text-sm">Municipio: {selectedStudent.municipio}</p>}
                  </div>
                  <p className="text-sm text-justify max-w-xl mx-auto">
                    Ha culminado satisfactoriamente el plan de estudios correspondiente al <strong>{grado}</strong> de
                    Educacion Media General en la <strong>U.E.N. Creacion Cua</strong>, Codigo EMG {schoolConfig.planCodigo},
                    haciendo acreedor(a) al titulo de:
                  </p>
                  <div className="bg-emerald-600 text-white p-3 rounded-lg inline-block">
                    <p className="font-bold text-lg">{tituloObtenido}</p>
                  </div>
                </div>

                {promedio && (
                  <div className="text-center mb-8">
                    <p className="text-sm">Promedio General: <strong>{promedio} / 20</strong></p>
                  </div>
                )}

                <div className="text-right mt-8 space-y-2">
                  <p className="text-sm font-medium">Titulo N: {tituloNumero}</p>
                  {fechaGraduacion && <p className="text-sm">Fecha: {fechaGraduacion}</p>}
                </div>

                <div className="grid grid-cols-2 gap-16 mt-12 text-xs">
                  <div className="text-center">
                    <div className="border-b border-black w-48 mx-auto mb-1" />
                    <p className="font-medium">{schoolConfig.director.apellidosNombres}</p>
                    <p className="text-xs">C.I.: {schoolConfig.director.cedula}</p>
                    <p className="text-xs">Direccion(a)</p>
                    <p className="text-xs">U.E.N. Creacion Cua</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-black w-48 mx-auto mb-1" />
                    <p className="font-medium">Ministerio de Educacion</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
