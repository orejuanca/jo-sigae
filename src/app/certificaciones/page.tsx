'use client'

import { useState, useCallback } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StudentSearch } from '@/components/student-search'
import { FileText, Printer, Loader2, Eye, Database, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { schoolConfig, planEMG, notaToLiteral, tiposEvaluacion } from '@/lib/school-config'
import type { PlanAnio } from '@/lib/school-config'

// === INTERFACES ===

interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  fechaNacimiento?: string | null
  pais?: string | null
  estado?: string | null
  municipio?: string | null
  plan?: string | null
}

interface Certification {
  id: string
  tipo: string
  numero: string
  datos: string
  fechaEmision: string
  studentId: string
}

interface CalificacionRow {
  materia: string
  numero: number
  nota: string
  literal: string
  tipoEvaluacion: string
  fechaMes: string
  fechaAnio: string
}

interface InstitucionEducativa {
  numero: number
  denominacion: string
  localidad: string
  ef: string
}

interface OrientationRow {
  anio: string
  literal: string
}

interface GrupoRow {
  anio: string
  grupo: string
  literal: string
}

interface CertData {
  lugar: string
  fechaExpedicion: string
  planEstudio: string
  od: string
  denominacion: string
  direccion: string
  telefono: string
  municipio: string
  estado: string
  cdcce: string
  estudiante: {
    cedula: string
    fechaNacimiento: string
    apellidos: string
    nombres: string
    pais: string
    estado: string
    municipio: string
  }
  instituciones: InstitucionEducativa[]
  calificaciones: Record<string, CalificacionRow[]>
  orientacion: OrientationRow[]
  grupos: GrupoRow[]
  observaciones: string
  promedioAcumulado: string
  director: { apellidosNombres: string; cedula: string }
  directorCdcce: { apellidosNombres: string; cedula: string }
  acta?: string
  actaFecha?: string
  aniosEscolares?: string[]
  planTipo?: string
}

// === HELPERS ===

function getActivePlan(planTipo?: string): PlanAnio[] {
  return planTipo === 'derogado'
    ? [
        { anio: 'Primer Año', materias: [
          { nombre: 'Castellano y Literatura', numero: 1 }, { nombre: 'Inglés', numero: 2 },
          { nombre: 'Matemáticas', numero: 3 }, { nombre: 'Historia de Venezuela', numero: 4 },
          { nombre: 'Geografía de Venezuela', numero: 5 }, { nombre: 'Ciencias Biológicas', numero: 6 },
          { nombre: 'Física', numero: 7 }, { nombre: 'Química', numero: 8 },
          { nombre: 'Educación Física', numero: 9 }, { nombre: 'Educación para el Trabajo', numero: 10 },
        ]},
        { anio: 'Segundo Año', materias: [
          { nombre: 'Castellano y Literatura', numero: 1 }, { nombre: 'Inglés', numero: 2 },
          { nombre: 'Matemáticas', numero: 3 }, { nombre: 'Historia de Venezuela', numero: 4 },
          { nombre: 'Geografía de Venezuela', numero: 5 }, { nombre: 'Ciencias Biológicas', numero: 6 },
          { nombre: 'Física', numero: 7 }, { nombre: 'Química', numero: 8 },
          { nombre: 'Educación Física', numero: 9 }, { nombre: 'Educación para el Trabajo', numero: 10 },
        ]},
        { anio: 'Tercer Año', materias: [
          { nombre: 'Castellano y Literatura', numero: 1 }, { nombre: 'Inglés', numero: 2 },
          { nombre: 'Matemáticas', numero: 3 }, { nombre: 'Historia de Venezuela', numero: 4 },
          { nombre: 'Geografía de Venezuela', numero: 5 }, { nombre: 'Ciencias Biológicas', numero: 6 },
          { nombre: 'Física', numero: 7 }, { nombre: 'Química', numero: 8 },
          { nombre: 'Educación Física', numero: 9 }, { nombre: 'Educación para el Trabajo', numero: 10 },
        ]},
        { anio: 'Cuarto Año', materias: [
          { nombre: 'Castellano y Literatura', numero: 1 }, { nombre: 'Inglés', numero: 2 },
          { nombre: 'Matemáticas', numero: 3 }, { nombre: 'Historia de Venezuela', numero: 4 },
          { nombre: 'Geografía de Venezuela', numero: 5 }, { nombre: 'Ciencias Biológicas', numero: 6 },
          { nombre: 'Física', numero: 7 }, { nombre: 'Química', numero: 8 },
          { nombre: 'Educación Física', numero: 9 }, { nombre: 'Educación para el Trabajo', numero: 10 },
        ]},
        { anio: 'Quinto Año', materias: [
          { nombre: 'Castellano y Literatura', numero: 1 }, { nombre: 'Inglés', numero: 2 },
          { nombre: 'Matemáticas', numero: 3 }, { nombre: 'Historia de Venezuela', numero: 4 },
          { nombre: 'Geografía de Venezuela', numero: 5 }, { nombre: 'Ciencias Biológicas', numero: 6 },
          { nombre: 'Física', numero: 7 }, { nombre: 'Química', numero: 8 },
          { nombre: 'Educación Física', numero: 9 }, { nombre: 'Educación para el Trabajo', numero: 10 },
        ]},
      ]
    : planEMG
}

