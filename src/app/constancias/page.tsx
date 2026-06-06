'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StudentSearch } from '@/components/student-search'
import { ScrollText, Printer, Loader2, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  fechaNacimiento?: string | null
  pais?: string | null
}

interface Certification {
  id: string
  tipo: string
  numero: string
  datos: string | null
  emitidoEl: string
  studentId: string
}

export default function ConstanciasPage() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [previewCert, setPreviewCert] = useState<Certification | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  const fetchCertifications = async (studentId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/certifications/${studentId}`)
      const data = await res.json()
      setCertifications(data.filter((c: Certification) => c.tipo === 'CONSTANCIA') || [])
    } catch {
      setCertifications([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    setPreviewCert(null)
    fetchCertifications(student.id)
  }

  const handleGenerate = async () => {
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
          fechaNacimiento: selectedStudent.fechaNacimiento,
        },
      }

      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'CONSTANCIA',
          studentId: selectedStudent.id,
          datos,
        }),
      })

      if (!res.ok) throw new Error('Error al generar')
      const cert = await res.json()
      setPreviewCert(cert)
      setCertifications(prev => [cert, ...prev])
      toast({ title: 'Constancia Generada', description: `Número: ${cert.numero}` })
    } catch {
      toast({ title: 'Error', description: 'Error al generar constancia', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const certData = previewCert ? JSON.parse(previewCert.datos || '{}') : null

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Constancias de Egreso</h1>
          <p className="text-muted-foreground">Generar Constancia de Egreso — Código EMG 31059</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Buscar Alumno</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentSearch onSelect={handleSelectStudent} placeholder="Buscar alumno por cédula, apellidos o nombres..." />
          </CardContent>
        </Card>

        {selectedStudent && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{selectedStudent.apellidos}, {selectedStudent.nombres}</CardTitle>
                  <p className="text-sm text-muted-foreground">C.I.: {selectedStudent.cedula}</p>
                </div>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                  ) : (
                    <><ScrollText className="h-4 w-4 mr-2" /> Generar Constancia</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              )}
              {!loading && certifications.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay constancias para este alumno</p>
              )}
              {!loading && certifications.length > 0 && (
                <div className="space-y-2">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ScrollText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{cert.numero}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(cert.emitidoEl)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setPreviewCert(cert)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {previewCert && certData && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Vista Previa</CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border p-8 bg-white text-black rounded-lg max-w-3xl mx-auto print:shadow-none" id="const-preview">
                <div className="text-center space-y-2 mb-8">
                  <h2 className="text-lg font-bold uppercase">República Bolivariana de Venezuela</h2>
                  <h2 className="text-lg font-bold uppercase">Ministerio del Poder Popular para la Educación</h2>
                  <h1 className="text-xl font-bold text-primary mt-4">{certData.escuela}</h1>
                  <p className="text-sm">Código: {certData.codigo} | OD: {certData.od}</p>
                  <p className="text-xs">{certData.direccion}</p>
                </div>

                <div className="text-center my-8">
                  <h3 className="text-lg font-semibold uppercase">Constancia de Egreso</h3>
                  <div className="w-32 h-0.5 bg-primary mx-auto mt-2" />
                </div>

                <div className="space-y-4 text-justify mx-auto max-w-xl">
                  <p className="text-sm leading-relaxed">
                    Por medio de la presente se hace constar que el(la) ciudadano(a):
                  </p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-lg my-6 max-w-lg mx-auto text-center">
                  <p className="font-bold text-lg">{certData.estudiante.nombres} {certData.estudiante.apellidos}</p>
                  <p className="text-sm">Cédula de Identidad: {certData.estudiante.cedula}</p>
                  <p className="text-sm">Fecha de Nacimiento: {certData.estudiante.fechaNacimiento || 'No registrada'}</p>
                </div>

                <div className="space-y-4 text-justify mx-auto max-w-xl">
                  <p className="text-sm leading-relaxed">
                    Culminó satisfactoriamente sus estudios en esta institución educativa <strong>{certData.escuela}</strong>,
                    código <strong>{certData.codigo}</strong>, por lo que se extiende la presente constancia a los fines
                    consiguientes.
                  </p>
                </div>

                <div className="text-right mt-12 space-y-2">
                  <p className="text-sm font-medium">Número: {previewCert.numero}</p>
                  <p className="text-sm">Fecha de Emisión: {formatDate(previewCert.emitidoEl)}</p>
                  <div className="mt-8 border-b border-black w-64 ml-auto" />
                  <p className="text-sm font-medium">Dirección(a)</p>
                  <p className="text-xs">{certData.escuela}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
