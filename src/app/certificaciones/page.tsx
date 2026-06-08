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
import { schoolConfig, planEMG, notaEnLetras, tiposEvaluacion, formatCedulaFinal } from '@/lib/school-config'
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
      tipoEvaluacion: '', fechaMes: '', fechaAnio: '',
    }))
  })

  return {
    lugar: schoolConfig.estado,
    fechaExpedicion: new Date().toISOString().split('T')[0], // YYYY-MM-DD para input type="date"
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
    planTipo: planTipo || 'vigente',
    aniosEscolares: [],
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
        const errorData = await res.json().catch(() => ({}))
        console.error('cert-data API error:', res.status, errorData)
        const reason = errorData.reason || ''
        const detailMsg = reason === 'empty_rawData'
          ? `El alumno ${student.cedula} no tiene rawData (datos de calificaciones) en la base de datos. Se requiere re-importar los datos.`
          : reason === 'parse_error'
            ? `Error al parsear rawData del alumno ${student.cedula} (longitud: ${errorData.rawDataLength || '?'}).`
            : `No se encontraron datos de calificaciones para ${student.cedula}.`
        toast({ title: 'Sin datos de calificaciones', description: detailMsg, variant: 'destructive' })
        setLoadingData(false)
        return
      }
      const result = await res.json()

      if (result.certData) {
        // Si el estudiante tiene rawData parseado, usar esos datos
        const cd = result.certData as CertData
        // Si la fecha de expedición está vacía, usar la fecha actual
        if (!cd.fechaExpedicion || cd.fechaExpedicion.trim() === '') {
          cd.fechaExpedicion = new Date().toISOString().split('T')[0]
        }
        // Si la fecha viene en DD/MM/YYYY, convertir a YYYY-MM-DD para el input
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cd.fechaExpedicion)) {
          const parts = cd.fechaExpedicion.split('/')
          cd.fechaExpedicion = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
        setCertData(cd)
        setDataLoaded(true)

        const planLabel = result.certData.planTipo === 'derogado' ? 'Plan Derogado (BD2)' : 'Plan Vigente (BD)'
        const gradeCount = result.gradeCount || Object.values(result.certData.calificaciones || {})
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
      toast({ title: 'Error', description: 'Error al cargar datos de calificaciones. Verifique su conexión e intente de nuevo.', variant: 'destructive' })
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

    // Normalizar fecha de nacimiento a DD/MM/YYYY
    const normalizeFecha = (f: string | null | undefined): string => {
      if (!f) return ''
      const trimmed = String(f).trim()
      if (!trimmed) return ''
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        const parts = trimmed.split('/')
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`
      }
      if (trimmed.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        try {
          const d = new Date(trimmed)
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0')
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const year = d.getFullYear()
            return `${day}/${month}/${year}`
          }
        } catch { /* ignore */ }
      }
      return trimmed
    }

    // Iniciar con datos vacíos pero del plan correcto
    const data = emptyCertData(student.plan === 'derogado' ? 'derogado' : 'vigente')
    data.estudiante = {
      cedula: formatCedulaFinal(student.cedula),
      fechaNacimiento: normalizeFecha(student.fechaNacimiento),
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
        updated.calificaciones[anio][matIndex].literal = notaEnLetras(value)
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
      // Corregir literales viejos: IN→INASISTENTE, PE→PENDIENTE
      if (data.calificaciones) {
        for (const anio of Object.keys(data.calificaciones)) {
          for (const cal of data.calificaciones[anio]) {
            if (cal.nota === 'IN' && cal.literal !== 'INASISTENTE') cal.literal = 'INASISTENTE'
            if (cal.nota === 'PE' && cal.literal !== 'PENDIENTE') cal.literal = 'PENDIENTE'
            // Si el literal está vacío pero la nota tiene valor, regenerar
            if (!cal.literal && cal.nota) cal.literal = notaEnLetras(cal.nota)
          }
        }
      }
      setLoadedData(data)
      setPreviewCert(cert)
      setActiveTab('vista')
    } catch {
      toast({ title: 'Error', description: 'Error al cargar datos de certificación', variant: 'destructive' })
    }
  }

  const displayData = previewCert && loadedData ? loadedData : certData

  // Convertir YYYY-MM-DD → DD/MM/YYYY para mostrar en la vista de impresión
  const displayFechaExpedicion = (() => {
    const f = displayData.fechaExpedicion
    if (!f) return new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
      const [y, m, d] = f.split('-')
      return `${d}/${m}/${y}`
    }
    return f
  })()

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

  // Helper styles for cert preview tables
  const tbS: React.CSSProperties = { borderCollapse: 'collapse', fontSize: '7pt', lineHeight: '1.3' }
  const bd: React.CSSProperties = { border: '1px solid #000', padding: '1px 2px' }
  const bdB: React.CSSProperties = { ...bd, fontWeight: 'bold' }
  const bdH: React.CSSProperties = { ...bd, fontWeight: 'bold', backgroundColor: '#f5f5f5' }
  const bdC: React.CSSProperties = { ...bd, textAlign: 'center' }
  const bdCh: React.CSSProperties = { ...bd, fontWeight: 'bold', backgroundColor: '#f0f0f0', textAlign: 'center', fontSize: '6pt' }

  // Render one half of a year table (left=A-M or right=O-AA), 13 cols each
  // Excel columns per half: A-D(4), E(1), F-I(4), J(1), K(1), L(1), M(1) = 13
  const renderYearHalf = (plan: PlanAnio, planIdx: number) => {
    const grades = displayData.calificaciones[plan.anio] || []
    const yearLabel = displayData.aniosEscolares?.[planIdx] || ''
    return (
      <table width="100%" cellPadding={1} cellSpacing={0} style={tbS}>
        <colgroup>
          <col style={{ width: '30%' }} />{/* A-D areas */}
          <col style={{ width: '6%' }} />{/* E nota */}
          <col style={{ width: '24%' }} />{/* F-I letras */}
          <col style={{ width: '6%' }} />{/* J T-E */}
          <col style={{ width: '8%' }} />{/* K mes */}
          <col style={{ width: '8%' }} />{/* L año */}
          <col style={{ width: '18%' }} />{/* M inst */}
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={13} style={{ ...bdH, textAlign: 'center' }}>{plan.anio.toUpperCase()}{yearLabel ? ` (${yearLabel})` : ''}</td>
          </tr>
          <tr>
            <td colSpan={4} rowSpan={2} style={bdCh}>ÁREAS DE FORMACIÓN</td>
            <td colSpan={5} style={bdCh}>CALIFICACIÓN</td>
            <td rowSpan={2} style={bdCh}>T-E</td>
            <td colSpan={2} style={bdCh}>FECHA</td>
            <td rowSpan={2} style={bdCh}>Inst. Educ.</td>
          </tr>
          <tr>
            <td style={bdCh}>N°</td>
            <td colSpan={4} style={bdCh}>LETRAS</td>
            <td style={bdCh}>Mes</td>
            <td style={bdCh}>Año</td>
          </tr>
          {grades.map((cal, idx) => (
            <tr key={idx}>
              <td colSpan={4} style={bd}>{cal.materia}</td>
              <td style={{ ...bdC, fontWeight: 'bold' }}>{cal.nota || ''}</td>
              <td colSpan={4} style={{ ...bdC }}>{cal.literal || ''}</td>
              <td style={bdC}>{cal.tipoEvaluacion || ''}</td>
              <td style={bdC}>{cal.fechaMes || ''}</td>
              <td style={bdC}>{cal.fechaAnio || ''}</td>
              <td style={{ ...bdC, fontSize: '5pt' }}>{displayData.denominacion || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
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
                    <p className="text-sm text-muted-foreground">C.I.: {formatCedulaFinal(selectedStudent.cedula)}</p>
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
                                        type="text"
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
                    <div className="border-2 border-black bg-white text-black mx-auto" id="cert-preview" style={{ fontFamily: 'Arial, sans-serif', fontSize: '7pt', lineHeight: '1.2', maxWidth: '210mm', padding: '4px' }}>

                      {/* ====== ENCABEZADO (Rows 1-3) ====== */}
                      {/* Excel: Row 1-3 cols A-L=logo, M1:AA1=title, M2:V2=plan, W2:AA2=codigo, M3:S3=lugar, T3:V3=comma, W3:AA3=fecha */}
                      <table width="100%" cellPadding={0} cellSpacing={0} style={{ ...tbS, tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '0' }}>
                        <colgroup>
                          <col style={{ width: '48%' }} />{/* A-L: logo */}
                          <col style={{ width: '34%' }} />{/* M-V: texto izq */}
                          <col style={{ width: '18%' }} />{/* W-AA: texto der */}
                        </colgroup>
                        <tbody>
                          {/* Row 1 */}
                          <tr>
                            <td rowSpan={3} style={{ ...bd, verticalAlign: 'middle', padding: '2px', height: '40px' }}>
                              <img src="/cemg-logo.png" alt="Logo" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
                            </td>
                            <td colSpan={2} style={{ ...bd, textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '9pt', padding: '2px 4px' }}>
                              CERTIFICACIÓN DE CALIFICACIONES&nbsp;&nbsp;{certData.planTipo === 'derogado' ? '(PLAN DEROGADO)' : 'EMG'}
                            </td>
                          </tr>
                          {/* Row 2 */}
                          <tr>
                            <td style={{ ...bd, padding: '1px 3px' }}>I. Plan de Estudio:&nbsp;&nbsp;{displayData.planEstudio}</td>
                            <td style={{ ...bd, padding: '1px 3px', textAlign: 'right' }}>Código&nbsp;&nbsp;{schoolConfig.planCodigo}</td>
                          </tr>
                          {/* Row 3 */}
                          <tr>
                            <td style={{ ...bd, padding: '1px 3px' }}>Lugar y Fecha de Expedición:</td>
                            <td style={{ ...bd, padding: '1px 3px' }}>{displayData.lugar},&nbsp;&nbsp;{displayFechaExpedicion}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== SECCIÓN II: Datos de la Institución (Rows 5-8) — 27 cols (A to AA, N is separator) ====== */}
                      <table width="100%" cellPadding={1} cellSpacing={0} style={{ ...tbS, tableLayout: 'fixed', marginBottom: '0' }}>
                        <colgroup>
                          <col style={{ width: '3.2%' }} />{/* A */}
                          <col style={{ width: '8.4%' }} />{/* B */}
                          <col style={{ width: '8.4%' }} />{/* C */}
                          <col style={{ width: '8.4%' }} />{/* D */}
                          <col style={{ width: '8.4%' }} />{/* E */}
                          <col style={{ width: '8.4%' }} />{/* F */}
                          <col style={{ width: '8.4%' }} />{/* G */}
                          <col style={{ width: '8.4%' }} />{/* H */}
                          <col style={{ width: '4.5%' }} />{/* I */}
                          <col style={{ width: '8.4%' }} />{/* J */}
                          <col style={{ width: '8.4%' }} />{/* K */}
                          <col style={{ width: '8.4%' }} />{/* L */}
                          <col style={{ width: '4.5%' }} />{/* M */}
                          {/* N = separator column - zero width but creates the gap */}
                        </colgroup>
                        <tbody>
                          <tr>
                            <td colSpan={27} style={bdH}>II. Datos de la Institución Educativa o Centro de Desarrollo de la Calidad Educativa Estadal (CDCEE) que Emite la Certificación:</td>
                          </tr>
                          {/* Row 6: A6:C6=Código, D6:H6=OD, I6:M6=Denominación, O6:AA6=Nombre */}
                          <tr>
                            <td colSpan={3} style={bdB}>Código:</td>
                            <td colSpan={5} style={bd}>{displayData.od}</td>
                            <td colSpan={5} style={bdB}>Denominación y Epónimo:</td>
                            <td colSpan={14} style={bd}>{displayData.denominacion}</td>
                          </tr>
                          {/* Row 7: A7:C7=Dirección, D7:R7=dirección, S7:U7=Teléfono, V7:AA7=tel */}
                          <tr>
                            <td colSpan={3} style={bdB}>Dirección:</td>
                            <td colSpan={15} style={bd}>{displayData.direccion}</td>
                            <td colSpan={3} style={bdB}>Teléfono:</td>
                            <td colSpan={6} style={bd}>{displayData.telefono}</td>
                          </tr>
                          {/* Row 8: A8:C8=Municipio, D8:G8=mun, H8:J8=Estado, K8:R8=est, S8:V8=CDCEE, W8:AA8=cdcce */}
                          <tr>
                            <td colSpan={3} style={bdB}>Municipio:</td>
                            <td colSpan={4} style={bd}>{displayData.municipio}</td>
                            <td colSpan={3} style={bdB}>Estado:</td>
                            <td colSpan={8} style={bd}>{displayData.estado}</td>
                            <td colSpan={4} style={bdB}>CDCEE:</td>
                            <td colSpan={5} style={bd}>{displayData.cdcce}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== SECCIÓN III: Datos del Estudiante (Rows 9-12) ====== */}
                      <table width="100%" cellPadding={1} cellSpacing={0} style={{ ...tbS, tableLayout: 'fixed', marginBottom: '0' }}>
                        <tbody>
                          <tr>
                            <td colSpan={27} style={bdH}>III. Datos de Identificación del Estudiante:</td>
                          </tr>
                          {/* Row 10: A10:D10=Cédula, E10:I10=cedula, J10:O10=Fecha Nac, P10:AA10=fecha */}
                          <tr>
                            <td colSpan={4} style={bdB}>Cédula de Identidad:</td>
                            <td colSpan={5} style={bd}>{displayData.estudiante.cedula}</td>
                            <td colSpan={6} style={bdB}>Fecha de Nacimiento:</td>
                            <td colSpan={12} style={bd}>{displayData.estudiante.fechaNacimiento || ''}</td>
                          </tr>
                          {/* Row 11: A11:C11=Apellidos, D11:K11=apellidos, L11:O11=Nombres, P11:AA11=nombres */}
                          <tr>
                            <td colSpan={3} style={bdB}>Apellidos:</td>
                            <td colSpan={8} style={bd}>{displayData.estudiante.apellidos}</td>
                            <td colSpan={4} style={bdB}>Nombres:</td>
                            <td colSpan={12} style={bd}>{displayData.estudiante.nombres}</td>
                          </tr>
                          {/* Row 12: A12:E12=Lugar País, F12:K12=pais, L12:M12=Estado, N12:R12=est, S12:U12=Municipio, V12:AA12=mun */}
                          <tr>
                            <td colSpan={5} style={bdB}>Lugar de Nacimiento País:</td>
                            <td colSpan={6} style={bd}>{displayData.estudiante.pais}</td>
                            <td colSpan={2} style={bdB}>Estado:</td>
                            <td colSpan={7} style={bd}>{displayData.estudiante.estado || ''}</td>
                            <td colSpan={2} style={bdB}>Municipio:</td>
                            <td colSpan={5} style={bd}>{displayData.estudiante.municipio || ''}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== SECCIÓN IV: Instituciones Educativas (Rows 13-16) ====== */}
                      {/* Excel: 2 tables side by side, left cols A-M, right cols O-AA, N=separator */}
                      <table width="100%" cellPadding={1} cellSpacing={0} style={{ ...tbS, tableLayout: 'fixed', marginBottom: '0' }}>
                        <colgroup>
                          <col style={{ width: '3.2%' }} />{/* A */}
                          <col style={{ width: '8.4%' }} />{/* B */}
                          <col style={{ width: '6%' }} />{/* C */}
                          <col style={{ width: '6%' }} />{/* D */}
                          <col style={{ width: '8.4%' }} />{/* E */}
                          <col style={{ width: '8.4%' }} />{/* F */}
                          <col style={{ width: '8.4%' }} />{/* G */}
                          <col style={{ width: '8.4%' }} />{/* H */}
                          <col style={{ width: '4.5%' }} />{/* I */}
                          <col style={{ width: '8.4%' }} />{/* J */}
                          <col style={{ width: '8.4%' }} />{/* K */}
                          <col style={{ width: '8.4%' }} />{/* L */}
                          <col style={{ width: '4.5%' }} />{/* M */}
                        </colgroup>
                        <tbody>
                          {/* Row 13 header */}
                          <tr>
                            <td colSpan={13} style={bdH}>IV. Instituciones Educativas donde Cursó Estudios</td>
                          </tr>
                          {/* Row 14: sub-headers */}
                          <tr>
                            <td style={bdCh}>N°</td>
                            <td colSpan={6} style={bdCh}>Denominación y Epónimo</td>
                            <td colSpan={4} style={bdCh}>Localidad</td>
                            <td style={bdCh}>E.F.</td>
                          </tr>
                          {/* Data rows 15-16 */}
                          {displayData.instituciones.slice(0, 3).map((inst, i) => (
                            <tr key={`l${i}`}>
                              <td style={bdC}>{i + 1}</td>
                              <td colSpan={6} style={bd}>{inst.denominacion || ''}</td>
                              <td colSpan={4} style={bd}>{inst.localidad || ''}</td>
                              <td style={bdC}>{inst.ef || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* ====== SECCIÓN V: Plan de Estudio (Rows 17-52) ====== */}
                      <table width="100%" cellPadding={1} cellSpacing={0} style={{ ...tbS, tableLayout: 'fixed', marginBottom: '0' }}>
                        <tbody><tr><td colSpan={27} style={bdH}>V. Plan de Estudio:</td></tr></tbody>
                      </table>

                      {/* PRIMER AÑO (left A-M) + SEGUNDO AÑO (right O-AA) */}
                      <div style={{ display: 'flex', gap: '1px', marginBottom: '1px' }}>
                        <div style={{ flex: '1 1 49.5%' }}>{renderYearHalf(activePlan[0], 0)}</div>
                        <div style={{ flex: '1 1 49.5%' }}>{renderYearHalf(activePlan[1], 1)}</div>
                      </div>

                      {/* TERCER AÑO (left) + CUARTO AÑO (right) */}
                      <div style={{ display: 'flex', gap: '1px', marginBottom: '1px' }}>
                        <div style={{ flex: '1 1 49.5%' }}>{renderYearHalf(activePlan[2], 2)}</div>
                        <div style={{ flex: '1 1 49.5%' }}>{renderYearHalf(activePlan[3], 3)}</div>
                      </div>

                      {/* QUINTO AÑO (left) + Orientación/Grupos (right) */}
                      <div style={{ display: 'flex', gap: '1px', marginBottom: '1px' }}>
                        <div style={{ flex: '1 1 49.5%' }}>{renderYearHalf(activePlan[4], 4)}</div>
                        <div style={{ flex: '1 1 49.5%' }}>
                          {/* Orientación y Convivencia */}
                          <table width="100%" cellPadding={1} cellSpacing={0} style={tbS}>
                            <tbody>
                              <tr>
                                <td colSpan={13} style={{ ...bdH, textAlign: 'center', fontSize: '6pt' }}>ÁREA DE FORMACIÓN</td>
                              </tr>
                              <tr>
                                <td colSpan={7} style={bdCh}>Orientación y Convivencia</td>
                                <td colSpan={6} style={bdCh}>AÑO</td>
                              </tr>
                              {displayData.orientacion.map((row, i) => (
                                <tr key={`o${i}`}>
                                  <td colSpan={7} style={bdCh}>{row.anio || ''}</td>
                                  <td colSpan={6} style={bdC}>{row.literal || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Participación en Grupos */}
                          <table width="100%" cellPadding={1} cellSpacing={0} style={{ ...tbS, marginTop: '1px' }}>
                            <tbody>
                              <tr>
                                <td colSpan={7} style={{ ...bdH, textAlign: 'center', fontSize: '6pt' }}>Participación en Grupos de Creación, Recreación y Producción</td>
                                <td colSpan={6} style={{ ...bdH, textAlign: 'center', fontSize: '6pt' }}>AÑO</td>
                              </tr>
                              <tr>
                                <td colSpan={4} style={bdCh}>GRUPO</td>
                                <td colSpan={3} style={bdCh}>LITERAL</td>
                                <td colSpan={6} style={bdCh}>AÑO</td>
                              </tr>
                              {displayData.grupos.map((row, i) => (
                                <tr key={`g${i}`}>
                                  <td colSpan={4} style={bdC}>{row.grupo || ''}</td>
                                  <td colSpan={3} style={bdC}>{row.anio || ''}</td>
                                  <td colSpan={6} style={bdC}>{row.literal || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ====== SECCIÓN VI: Observaciones (Rows 53-54) ====== */}
                      <table width="100%" cellPadding={1} cellSpacing={0} style={{ ...tbS, tableLayout: 'fixed', marginBottom: '0' }}>
                        <tbody>
                          <tr>
                            <td colSpan={4} style={bdB}>VI. Observaciones:</td>
                            <td colSpan={3} style={bdB}>P.A.:</td>
                            <td colSpan={4} style={bd}>{displayData.promedioAcumulado || ''}</td>
                            <td colSpan={16} style={bd}>{displayData.observaciones || ''}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== SECCIONES VII + VIII: Director y CDCCE (Rows 57-64) side by side ====== */}
                      <div style={{ display: 'flex', gap: '1px', marginBottom: '0' }}>
                        {/* VII — left half */}
                        <div style={{ flex: '1 1 49.5%' }}>
                          <table width="100%" cellPadding={1} cellSpacing={0} style={tbS}>
                            <tbody>
                              <tr>
                                <td colSpan={7} style={bdH}>VII. Institución Educativa</td>
                              </tr>
                              <tr>
                                <td colSpan={7} style={{ ...bdH, textAlign: 'center' }}>SELLO DE LA INSTITUCIÓN EDUCATIVA</td>
                              </tr>
                              <tr>
                                <td colSpan={3} style={bdB}>Director(a)</td>
                                <td colSpan={4} style={bdB}>Apellidos y Nombres:</td>
                              </tr>
                              <tr>
                                <td colSpan={7} style={bd}>{displayData.director.apellidosNombres || ''}</td>
                              </tr>
                              <tr>
                                <td colSpan={3} style={bdB}>Cédula de Identidad:</td>
                                <td colSpan={4} style={bd}>{displayData.director.cedula || ''}</td>
                              </tr>
                              <tr>
                                <td colSpan={3} style={bdB}>Firma:</td>
                                <td colSpan={4} style={{ ...bd, minHeight: '30px' }}></td>
                              </tr>
                              <tr>
                                <td colSpan={7} style={{ ...bd, fontStyle: 'italic', textAlign: 'center' }}>Para efectos de su Validez Nacional</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {/* VIII — right half */}
                        <div style={{ flex: '1 1 49.5%' }}>
                          <table width="100%" cellPadding={1} cellSpacing={0} style={tbS}>
                            <tbody>
                              <tr>
                                <td colSpan={7} style={bdH}>VIII. Centro de Desarrollo de la Calidad Educativa Estadal</td>
                              </tr>
                              <tr>
                                <td colSpan={7} style={{ ...bdH, textAlign: 'center' }}>SELLO DEL CENTRO DE DESARROLLO DE LA CALIDAD EDUCATIVA ESTADAL</td>
                              </tr>
                              <tr>
                                <td colSpan={3} style={bdB}>Director(a)</td>
                                <td colSpan={4} style={bdB}>Apellidos y Nombres:</td>
                              </tr>
                              <tr>
                                <td colSpan={7} style={bd}>{displayData.directorCdcce.apellidosNombres || ''}</td>
                              </tr>
                              <tr>
                                <td colSpan={3} style={bdB}>Cédula de Identidad:</td>
                                <td colSpan={4} style={bd}>{displayData.directorCdcce.cedula || ''}</td>
                              </tr>
                              <tr>
                                <td colSpan={3} style={bdB}>Firma:</td>
                                <td colSpan={4} style={{ ...bd, minHeight: '30px' }}></td>
                              </tr>
                              <tr>
                                <td colSpan={7} style={{ ...bd, fontStyle: 'italic', textAlign: 'center' }}>Para efectos de su Validez Internacional</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* VALOR FISCAL (Row 65) */}
                      <table width="100%" cellPadding={1} cellSpacing={0} style={{ ...tbS, marginTop: '2px' }}>
                        <tbody>
                          <tr>
                            <td colSpan={27} style={{ ...bd, fontWeight: 'bold', textAlign: 'center', fontSize: '6pt' }}>VALOR FISCAL: Para su validez legal y de acuerdo al Ramo de Estampillas, al dorso de este documento se le debe colocar tres décimas de la Unidad Tributaria (0,3 U.T.)</td>
                          </tr>
                        </tbody>
                      </table>

                      {previewCert && (
                        <div style={{ textAlign: 'right', marginTop: '2px', fontSize: '6pt' }}>
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
                      <p><strong>C.I.:</strong> {formatCedulaFinal(selectedStudent.cedula)}</p>
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