const emptyCertData = (planTipo?: string): CertData => {
  const activePlan = getActivePlan(planTipo)
  const calificaciones: Record<string, CalificacionRow[]> = {}
  activePlan.forEach(plan => {
    calificaciones[plan.anio] = plan.materias.map(m => ({
      materia: m.nombre, numero: m.numero, nota: '', literal: '',
      tipoEvaluacion: 'EF', fechaMes: '', fechaAnio: '',
    }))
  })

  return {
    lugar: schoolConfig.estado,
    fechaExpedicion: new Date().toLocaleDateString('es-VE'),
    planEstudio: planTipo === 'derogado'
      ? 'EDUCACIÓN MEDIA GENERAL (PLAN DEROGADO)'
      : schoolConfig.planEstudio,
    od: schoolConfig.od,
    denominacion: schoolConfig.nombreCompleto,
    direccion: schoolConfig.direccion,
    telefono: schoolConfig.telefono,
    municipio: schoolConfig.municipio,
    estado: schoolConfig.estado,
    cdcce: schoolConfig.cdcceEstado,
    estudiante: { cedula: '', fechaNacimiento: '', apellidos: '', nombres: '', pais: 'VENEZUELA', estado: '', municipio: '' },
    instituciones: Array.from({ length: 5 }, (_, i) => ({ numero: i + 1, denominacion: '', localidad: '', ef: '' })),
    calificaciones,
    orientacion: Array.from({ length: 5 }, () => ({ anio: '', literal: '' })),
    grupos: Array.from({ length: 5 }, () => ({ anio: '', grupo: '', literal: '' })),
    observaciones: '',
    promedioAcumulado: '',
    director: { apellidosNombres: schoolConfig.director.apellidosNombres, cedula: schoolConfig.director.cedula },
    directorCdcce: { apellidosNombres: schoolConfig.directorCdcce.apellidosNombres, cedula: schoolConfig.directorCdcce.cedula },
  }
}

// === MAIN COMPONENT ===

