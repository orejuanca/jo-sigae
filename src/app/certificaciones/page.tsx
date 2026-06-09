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
  instEduc: string
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
      tipoEvaluacion: '', fechaMes: '', fechaAnio: '', instEduc: '',
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

  // Helper styles for cert preview tables — Excel format: Arial 9pt, thin borders, NO backgrounds
  const tbS: React.CSSProperties = { borderCollapse: 'collapse', fontSize: '9pt', lineHeight: '1.2', fontFamily: 'Arial, sans-serif' }
  const bd: React.CSSProperties = { border: '1px solid #000', padding: '1px 2px', fontSize: '9pt' }
  const bdB: React.CSSProperties = { ...bd, fontWeight: 'bold' }
  const bdH: React.CSSProperties = { ...bd, fontWeight: 'bold' }
  const bdC: React.CSSProperties = { ...bd, textAlign: 'center' }
  const bdCh: React.CSSProperties = { ...bd, fontWeight: 'bold', textAlign: 'center', fontSize: '7pt', verticalAlign: 'middle' }

  // Render one half of a year table (left=A-M or right=O-AA)
  // Excel columns per half: A-D(4), E(1), F-I(4), J(1), K(1), L(1), M(1) = 13
  // Logical columns rendered as 7 <td>: Areas(1), N°(1), Letras(1), T-E(1), Mes(1), Año(1), Inst(1)
  const bdH9: React.CSSProperties = { ...bd, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }
  // Vertical text style for Inst. Educ. header (Excel: rotation=88, Arial 7pt bold)
  const instVertStyle: React.CSSProperties = {
    ...bd,
    fontWeight: 'bold',
    textAlign: 'center',
    verticalAlign: 'middle',
    padding: '0 1px',
  }
  // Vertical separator column (like Section IV's N column)
  const sepCol: React.CSSProperties = { borderLeft: '1px solid #000', borderRight: '1px solid #000', borderTop: 'none', borderBottom: 'none' }

  const renderYearHalf = (plan: PlanAnio, planIdx: number, minRows?: number) => {
    const allGrades = displayData.calificaciones[plan.anio] || []
    // Filter only quantitative subjects (exclude cualitativas)
    const grades = allGrades.filter((_g, idx) => {
      const m = plan.materias[idx]
      return m && m.tipo !== 'cualitativa'
    })
    // Filler rows for paired years with different subject counts
    const fillerCount = minRows ? Math.max(0, minRows - grades.length) : 0
    // Excel column widths: A=4.57, B-K=13 each, L=5.0, M=4.57 → total=144.14
    // Proportions: Areas 30.2%, N° 9.0%, Letras 36.1%, T-E 9.0%, Mes 9.0%, Año 3.5%, Inst 3.2%
    return (
      <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
        <colgroup>
          <col style={{ width: '30.2%' }} />{/* A-D: ÁREAS DE FORMACIÓN */}
          <col style={{ width: '9.0%' }} />{/* E: N° */}
          <col style={{ width: '36.1%' }} />{/* F-I: LETRAS */}
          <col style={{ width: '9.0%' }} />{/* J: T-E */}
          <col style={{ width: '9.0%' }} />{/* K: Mes */}
          <col style={{ width: '3.5%' }} />{/* L: Año */}
          <col style={{ width: '3.2%' }} />{/* M: Inst. Educ. */}
        </colgroup>
        <tbody>
          {/* Year header row - just the year name, centered, no year label */}
          <tr>
            <td colSpan={7} style={bdH}>{plan.anio.toUpperCase()}</td>
          </tr>
          {/* Sub-header row 1 */}
          <tr>
            <td colSpan={1} rowSpan={2} style={bdH9}>ÁREAS DE FORMACIÓN</td>
            <td colSpan={2} style={bdH9}>CALIFICACIÓN</td>
            <td rowSpan={2} style={bdH9}>T-E</td>
            <td colSpan={2} style={bdH9}>FECHA</td>
            <td rowSpan={2} style={instVertStyle}>
              <span style={{ display: 'inline-block', writingMode: 'vertical-rl' as const, transform: 'rotate(180deg)', fontSize: '7pt', whiteSpace: 'nowrap', lineHeight: '1' }}>
                Inst. Educ.
              </span>
            </td>
          </tr>
          {/* Sub-header row 2 */}
          <tr>
            <td style={bdH9}>N°</td>
            <td style={bdH9}>LETRAS</td>
            <td style={bdH9}>Mes</td>
            <td style={bdH9}>Año</td>
          </tr>
          {/* Subject rows */}
          {grades.map((cal, idx) => (
            <tr key={idx}>
              <td style={{ ...bd, verticalAlign: 'top', whiteSpace: 'normal', lineHeight: '1.1' }}>{cal.materia}</td>
              <td style={{ ...bdC, fontWeight: 'bold' }}>{cal.nota || ''}</td>
              <td style={{ ...bdC, textAlign: 'left' }}>{cal.literal || ''}</td>
              <td style={bdC}>{cal.tipoEvaluacion || ''}</td>
              <td style={bdC}>{cal.fechaMes || ''}</td>
              <td style={{ ...bdC, fontSize: '7pt' }}>{cal.fechaAnio || ''}</td>
              <td style={{ ...bdC, fontSize: '5pt', padding: '0 1px', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cal.instEduc || ''}</td>
            </tr>
          ))}
          {/* Filler rows (asterisks) for paired years with different subject counts */}
          {Array.from({ length: fillerCount }).map((_, idx) => (
            <tr key={`fill-${idx}`}>
              <td style={bd}>{'**********************'}</td>
              <td style={bdC}>{'*'}</td>
              <td style={bdC}>{'**********************'}</td>
              <td style={bdC}>{'*'}</td>
              <td style={bdC}>{'*'}</td>
              <td style={bdC}>{'*'}</td>
              <td style={bdC}>{'*'}</td>
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
                    {/* Main preview container — Excel format: Arial 9pt, thin borders, NO background colors */}
                    <div
                      className="border border-black bg-white text-black mx-auto overflow-x-auto"
                      id="cert-preview"
                      style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', lineHeight: '1.2', maxWidth: '260mm', padding: '0' }}
                    >
                      {/* ====== ROW 1-3: ENCABEZADO (Title, Plan, Lugar/Fecha) ====== */}
                      {/* Excel: Row 1: title M1:AA1, Row 2: plan M2:V2 + code W2:AA2, Row 3: lugar M3:S3 + T3:V3 + fecha W3:AA3 */}
                      <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                        <colgroup>
                          <col style={{ width: '44%' }} />{/* A-L: logo area */}
                          <col style={{ width: '24%' }} />{/* M-S: left text */}
                          <col style={{ width: '10%' }} />{/* T-V: middle text */}
                          <col style={{ width: '22%' }} />{/* W-AA: right text */}
                        </colgroup>
                        <tbody>
                          {/* Row 1: Title */}
                          <tr>
                            <td rowSpan={3} style={{ ...bd, verticalAlign: 'middle', padding: '2px' }}>
                              <img src="/logo-mppe.png" alt="Logo" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
                            </td>
                            <td colSpan={3} style={{ ...bd, textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '9pt', padding: '4px 4px' }}>
                              CERTIFICACIÓN DE CALIFICACIONES&nbsp;&nbsp;{displayData.planTipo === 'derogado' ? '(PLAN DEROGADO)' : 'EMG'}
                            </td>
                          </tr>
                          {/* Row 2: Plan de Estudio + Código */}
                          <tr>
                            <td colSpan={2} style={{ ...bd, padding: '1px 3px', fontWeight: 'bold' }}>I. Plan de Estudio:&nbsp;&nbsp;{displayData.planEstudio}</td>
                            <td style={{ ...bd, padding: '1px 3px', fontWeight: 'bold' }}>Código&nbsp;{schoolConfig.planCodigo}</td>
                          </tr>
                          {/* Row 3: Lugar y Fecha */}
                          <tr>
                            <td style={{ ...bd, padding: '1px 3px', fontWeight: 'bold' }}>Lugar y Fecha de Expedición:</td>
                            <td style={{ ...bd, padding: '1px 3px', textAlign: 'right', borderRight: 'none' }}>{displayData.lugar},</td>
                            <td style={{ ...bd, padding: '1px 3px', borderLeft: 'none' }}>{displayFechaExpedicion}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== SECCIÓN II — Datos de la Institución (rows 5-8) ====== */}
                      {/* Excel: 27 equal cols (A-AA). Base 10-col decomposition: 3,4,1,2,3,1,4,3,1,5 */}
                      <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                        <colgroup>
                          <col style={{ width: '11.11%' }} />{/* 1: A-C (3) */}
                          <col style={{ width: '14.81%' }} />{/* 2: D-G (4) */}
                          <col style={{ width: '3.70%' }} />{/* 3: H (1) */}
                          <col style={{ width: '7.41%' }} />{/* 4: I-J (2) */}
                          <col style={{ width: '11.11%' }} />{/* 5: K-M (3) */}
                          <col style={{ width: '3.70%' }} />{/* 6: N (1) */}
                          <col style={{ width: '14.81%' }} />{/* 7: O-R (4) */}
                          <col style={{ width: '11.11%' }} />{/* 8: S-U (3) */}
                          <col style={{ width: '3.70%' }} />{/* 9: V (1) */}
                          <col style={{ width: '18.52%' }} />{/* 10: W-AA (5) */}
                        </colgroup>
                        <tbody>
                          {/* Row 5: Section header — A5:AA5 */}
                          <tr>
                            <td colSpan={10} style={bdH}>II. Datos de la Institución Educativa o  Centro de Desarrollo de la Calidad Educativa Estadal (CDCEE) que Emite la Certificación:</td>
                          </tr>
                          {/* Row 6: A6:C6 Código | D6:H6 value | I6:M6 Denom label | N6 gap | O6:AA6 Denom value */}
                          <tr>
                            <td style={bd}>Código:</td>
                            <td colSpan={2} style={bd}>{displayData.od}</td>
                            <td colSpan={2} style={{ ...bd, textAlign: 'center' }}>Denominación y Epónimo:</td>
                            <td style={bd}></td>
                            <td colSpan={4} style={bd}>{displayData.denominacion}</td>
                          </tr>
                          {/* Row 7: A7:C7 Dirección | D7:R7 value | S7:U7 Teléfono | V7:AA7 value */}
                          <tr>
                            <td style={bd}>Dirección:</td>
                            <td colSpan={6} style={bd}>{displayData.direccion}</td>
                            <td style={bd}>Teléfono:</td>
                            <td colSpan={2} style={{ ...bd, textAlign: 'center' }}>{displayData.telefono}</td>
                          </tr>
                          {/* Row 8: A8:C8 Municipio | D8:G8 value | H8:J8 Estado | K8:R8 value | S8:V8 CDCEE | W8:AA8 value */}
                          <tr>
                            <td style={bd}>Municipio:</td>
                            <td style={{ ...bd, textAlign: 'center' }}>{displayData.municipio}</td>
                            <td colSpan={2} style={bd}>Estado:</td>
                            <td colSpan={3} style={{ ...bd, textAlign: 'center' }}>{displayData.estado}</td>
                            <td colSpan={2} style={bd}>CDCEE:</td>
                            <td style={{ ...bd, textAlign: 'center' }}>{displayData.cdcce}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== ROW 9-12: SECCIÓN III — Datos del Estudiante ====== */}
                      {/* Excel 27 cols. Base 10-col decomposition: 3,1,1,4,2,2,2,5,2,5 */}
                      <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                        <colgroup>
                          <col style={{ width: '11.11%' }} />{/* 1: A-C (3) */}
                          <col style={{ width: '3.70%' }} />{/* 2: D (1) */}
                          <col style={{ width: '3.70%' }} />{/* 3: E (1) */}
                          <col style={{ width: '14.81%' }} />{/* 4: F-I (4) */}
                          <col style={{ width: '7.41%' }} />{/* 5: J-K (2) */}
                          <col style={{ width: '7.41%' }} />{/* 6: L-M (2) */}
                          <col style={{ width: '7.41%' }} />{/* 7: N-O (2) */}
                          <col style={{ width: '18.52%' }} />{/* 8: P-T (5) */}
                          <col style={{ width: '7.41%' }} />{/* 9: U-V (2) */}
                          <col style={{ width: '18.52%' }} />{/* 10: W-AA (5) */}
                        </colgroup>
                        <tbody>
                          {/* Row 9: Section header — A9:AA9 */}
                          <tr>
                            <td colSpan={10} style={bdH}>III. Datos de Identificación del Estudiante:</td>
                          </tr>
                          {/* Row 10: A10:D10 Cédula label | E10:I10 value | J10:O10 Fecha label | P10:AA10 value */}
                          <tr>
                            <td colSpan={2} style={bd}>Cédula de Identidad:</td>
                            <td colSpan={2} style={bd}>{displayData.estudiante.cedula}</td>
                            <td colSpan={3} style={bd}>Fecha de Nacimiento:</td>
                            <td colSpan={3} style={bd}>{displayData.estudiante.fechaNacimiento || ''}</td>
                          </tr>
                          {/* Row 11: A11:C11 Apellidos | D11:K11 value | L11:O11 Nombres | P11:AA11 value */}
                          <tr>
                            <td style={bd}>Apellidos:</td>
                            <td colSpan={4} style={bd}>{displayData.estudiante.apellidos}</td>
                            <td colSpan={2} style={bd}>Nombres:</td>
                            <td colSpan={3} style={bd}>{displayData.estudiante.nombres}</td>
                          </tr>
                          {/* Row 12: A12:E12 Lugar | F12:K12 value | L12:M12 Estado | N12:T12 value | U12:V12 Municipio | W12:AA12 value */}
                          <tr>
                            <td colSpan={3} style={bd}>Lugar de Nacimiento País:</td>
                            <td colSpan={2} style={bd}>{displayData.estudiante.pais}</td>
                            <td style={{ ...bd, textAlign: 'center' }}>Estado:</td>
                            <td colSpan={2} style={bd}>{displayData.estudiante.estadoNac || ''}</td>
                            <td style={{ ...bd, textAlign: 'center' }}>Municipio:</td>
                            <td style={bd}>{displayData.estudiante.municipioNac || ''}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== ROW 13-16: SECCIÓN IV — Instituciones Educativas (side-by-side, single table) ====== */}
                      {/* Excel: Left A-M (13 cols) | N sep (1) | Right O-AA (13 cols). Base 9 cols: 1,6,5,1,1,1,6,5,1 */}
                      <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                        <colgroup>
                          <col style={{ width: '3.70%' }} />{/* 1: A (N°) */}
                          <col style={{ width: '22.22%' }} />{/* 2: B-G (Denominación) */}
                          <col style={{ width: '18.52%' }} />{/* 3: H-L (Localidad) */}
                          <col style={{ width: '3.70%' }} />{/* 4: M (E.F.) */}
                          <col style={{ width: '1.48%' }} />{/* 5: N (separator) */}
                          <col style={{ width: '3.70%' }} />{/* 6: O (N°) */}
                          <col style={{ width: '22.22%' }} />{/* 7: P-U (Denominación) */}
                          <col style={{ width: '18.52%' }} />{/* 8: V-Z (Localidad) */}
                          <col style={{ width: '3.70%' }} />{/* 9: AA (E.F.) */}
                        </colgroup>
                        <tbody>
                          {/* Row 13: Title (A-M) | sep N | Right headers (O-AA) */}
                          <tr>
                            <td colSpan={4} style={bdH}>IV. Instituciones Educativas donde Cursó Estudios</td>
                            <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', borderTop: 'none', borderBottom: 'none' }}></td>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center' }}>N°</td>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center' }}>Denominación y Epónimo de la Institución Educativa</td>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center' }}>Localidad</td>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center' }}>E.F.</td>
                          </tr>
                          {/* Row 14: Left headers (A-M) | sep N | Right data row 3 (O-AA) */}
                          <tr>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center' }}>N°</td>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center' }}>Denominación y Epónimo de la Institución Educativa</td>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center' }}>Localidad</td>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center' }}>E.F.</td>
                            <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', borderTop: 'none', borderBottom: 'none' }}></td>
                            <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold' }}>{displayData.instituciones[2] ? 3 : ''}</td>
                            <td style={bd}>{displayData.instituciones[2]?.denominacion || '*'}</td>
                            <td style={bd}>{displayData.instituciones[2]?.localidad || '*'}</td>
                            <td style={{ ...bd, textAlign: 'center' }}>{displayData.instituciones[2]?.ef || '*'}</td>
                          </tr>
                          {/* Row 15: Left data 1 (A-M) | sep N | Right data 4 (O-AA) */}
                          <tr>
                            <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold' }}>1</td>
                            <td style={bd}>{displayData.instituciones[0]?.denominacion || '*'}</td>
                            <td style={bd}>{displayData.instituciones[0]?.localidad || '*'}</td>
                            <td style={{ ...bd, textAlign: 'center' }}>{displayData.instituciones[0]?.ef || '*'}</td>
                            <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', borderTop: 'none', borderBottom: 'none' }}></td>
                            <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold' }}>{displayData.instituciones[3] ? 4 : ''}</td>
                            <td style={bd}>{displayData.instituciones[3]?.denominacion || '*'}</td>
                            <td style={bd}>{displayData.instituciones[3]?.localidad || '*'}</td>
                            <td style={{ ...bd, textAlign: 'center' }}>{displayData.instituciones[3]?.ef || '*'}</td>
                          </tr>
                          {/* Row 16: Left data 2 (A-M) | sep N | Right data 5 (O-AA) */}
                          <tr>
                            <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold' }}>2</td>
                            <td style={bd}>{displayData.instituciones[1]?.denominacion || '*'}</td>
                            <td style={bd}>{displayData.instituciones[1]?.localidad || '*'}</td>
                            <td style={{ ...bd, textAlign: 'center' }}>{displayData.instituciones[1]?.ef || '*'}</td>
                            <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', borderTop: 'none', borderBottom: 'none' }}></td>
                            <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold' }}>{displayData.instituciones[4] ? 5 : ''}</td>
                            <td style={bd}>{displayData.instituciones[4]?.denominacion || '*'}</td>
                            <td style={bd}>{displayData.instituciones[4]?.localidad || '*'}</td>
                            <td style={{ ...bd, textAlign: 'center' }}>{displayData.instituciones[4]?.ef || '*'}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== ROW 17+: SECCIÓN V — Plan de Estudio: Calificaciones ====== */}
                      {/* Row 17: Section V header — no bottom border (directly adjacent to year headers) */}
                      <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                        <tbody>
                          <tr>
                            <td style={{ ...bdH, borderBottom: 'none' }}>V. Plan de Estudio:</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Helper: count quantitative subjects for a plan */}
                      {(() => {
                        const countQuant = (p: PlanAnio) =>
                          p.materias.filter(m => m.tipo !== 'cualitativa').length
                        const c1 = countQuant(activePlan[0]), c2 = countQuant(activePlan[1])
                        const c3 = countQuant(activePlan[2]), c4 = countQuant(activePlan[3])
                        const max12 = Math.max(c1, c2)
                        const max34 = Math.max(c3, c4)

                        return (<>
                      {/* 1° AÑO (left A-M) + 2° AÑO (right O-AA) */}
                      <div style={{ display: 'flex', gap: '0' }}>
                        <div style={{ flex: '1 1 49.85%' }}>{renderYearHalf(activePlan[0], 0, max12)}</div>
                        <div style={{ ...sepCol, flexShrink: 0, width: '3px' }} />
                        <div style={{ flex: '1 1 49.85%' }}>{renderYearHalf(activePlan[1], 1, max12)}</div>
                      </div>

                      {/* 3° AÑO (left) + 4° AÑO (right) */}
                      <div style={{ display: 'flex', gap: '0' }}>
                        <div style={{ flex: '1 1 49.85%' }}>{renderYearHalf(activePlan[2], 2, max34)}</div>
                        <div style={{ ...sepCol, flexShrink: 0, width: '3px' }} />
                        <div style={{ flex: '1 1 49.85%' }}>{renderYearHalf(activePlan[3], 3, max34)}</div>
                      </div>

                      {/* 5° AÑO (left) + Orientación / Grupos (right) */}
                      <div style={{ display: 'flex', gap: '0' }}>
                        <div style={{ flex: '1 1 49.85%' }}>{renderYearHalf(activePlan[4], 4)}</div>
                        <div style={{ ...sepCol, flexShrink: 0, width: '3px' }} />
                        <div style={{ flex: '1 1 49.85%' }}>
                          {/* Orientación y Convivencia — Excel: O-S(5) ÁREA + T(1) AÑO + U-AA(7) LITERAL */}
                          <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                            <colgroup>
                              <col style={{ width: '39.3%' }} />{/* O-S: 56.57/144.14 */}
                              <col style={{ width: '9.0%' }} />{/* T: 13/144.14 */}
                              <col style={{ width: '51.7%' }} />{/* U-AA: 74.57/144.14 */}
                            </colgroup>
                            <tbody>
                              <tr>
                                <td style={bdH9}>ÁREA DE FORMACIÓN</td>
                                <td style={bdH9}>AÑO</td>
                                <td style={bdH9}>LITERAL</td>
                              </tr>
                              <tr>
                                <td rowSpan={5} style={bd}>Orientación y Convivencia</td>
                                <td style={bdC}>1°</td>
                                <td style={bdC}>{displayData.orientacion[0]?.literal || '*'}</td>
                              </tr>
                              {[1,2,3,4].map(i => (
                                <tr key={`o${i}`}>
                                  <td style={bdC}>{i + 1}°</td>
                                  <td style={bdC}>{displayData.orientacion[i]?.literal || '*'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* Participación en Grupos — Excel: O-S(5) ÁREA + T(1) AÑO + U-Y(5) GRUPO + Z-AA(2) LITERAL */}
                          <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                            <colgroup>
                              <col style={{ width: '39.3%' }} />{/* O-S: 56.57/144.14 */}
                              <col style={{ width: '9.0%' }} />{/* T: 13/144.14 */}
                              <col style={{ width: '45.1%' }} />{/* U-Y: 65/144.14 */}
                              <col style={{ width: '6.6%' }} />{/* Z-AA: 9.57/144.14 */}
                            </colgroup>
                            <tbody>
                              <tr>
                                <td style={bdH9}>ÁREA DE FORMACIÓN</td>
                                <td style={bdH9}>AÑO</td>
                                <td style={bdH9}>GRUPO</td>
                                <td style={bdH9}>LITERAL</td>
                              </tr>
                              {[0,1,2,3,4].map(i => (
                                <tr key={`g${i}`}>
                                  {i === 0 && <td rowSpan={5} style={bd}>Participación en Grupos de Creación, Recreación y Producción</td>}
                                  <td style={bdC}>{i + 1}°</td>
                                  <td style={bdC}>{displayData.grupos[i]?.grupo || '*'}</td>
                                  <td style={bdC}>{displayData.grupos[i]?.literal || '*'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      </>)
                      })()}

                      {/* ====== SECCIÓN VI: Observaciones ====== */}
                      <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                        <tbody>
                          <tr>
                            <td style={{ ...bdB, whiteSpace: 'nowrap' }}>VI. Observaciones:</td>
                            <td style={{ ...bdB, whiteSpace: 'nowrap', width: '60px' }}>P.A.:</td>
                            <td style={{ ...bd, width: '100px', textAlign: 'center' }}>{displayData.promedioAcumulado || ''}</td>
                            <td style={bd}>{displayData.observaciones || ''}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ====== SECCIONES VII + VIII: Director y CDCCE (side by side) ====== */}
                      <div style={{ display: 'flex', gap: '0' }}>
                        {/* VII — Institución Educativa */}
                        <div style={{ flex: '1 1 49.85%' }}>
                          <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                            <tbody>
                              <tr>
                                <td colSpan={2} style={bdH}>VII. Institución Educativa</td>
                              </tr>
                              <tr>
                                <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold', fontSize: '7pt', width: '35%' }}>Director(a)</td>
                                <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold', fontSize: '7pt' }}>SELLO DE LA INSTITUCIÓN EDUCATIVA</td>
                              </tr>
                              <tr><td colSpan={2} style={bdB}>Apellidos y Nombres:</td></tr>
                              <tr><td colSpan={2} style={bd}>{displayData.director.apellidosNombres || ''}</td></tr>
                              <tr><td colSpan={2} style={bdB}>Cédula de Identidad:</td></tr>
                              <tr><td colSpan={2} style={bd}>{displayData.director.cedula || ''}</td></tr>
                              <tr><td colSpan={2} style={{ ...bd, fontWeight: 'bold' }}>Firma:</td></tr>
                              <tr>
                                <td colSpan={2} style={{ ...bd, fontStyle: 'italic', textAlign: 'center', fontSize: '7pt' }}>
                                  Para efectos de su Validez Nacional
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {/* VIII — CDCEE */}
                        <div style={{ flex: '1 1 49.85%' }}>
                          <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                            <tbody>
                              <tr>
                                <td colSpan={2} style={bdH}>VIII. Centro de Desarrollo de la Calidad Educativa Estadal</td>
                              </tr>
                              <tr>
                                <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold', fontSize: '7pt', width: '35%' }}>Director(a)</td>
                                <td style={{ ...bd, textAlign: 'center', fontWeight: 'bold', fontSize: '7pt' }}>SELLO DEL CENTRO DE DESARROLLO DE LA CALIDAD EDUCATIVA ESTADAL</td>
                              </tr>
                              <tr><td colSpan={2} style={bdB}>Apellidos y Nombres:</td></tr>
                              <tr><td colSpan={2} style={bd}>{displayData.directorCdcce.apellidosNombres || ''}</td></tr>
                              <tr><td colSpan={2} style={bdB}>Cédula de Identidad:</td></tr>
                              <tr><td colSpan={2} style={bd}>{displayData.directorCdcce.cedula || ''}</td></tr>
                              <tr><td colSpan={2} style={{ ...bd, fontWeight: 'bold' }}>Firma:</td></tr>
                              <tr>
                                <td colSpan={2} style={{ ...bd, fontStyle: 'italic', textAlign: 'center', fontSize: '7pt' }}>
                                  Para efectos de su Validez Internacional
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* VALOR FISCAL */}
                      <table width="100%" cellPadding={0} cellSpacing={0} style={tbS}>
                        <tbody>
                          <tr>
                            <td style={{ ...bd, fontWeight: 'bold', textAlign: 'center', fontSize: '7pt' }}>
                              VALOR FISCAL: Para su validez legal y de acuerdo al Ramo de Estampillas, al dorso de este documento se le debe colocar tres décimas de la Unidad Tributaria (0,3 U.T.)
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {previewCert && (
                        <div style={{ textAlign: 'right', marginTop: '2px', fontSize: '7pt' }}>
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