export default function CertificacionesPage() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [previewCert, setPreviewCert] = useState<Certification | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('calificaciones')
  const { toast } = useToast()

  const [certData, setCertData] = useState<CertData>(emptyCertData())
  const [loadedData, setLoadedData] = useState<CertData | null>(null)

  // Plan activo basado en los datos cargados
  const activePlan = getActivePlan(certData.planTipo)

  // Fetch historial de certificaciones del estudiante
  const fetchCertifications = async (studentId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/certifications/${studentId}`)
      if (!res.ok) { setCertifications([]); return }
      const data = await res.json()
      setCertifications(Array.isArray(data) ? data.filter((c: Certification) => c.tipo === 'CERTIFICACION_CALIFICACIONES') : [])
    } catch { setCertifications([]) }
    finally { setLoading(false) }
  }

  // Cargar datos de calificaciones del rawData del estudiante
  const fetchCertDataFromDB = async (student: Student) => {
    setLoadingData(true)
    setDataLoaded(false)
    try {
      const res = await fetch(`/api/students/${student.id}/cert-data`)
      if (!res.ok) {
        toast({ title: 'Sin datos de calificaciones', description: 'No se encontraron datos en la base de datos para este alumno.', variant: 'destructive' })
        setLoadingData(false)
        return
      }
      const result = await res.json()

      if (result.certData) {
        // Si el estudiante tiene rawData parseado, usar esos datos
        setCertData(result.certData as CertData)
        setDataLoaded(true)

        const planLabel = result.certData.planTipo === 'derogado' ? 'Plan Derogado (BD2)' : 'Plan Vigente (BD)'
        const gradeCount = Object.values(result.certData.calificaciones || {})
          .flat()
          .filter((c: CalificacionRow) => c.nota && c.nota !== '').length

        toast({
          title: `Datos cargados — ${planLabel}`,
          description: `Se cargaron ${gradeCount} calificaciones del rawData. Verifica y edita los datos en las pestañas.`,
        })
        setActiveTab('calificaciones')
      }
    } catch (err) {
      console.error('Error fetching cert data:', err)
      toast({ title: 'Error', description: 'Error al cargar datos de calificaciones', variant: 'destructive' })
    } finally {
      setLoadingData(false)
    }
  }

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    setPreviewCert(null)
    setLoadedData(null)
    setDataLoaded(false)
    fetchCertifications(student.id)

    // Iniciar con datos vacíos pero del plan correcto
    const data = emptyCertData(student.plan === 'derogado' ? 'derogado' : 'vigente')
    data.estudiante = {
      cedula: student.cedula,
      fechaNacimiento: student.fechaNacimiento || '',
      apellidos: student.apellidos,
      nombres: student.nombres,
      pais: student.pais || 'VENEZUELA',
      estado: student.estado || '',
      municipio: student.municipio || '',
    }
    data.planTipo = student.plan === 'derogado' ? 'derogado' : 'vigente'
    setCertData(data)

    // Auto-cargar datos de rawData
    fetchCertDataFromDB(student)
  }

  const updateNota = (anio: string, matIndex: number, field: keyof CalificacionRow, value: string) => {
    setCertData(prev => {
      const updated = { ...prev }
      updated.calificaciones = { ...prev.calificaciones }
      updated.calificaciones[anio] = [...prev.calificaciones[anio]]
      updated.calificaciones[anio][matIndex] = { ...updated.calificaciones[anio][matIndex], [field]: value }
      if (field === 'nota' && value) {
        const num = parseFloat(value)
        if (!isNaN(num)) updated.calificaciones[anio][matIndex].literal = notaToLiteral(num)
      }
      return updated
    })
  }

  const updateInstitucion = (index: number, field: keyof InstitucionEducativa, value: string) => {
    setCertData(prev => {
      const updated = { ...prev }
      updated.instituciones = [...prev.instituciones]
      updated.instituciones[index] = { ...updated.instituciones[index], [field]: value }
      return updated
    })
  }

  const updateOrientacion = (index: number, field: keyof OrientationRow, value: string) => {
    setCertData(prev => {
      const updated = { ...prev }
      updated.orientacion = [...prev.orientacion]
      updated.orientacion[index] = { ...updated.orientacion[index], [field]: value }
      return updated
    })
  }

  const updateGrupo = (index: number, field: keyof GrupoRow, value: string) => {
    setCertData(prev => {
      const updated = { ...prev }
      updated.grupos = [...prev.grupos]
      updated.grupos[index] = { ...updated.grupos[index], [field]: value }
      return updated
    })
  }

  const handleGenerate = async () => {
    if (!selectedStudent) return
    setGenerating(true)
    try {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'CERTIFICACION_CALIFICACIONES', studentId: selectedStudent.id, datos: certData }),
      })
      if (!res.ok) throw new Error('Error al generar')
      const cert = await res.json()
      setPreviewCert(cert)
      setCertifications(prev => [cert, ...prev])
      setActiveTab('vista')
      toast({ title: 'Certificación de Calificaciones Generada', description: `Numero: ${cert.numero}` })
    } catch {
      toast({ title: 'Error', description: 'Error al generar certificación', variant: 'destructive' })
    } finally { setGenerating(false) }
  }

  const handleViewCert = (cert: Certification) => {
    try {
      const data = JSON.parse(cert.datos || '{}')
      setLoadedData(data)
      setPreviewCert(cert)
      setActiveTab('vista')
    } catch {
      toast({ title: 'Error', description: 'Error al cargar datos de certificación', variant: 'destructive' })
    }
  }

  const displayData = previewCert && loadedData ? loadedData : certData

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) }
    catch { return dateStr }
  }

  const getNotaColor = (nota: string) => {
    const n = parseFloat(nota)
    if (isNaN(n) || nota === '') return ''
    if (n >= 18) return 'text-emerald-600 font-bold'
    if (n >= 15) return 'text-blue-600 font-medium'
    if (n >= 12) return 'text-amber-600'
    if (n >= 10) return 'text-orange-600'
    return 'text-red-600 font-bold'
  }

  const countGrades = () => {
    return Object.values(certData.calificaciones).flat().filter(c => c.nota && c.nota !== '' && c.nota !== 'PE').length
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Certificación de Calificaciones</h1>
          <p className="text-muted-foreground">Generar Certificación de Calificaciones — BD (Plan Vigente) y BD2 (Planes Derogados)</p>
        </div>

        {/* Buscar Alumno */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Buscar Alumno</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentSearch onSelect={handleSelectStudent} placeholder="Buscar alumno por cédula, apellidos o nombres (BD y BD2)..." />
          </CardContent>
        </Card>

        {selectedStudent && (
          <>
            {/* Info del estudiante + historial */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">{selectedStudent.apellidos}, {selectedStudent.nombres}</CardTitle>
                    <p className="text-sm text-muted-foreground">C.I.: {selectedStudent.cedula}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={selectedStudent.plan === 'derogado' ? 'destructive' : 'default'}>
                      {selectedStudent.plan === 'derogado' ? 'BD2 — Plan Derogado' : 'BD — Plan Vigente'}
                    </Badge>
                    {dataLoaded && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <Database className="h-3 w-3 mr-1" /> {countGrades()} calificaciones cargadas
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
                {!loading && certifications.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay certificaciones de calificaciones para este alumno</p>
                )}
                {!loading && certifications.length > 0 && (
                  <div className="space-y-2">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{cert.numero}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(cert.fechaEmision)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleViewCert(cert)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loading indicator for rawData parsing */}
            {loadingData && (
              <Card>
                <CardContent className="py-6">
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Extrayendo calificaciones del rawData...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs principales */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="datos">Datos</TabsTrigger>
                <TabsTrigger value="instituciones">Instituciones</TabsTrigger>
                <TabsTrigger value="calificaciones">
                  Calificaciones {dataLoaded && <span className="ml-1 text-emerald-600">({countGrades()})</span>}
                </TabsTrigger>
                <TabsTrigger value="adicional">Adicional</TabsTrigger>
                <TabsTrigger value="vista">Vista Previa</TabsTrigger>
                <TabsTrigger value="generar">
                  <Loader2 className={`h-3.5 w-3.5 mr-1 ${generating ? 'animate-spin' : 'hidden'}`} />
                  Generar
                </TabsTrigger>
              </TabsList>

              {/* TAB: Datos del estudiante e institución */}
              <TabsContent value="datos">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">I. Datos de la Institución y Estudiante</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="grid gap-2">
                        <Label>Lugar de Expedición</Label>
                        <Input value={certData.lugar} onChange={(e) => setCertData(prev => ({ ...prev, lugar: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Fecha de Expedición</Label>
                        <Input type="date" value={certData.fechaExpedicion} onChange={(e) => setCertData(prev => ({ ...prev, fechaExpedicion: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Código OD</Label>
                        <Input value={certData.od} onChange={(e) => setCertData(prev => ({ ...prev, od: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Plan de Estudio</Label>
                        <Input value={certData.planEstudio} onChange={(e) => setCertData(prev => ({ ...prev, planEstudio: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Denominación y Epónimo</Label>
                        <Input value={certData.denominacion} onChange={(e) => setCertData(prev => ({ ...prev, denominacion: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Teléfono</Label>
                        <Input value={certData.telefono} onChange={(e) => setCertData(prev => ({ ...prev, telefono: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Dirección</Label>
                        <Input value={certData.direccion} onChange={(e) => setCertData(prev => ({ ...prev, direccion: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Municipio</Label>
                        <Input value={certData.municipio} onChange={(e) => setCertData(prev => ({ ...prev, municipio: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Estado / CDCCE</Label>
                        <Input value={certData.estado} onChange={(e) => setCertData(prev => ({ ...prev, estado: e.target.value, cdcce: e.target.value }))} />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-4">III. Datos del Estudiante</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="grid gap-2"><Label>Cédula de Identificación</Label><Input value={certData.estudiante.cedula} onChange={(e) => setCertData(prev => ({ ...prev, estudiante: { ...prev.estudiante, cedula: e.target.value } }))} /></div>
                        <div className="grid gap-2"><Label>Fecha de Nacimiento</Label><Input value={certData.estudiante.fechaNacimiento} onChange={(e) => setCertData(prev => ({ ...prev, estudiante: { ...prev.estudiante, fechaNacimiento: e.target.value } }))} placeholder="dd/mm/aaaa" /></div>
                        <div className="grid gap-2"><Label>Apellidos</Label><Input value={certData.estudiante.apellidos} onChange={(e) => setCertData(prev => ({ ...prev, estudiante: { ...prev.estudiante, apellidos: e.target.value } }))} /></div>
                        <div className="grid gap-2"><Label>Nombres</Label><Input value={certData.estudiante.nombres} onChange={(e) => setCertData(prev => ({ ...prev, estudiante: { ...prev.estudiante, nombres: e.target.value } }))} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="grid gap-2"><Label>País</Label><Input value={certData.estudiante.pais} onChange={(e) => setCertData(prev => ({ ...prev, estudiante: { ...prev.estudiante, pais: e.target.value } }))} /></div>
                        <div className="grid gap-2"><Label>Estado</Label><Input value={certData.estudiante.estado} onChange={(e) => setCertData(prev => ({ ...prev, estudiante: { ...prev.estudiante, estado: e.target.value } }))} /></div>
                        <div className="grid gap-2"><Label>Municipio</Label><Input value={certData.estudiante.municipio} onChange={(e) => setCertData(prev => ({ ...prev, estudiante: { ...prev.estudiante, municipio: e.target.value } }))} /></div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-4">VII. Director(a) de la Institución</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Apellidos y Nombres</Label><Input value={certData.director.apellidosNombres} onChange={(e) => setCertData(prev => ({ ...prev, director: { ...prev.director, apellidosNombres: e.target.value } }))} /></div>
                        <div className="grid gap-2"><Label>Cédula de Identidad</Label><Input value={certData.director.cedula} onChange={(e) => setCertData(prev => ({ ...prev, director: { ...prev.director, cedula: e.target.value } }))} /></div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-4">VIII. Director(a) del CDCCE</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Apellidos y Nombres</Label><Input value={certData.directorCdcce.apellidosNombres} onChange={(e) => setCertData(prev => ({ ...prev, directorCdcce: { ...prev.directorCdcce, apellidosNombres: e.target.value } }))} /></div>
                        <div className="grid gap-2"><Label>Cédula de Identidad</Label><Input value={certData.directorCdcce.cedula} onChange={(e) => setCertData(prev => ({ ...prev, directorCdcce: { ...prev.directorCdcce, cedula: e.target.value } }))} /></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: Instituciones Educativas */}
              <TabsContent value="instituciones">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">IV. Instituciones Educativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b-2">
                            <th className="text-center py-2 px-3 w-12">N°</th>
                            <th className="text-left py-2 px-3">Denominación y Epónimo</th>
                            <th className="text-left py-2 px-3">Localidad</th>
                            <th className="text-center py-2 px-3 w-16">E.F.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {certData.instituciones.map((inst, i) => (
                            <tr key={i} className="border-b">
                              <td className="text-center py-2 px-3">{inst.numero}</td>
                              <td className="py-2 px-3"><Input className="h-8" value={inst.denominacion} onChange={(e) => updateInstitucion(i, 'denominacion', e.target.value)} placeholder="Nombre de la institución" /></td>
                              <td className="py-2 px-3"><Input className="h-8" value={inst.localidad} onChange={(e) => updateInstitucion(i, 'localidad', e.target.value)} placeholder="Localidad" /></td>
                              <td className="py-2 px-3"><Input className="h-8 text-center" value={inst.ef} onChange={(e) => updateInstitucion(i, 'ef', e.target.value)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: Calificaciones por año — TAB PRINCIPAL */}
              <TabsContent value="calificaciones">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">V. Plan de Estudio — Calificaciones por Año</CardTitle>
                      {certData.acta && (
                        <Badge variant="outline" className="text-xs">
                          Acta: {certData.acta} {certData.actaFecha && `| ${certData.actaFecha}`}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {activePlan.map((plan, planIdx) => {
                      const grades = certData.calificaciones[plan.anio] || []
                      const hasGrades = grades.some(g => g.nota && g.nota !== '')
                      const yearLabel = certData.aniosEscolares?.[planIdx] || ''

                      return (
                        <div key={plan.anio} className={`border rounded-lg p-4 ${hasGrades ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-sm text-emerald-700">{plan.anio}</h4>
                            <div className="flex gap-2">
                              {yearLabel && <Badge variant="outline" className="text-xs">{yearLabel}</Badge>}
                              {hasGrades && <Badge variant="default" className="text-xs bg-emerald-600">{grades.filter(g => g.nota).length} materias</Badge>}
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b-2 bg-muted/50">
                                  <th className="text-center py-2 px-1 w-8">N°</th>
                                  <th className="text-left py-2 px-1 min-w-[180px]">Área de Formación</th>
                                  <th className="text-center py-2 px-1 w-14">NOTA</th>
                                  <th className="text-center py-2 px-1 w-12">LETRAS</th>
                                  <th className="text-center py-2 px-1 w-12">T-E</th>
                                  <th className="text-center py-2 px-1 w-14">MES</th>
                                  <th className="text-center py-2 px-1 w-16">AÑO</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grades.map((cal, idx) => (
                                  <tr key={idx} className={`border-b ${cal.nota ? 'bg-white' : 'bg-gray-50/50'}`}>
                                    <td className="text-center py-1 px-1 text-xs">{cal.numero}</td>
                                    <td className="py-1 px-1 text-xs font-medium">{cal.materia}</td>
                                    <td className="py-1 px-1">
                                      <Input
                                        type="number" min="0" max="20" step="0.01"
                                        className="h-7 text-center text-xs w-14 mx-auto"
                                        value={cal.nota}
                                        onChange={(e) => updateNota(plan.anio, idx, 'nota', e.target.value)}
                                      />
                                    </td>
                                    <td className={`text-center py-1 px-1 font-bold text-xs ${getNotaColor(cal.nota)}`}>
                                      {cal.literal || '—'}
                                    </td>
                                    <td className="py-1 px-1">
                                      <Input
                                        className="h-7 text-center text-xs w-12 mx-auto"
                                        value={cal.tipoEvaluacion}
                                        onChange={(e) => updateNota(plan.anio, idx, 'tipoEvaluacion', e.target.value)}
                                        maxLength={2}
                                      />
                                    </td>
                                    <td className="py-1 px-1">
                                      <Input
                                        className="h-7 text-center text-xs w-14 mx-auto"
                                        value={cal.fechaMes}
                                        onChange={(e) => updateNota(plan.anio, idx, 'fechaMes', e.target.value)}
                                        placeholder="MM"
                                      />
                                    </td>
                                    <td className="py-1 px-1">
                                      <Input
                                        className="h-7 text-center text-xs w-16 mx-auto"
                                        value={cal.fechaAnio}
                                        onChange={(e) => updateNota(plan.anio, idx, 'fechaAnio', e.target.value)}
                                        placeholder="AAAA"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: Secciones adicionales */}
              <TabsContent value="adicional">
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Orientación y Convivencia</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b-2 bg-muted/50">
                              <th className="text-center py-2 px-3 w-10">N°</th>
                              <th className="text-center py-2 px-3">AÑO</th>
                              <th className="text-center py-2 px-3">LITERAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {certData.orientacion.map((row, i) => (
                              <tr key={i} className="border-b">
                                <td className="text-center py-1 px-3">{i + 1}</td>
                                <td className="py-1 px-3"><Input className="h-7 text-center text-xs w-20 mx-auto" value={row.anio} onChange={(e) => updateOrientacion(i, 'anio', e.target.value)} /></td>
                                <td className="py-1 px-3"><Input className="h-7 text-center text-xs w-16 mx-auto" value={row.literal} onChange={(e) => updateOrientacion(i, 'literal', e.target.value)} maxLength={1} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Participación en Grupos de Creación, Recreación y Producción</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b-2 bg-muted/50">
                              <th className="text-center py-2 px-3 w-10">N°</th>
                              <th className="text-center py-2 px-3">AÑO</th>
                              <th className="text-center py-2 px-3">GRUPO</th>
                              <th className="text-center py-2 px-3">LITERAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {certData.grupos.map((row, i) => (
                              <tr key={i} className="border-b">
                                <td className="text-center py-1 px-3">{i + 1}</td>
                                <td className="py-1 px-3"><Input className="h-7 text-center text-xs w-20 mx-auto" value={row.anio} onChange={(e) => updateGrupo(i, 'anio', e.target.value)} /></td>
                                <td className="py-1 px-3"><Input className="h-7 text-center text-xs w-28 mx-auto" value={row.grupo} onChange={(e) => updateGrupo(i, 'grupo', e.target.value)} /></td>
                                <td className="py-1 px-3"><Input className="h-7 text-center text-xs w-16 mx-auto" value={row.literal} onChange={(e) => updateGrupo(i, 'literal', e.target.value)} maxLength={2} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">VI. Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {certData.observaciones && (
                        <div className="bg-muted/50 p-3 rounded-lg text-sm">
                          <Label className="text-xs text-muted-foreground">Observaciones cargadas del rawData:</Label>
                          <p className="mt-1 text-xs leading-relaxed">{certData.observaciones}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>P.A. (Promedio Acumulado) / Acta</Label>
                          <Input value={certData.promedioAcumulado} onChange={(e) => setCertData(prev => ({ ...prev, promedioAcumulado: e.target.value }))} placeholder="Ej: Acta AA 7379891" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Observaciones adicionales</Label>
                          <Input value={certData.observaciones} onChange={(e) => setCertData(prev => ({ ...prev, observaciones: e.target.value }))} placeholder="Observaciones adicionales" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* TAB: Vista Previa del documento oficial */}
              <TabsContent value="vista">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Vista Previa — Documento Oficial</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-black p-6 bg-white text-black rounded-sm max-w-4xl mx-auto text-[10px] leading-tight" id="cert-preview" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {/* ENCABEZADO */}
                      <div className="text-center space-y-1 mb-3">
                        <p className="font-bold text-xs uppercase">Gobierno Bolivariano de Venezuela</p>
                        <p className="font-bold text-xs uppercase">Ministerio del Poder Popular para la Educación</p>
                      </div>
                      <div className="text-center my-3">
                        <h2 className="font-bold text-sm uppercase">
                          Certificación de Calificaciones {certData.planTipo === 'derogado' ? '(Plan Derogado)' : 'EMG'}
                        </h2>
                        <div className="w-24 h-px bg-black mx-auto mt-1" />
                      </div>

                      {/* SECCIÓN I */}
                      <div className="mb-3">
                        <p className="font-bold text-[9px] mb-1">I. Plan de Estudio: {displayData.planEstudio}</p>
                        <div className="flex flex-wrap gap-4 text-[9px]">
                          <span><strong>Lugar y Fecha:</strong> {displayData.lugar}, {displayData.fechaExpedicion}</span>
                          <span><strong>Código:</strong> {schoolConfig.planCodigo}</span>
                        </div>
                      </div>

                      {/* SECCIÓN II */}
                      <div className="mb-3 border-t border-black pt-2">
                        <p className="font-bold text-[9px] mb-1">II. Institución Emisora</p>
                        <div className="grid grid-cols-2 gap-1 text-[9px]">
                          <span><strong>Código:</strong> {displayData.od}</span>
                          <span><strong>Teléfono:</strong> {displayData.telefono}</span>
                          <span className="col-span-2"><strong>Denominación:</strong> {displayData.denominacion}</span>
                          <span className="col-span-2"><strong>Dirección:</strong> {displayData.direccion}</span>
                          <span><strong>Municipio:</strong> {displayData.municipio}</span>
                          <span><strong>Estado:</strong> {displayData.estado}</span>
                          <span><strong>CDCCE:</strong> {displayData.cdcce}</span>
                        </div>
                      </div>

                      {/* SECCIÓN III */}
                      <div className="mb-3 border-t border-black pt-2">
                        <p className="font-bold text-[9px] mb-1">III. Datos del Estudiante</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[9px]">
                          <span><strong>Cédula:</strong> {displayData.estudiante.cedula}</span>
                          <span><strong>Fecha de Nacimiento:</strong> {displayData.estudiante.fechaNacimiento || '—'}</span>
                          <span><strong>País:</strong> {displayData.estudiante.pais}</span>
                          <span><strong>Apellidos:</strong> {displayData.estudiante.apellidos}</span>
                          <span><strong>Nombres:</strong> {displayData.estudiante.nombres}</span>
                          <span><strong>Estado:</strong> {displayData.estudiante.estado || '—'}</span>
                          <span><strong>Municipio:</strong> {displayData.estudiante.municipio || '—'}</span>
                        </div>
                      </div>

                      {/* SECCIÓN IV */}
                      <div className="mb-3 border-t border-black pt-2">
                        <p className="font-bold text-[9px] mb-1">IV. Instituciones Educativas</p>
                        <table className="w-full border-collapse text-[9px]">
                          <thead>
                            <tr className="border border-black">
                              <th className="border border-black p-1 w-8">N°</th>
                              <th className="border border-black p-1">Denominación y Epónimo</th>
                              <th className="border border-black p-1">Localidad</th>
                              <th className="border border-black p-1 w-10">E.F.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayData.instituciones.map((inst, i) => (
                              <tr key={i} className="border border-black">
                                <td className="border border-black p-1 text-center">{inst.numero}</td>
                                <td className="border border-black p-1">{inst.denominacion || '—'}</td>
                                <td className="border border-black p-1">{inst.localidad || '—'}</td>
                                <td className="border border-black p-1 text-center">{inst.ef || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* SECCIÓN V: Calificaciones */}
                      <div className="mb-3 border-t border-black pt-2">
                        <p className="font-bold text-[9px] mb-2">V. Plan de Estudio</p>
                        {activePlan.map((plan, planIdx) => {
                          const grades = displayData.calificaciones[plan.anio] || []
                          const yearLabel = displayData.aniosEscolares?.[planIdx] || ''
                          return (
                            <div key={plan.anio} className="mb-3">
                              <p className="font-semibold text-[9px] mb-1 text-center">
                                {plan.anio} {yearLabel && <span className="font-normal">({yearLabel})</span>}
                              </p>
                              <table className="w-full border-collapse text-[8px]">
                                <thead>
                                  <tr className="border border-black bg-gray-100">
                                    <th className="border border-black p-0.5 w-6">N°</th>
                                    <th className="border border-black p-0.5 text-left">Área de Formación</th>
                                    <th className="border border-black p-0.5 w-12">LETRAS</th>
                                    <th className="border border-black p-0.5 w-10">T-E</th>
                                    <th className="border border-black p-0.5 w-10">MES</th>
                                    <th className="border border-black p-0.5 w-10">AÑO</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {grades.map((cal, idx) => (
                                    <tr key={idx} className="border border-black">
                                      <td className="border border-black p-0.5 text-center">{cal.numero}</td>
                                      <td className="border border-black p-0.5">{cal.materia}</td>
                                      <td className={`border border-black p-0.5 text-center font-bold ${getNotaColor(cal.nota)}`}>{cal.literal || '—'}</td>
                                      <td className="border border-black p-0.5 text-center">{cal.tipoEvaluacion || '—'}</td>
                                      <td className="border border-black p-0.5 text-center">{cal.fechaMes || '—'}</td>
                                      <td className="border border-black p-0.5 text-center">{cal.fechaAnio || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        })}

                        {/* Orientación y Convivencia */}
                        <div className="mt-2">
                          <p className="text-[8px] font-semibold mb-1">Orientación y Convivencia</p>
                          <table className="w-full border-collapse text-[8px]">
                            <thead>
                              <tr className="border border-black bg-gray-100">
                                <th className="border border-black p-0.5 w-6">N°</th>
                                <th className="border border-black p-0.5">AÑO</th>
                                <th className="border border-black p-0.5">LITERAL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayData.orientacion.map((row, i) => (
                                <tr key={i} className="border border-black">
                                  <td className="border border-black p-0.5 text-center">{i + 1}</td>
                                  <td className="border border-black p-0.5 text-center">{row.anio || '—'}</td>
                                  <td className="border border-black p-0.5 text-center">{row.literal || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Participación en Grupos */}
                        <div className="mt-2">
                          <p className="text-[8px] font-semibold mb-1">Participación en Grupos de Creación, Recreación y Producción</p>
                          <table className="w-full border-collapse text-[8px]">
                            <thead>
                              <tr className="border border-black bg-gray-100">
                                <th className="border border-black p-0.5 w-6">N°</th>
                                <th className="border border-black p-0.5">AÑO</th>
                                <th className="border border-black p-0.5">GRUPO</th>
                                <th className="border border-black p-0.5">LITERAL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayData.grupos.map((row, i) => (
                                <tr key={i} className="border border-black">
                                  <td className="border border-black p-0.5 text-center">{i + 1}</td>
                                  <td className="border border-black p-0.5 text-center">{row.anio || '—'}</td>
                                  <td className="border border-black p-0.5 text-center">{row.grupo || '—'}</td>
                                  <td className="border border-black p-0.5 text-center">{row.literal || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* SECCIÓN VI: Observaciones */}
                      <div className="mb-3 border-t border-black pt-2">
                        <p className="font-bold text-[9px] mb-1">VI. Observaciones</p>
                        <div className="grid grid-cols-2 gap-1 text-[9px]">
                          <span><strong>P.A.:</strong> {displayData.promedioAcumulado || '—'}</span>
                          <span>{displayData.observaciones || '—'}</span>
                        </div>
                      </div>

                      {/* SECCIÓN VII: Director */}
                      <div className="mb-3 border-t border-black pt-2">
                        <p className="font-bold text-[9px] mb-1">VII. Institución Educativa</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[9px]">
                          <div>
                            <p><strong>Director(a):</strong></p>
                            <p>Apellidos y Nombres: {displayData.director.apellidosNombres || '—'}</p>
                            <p>Cédula de Identidad: {displayData.director.cedula || '—'}</p>
                          </div>
                          <div className="text-center">
                            <div className="border-b border-black w-48 mx-auto mb-1" style={{ height: '40px' }}></div>
                            <p className="text-[8px]">Firma</p>
                            <p className="text-[8px] italic">Para efectos de su Validez Nacional</p>
                            <div className="mt-2 border border-dashed border-gray-400 w-20 h-20 mx-auto flex items-center justify-center text-[7px] text-gray-400">Sello</div>
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN VIII: CDCCE */}
                      <div className="mb-3 border-t border-black pt-2">
                        <p className="font-bold text-[9px] mb-1">VIII. Centro de Desarrollo de la Calidad Educativa Estatal</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[9px]">
                          <div>
                            <p><strong>Director(a):</strong></p>
                            <p>Apellidos y Nombres: {displayData.directorCdcce.apellidosNombres || '—'}</p>
                            <p>Cédula de Identidad: {displayData.directorCdcce.cedula || '—'}</p>
                          </div>
                          <div className="text-center">
                            <div className="border-b border-black w-48 mx-auto mb-1" style={{ height: '40px' }}></div>
                            <p className="text-[8px]">Firma</p>
                            <p className="text-[8px] italic">Para efectos de su Validez Internacional</p>
                            <div className="mt-2 border border-dashed border-gray-400 w-20 h-20 mx-auto flex items-center justify-center text-[7px] text-gray-400">Sello CDCCE</div>
                          </div>
                        </div>
                      </div>

                      {/* VALOR FISCAL */}
                      <div className="border-t-2 border-black pt-2 mt-4">
                        <p className="text-[8px] text-center font-semibold">{schoolConfig.valorFiscalTexto}</p>
                      </div>

                      {previewCert && (
                        <div className="text-right mt-2 text-[8px]">
                          <p><strong>Número:</strong> {previewCert.numero}</p>
                          <p><strong>Fecha de Emisión:</strong> {formatDate(previewCert.fechaEmision)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: Generar */}
              <TabsContent value="generar">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Generar Certificación de Calificaciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                      <p><strong>Estudiante:</strong> {selectedStudent.apellidos}, {selectedStudent.nombres}</p>
                      <p><strong>C.I.:</strong> {selectedStudent.cedula}</p>
                      <p><strong>Plan:</strong> {certData.planEstudio}</p>
                      <p><strong>Calificaciones cargadas:</strong> {countGrades()}</p>
                      {certData.acta && <p><strong>Acta:</strong> {certData.acta}</p>}
                    </div>

                    {countGrades() === 0 && (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Sin calificaciones</p>
                          <p className="text-xs text-amber-600 mt-1">
                            No se encontraron calificaciones en el rawData de este alumno. Puedes ingresar las notas manualmente en la pestaña de Calificaciones antes de generar la certificación.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button onClick={() => setActiveTab('vista')} variant="outline">
                        <Eye className="h-4 w-4 mr-2" /> Ver Vista Previa Primero
                      </Button>
                      <Button onClick={handleGenerate} disabled={generating}>
                        {generating ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                        ) : (
                          <><FileText className="h-4 w-4 mr-2" /> Generar Certificación de Calificaciones</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppShell>
  )
}
