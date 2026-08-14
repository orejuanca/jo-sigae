'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StudentSearch } from '@/components/student-search'
import { useToast } from '@/hooks/use-toast'
import { notaEnLetras, formatCedulaFinal } from '@/lib/school-config'
import {
  Save, Loader2, ArrowLeft, Printer, Eye, EyeOff, Search,
} from 'lucide-react'

// === Types ===
interface Student {
  id: string; cedula: string; apellidos: string; nombres: string
  fechaNacimiento?: string | null; pais?: string | null
  estado?: string | null; municipio?: string | null; plan?: string | null
}

interface CalificacionRow {
  materia: string; numero: number; nota: string; literal: string
  tipoEvaluacion: string; fechaMes: string; fechaAnio: string; instEduc: string
}

interface CertData {
  lugar: string; fechaExpedicion: string; planEstudio: string; od: string
  denominacion: string; direccion: string; telefono: string; municipio: string
  estado: string; cdcce: string; planTipo?: string
  estudiante: { cedula: string; fechaNacimiento: string; apellidos: string; nombres: string; pais: string; estado: string; municipio: string }
  instituciones: { numero: number; denominacion: string; localidad: string; ef: string }[]
  calificaciones: Record<string, CalificacionRow[]>
  orientacion: { anio: string; literal: string }[]
  grupos: { anio: string; grupo: string; literal: string }[]
  observaciones: string; observacionesLines: string[]; promedioAcumulado: string
  director: { apellidosNombres: string; cedula: string }
  directorCdcce: { apellidosNombres: string; cedula: string }
  acta: string; actaFecha: string; actaAnio: string; literalesFinales: string[]
}

interface TextTemplate {
  headerLines: string[]
  bodyParagraphs: string[]
  footerLines: string[]
  pageSize: 'carta' | 'legal' | 'a4'
  showGradesTable: boolean
  gradesTableTitle: string
}

function formatDateLong(dateStr: string): string {
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return dateStr
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const day = parseInt(m[1])
  const month = months[parseInt(m[2]) - 1] || m[2]
  const year = m[3]
  return `${day} de ${month} de ${year}`
}

function resolveTemplateToken(token: string, data: CertData | null): string {
  if (!data) return token
  const t = token.trim()
  const key = t.replace(/^\{\{|\}\}$/g, '').trim()
  const parts = key.split('.')
  let value = ''
  if (parts[0] === 'estudiante') {
    const obj = data.estudiante as any
    value = parts.slice(1).reduce((o: any, k: string) => o?.[k], obj) || ''
  } else if (parts[0] === 'director') {
    const obj = data.director as any
    value = parts.slice(1).reduce((o: any, k: string) => o?.[k], obj) || ''
  } else if (parts[0] === 'directorCdcce') {
    const obj = data.directorCdcce as any
    value = parts.slice(1).reduce((o: any, k: string) => o?.[k], obj) || ''
  } else {
    const top = (data as any)[key]
    if (top !== undefined && top !== null) value = String(top)
  }
  if (key === 'fechaExpedicion' && value) value = formatDateLong(value)
  return value
}

function processTemplateLine(line: string, data: CertData | null): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /\{\{[^}]+\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(line.substring(lastIndex, match.index))
    const resolved = resolveTemplateToken(match[0], data)
    parts.push(<span key={match.index} className="font-semibold text-blue-700">{resolved}</span>)
    lastIndex = regex.lastIndex
  }
  if (lastIndex < line.length) parts.push(line.substring(lastIndex))
  return parts.length > 0 ? parts : [line]
}

// Sample certData for preview when no student is selected
const SAMPLE_CERT_DATA: CertData = {
  lugar: 'Caracas',
  fechaExpedicion: '15/08/2026',
  planEstudio: 'Plan de Estudios vigente (Ley Orgánica de Educación)',
  od: 'OD-12345',
  denominacion: 'U.E. COLEGIO BOLIVARIANO "JUAN ANTONIO RODRÍGUEZ DOMÍNGUEZ"',
  direccion: 'Av. Principal, Zona Educativa',
  telefono: '0212-1234567',
  municipio: 'Sucre',
  estado: 'Miranda',
  cdcce: 'CD-12345',
  estudiante: {
    cedula: 'V-12.345.678',
    fechaNacimiento: '15/03/2005',
    apellidos: 'GARCÍA RODRÍGUEZ',
    nombres: 'MARÍA JOSEFINA',
    pais: 'Venezuela',
    estado: 'Miranda',
    municipio: 'Sucre',
  },
  instituciones: [
    { numero: 1, denominacion: 'U.E. Colegio Bolivariano', localidad: 'Caracas', ef: '01/09/2022' },
  ],
  calificaciones: {
    'Primer Año': [
      { materia: 'Castellano y Literatura', numero: 1, nota: '18', literal: 'MB', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
      { materia: 'Matemática', numero: 2, nota: '16', literal: 'B', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
      { materia: 'Ciencias de la Naturaleza', numero: 3, nota: '15', literal: 'B', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
    ],
    'Segundo Año': [
      { materia: 'Castellano y Literatura', numero: 1, nota: '17', literal: 'MB', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
      { materia: 'Matemática', numero: 2, nota: '19', literal: 'MB', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
    ],
  },
  orientacion: [],
  grupos: [],
  observaciones: '',
  observacionesLines: [],
  promedioAcumulado: '16.80',
  director: { apellidosNombres: 'ANA MARÍA PÉREZ', cedula: 'V-8.765.432' },
  directorCdcce: { apellidosNombres: 'JOSÉ LUIS MARTÍNEZ', cedula: 'V-5.432.109' },
  acta: '',
  actaFecha: '',
  actaAnio: '',
  literalesFinales: [],
}

function TextEditorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const layoutId = searchParams.get('id') || ''
  const plan = searchParams.get('plan') || 'vigente'
  const layoutName = searchParams.get('name') || ''

  const [template, setTemplate] = useState<TextTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editHeader, setEditHeader] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editFooter, setEditFooter] = useState('')
  const [editGradesTitle, setEditGradesTitle] = useState('')
  const [editPageSize, setEditPageSize] = useState<'carta' | 'legal' | 'a4'>('legal')
  const [editShowGrades, setEditShowGrades] = useState(true)

  // Preview state
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null)
  const [previewCertData, setPreviewCertData] = useState<CertData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const previewRef = useRef<HTMLDivElement>(null)

  // Load template
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cert-layouts?id=${layoutId}&plan=${plan}`)
        if (!res.ok) { toast({ title: 'Error', description: 'No se pudo cargar el layout.', variant: 'destructive' }); return }
        const detail = await res.json()
        const parsed = typeof detail.datos === 'string' ? JSON.parse(detail.datos) : detail.datos
        if (parsed.templateType === 'text-document' && parsed.template) {
          const t = parsed.template as TextTemplate
          setTemplate(t)
          setEditHeader(t.headerLines.join('\n'))
          setEditBody(t.bodyParagraphs.join('\n'))
          setEditFooter(t.footerLines.join('\n'))
          setEditGradesTitle(t.gradesTableTitle || '')
          setEditPageSize(t.pageSize || 'legal')
          setEditShowGrades(t.showGradesTable !== false)
        } else {
          toast({ title: 'Error', description: 'Este layout no es un documento de texto.', variant: 'destructive' })
        }
      } catch {
        toast({ title: 'Error', description: 'Error al cargar.', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    if (layoutId) load()
  }, [layoutId, plan, toast])

  // Load preview student data
  const handleSelectPreviewStudent = useCallback(async (student: Student) => {
    setPreviewStudent(student)
    setPreviewCertData(null)
    setLoadingPreview(true)
    try {
      const certApiUrl = plan === 'vigente'
        ? `/api/plan-vigente/${student.id}/cert-data`
        : `/api/plan-derogado/${student.id}/cert-data`
      const res = await fetch(certApiUrl)
      if (!res.ok) { setLoadingPreview(false); return }
      const result = await res.json()
      if (result.certData) {
        const cd = result.certData
        if (cd.calificaciones) {
          for (const anio of Object.keys(cd.calificaciones)) {
            for (const cal of cd.calificaciones[anio]) {
              if (cal.nota === 'IN' && cal.literal !== 'INASISTENTE') cal.literal = 'INASISTENTE'
              if (cal.nota === 'PE' && cal.literal !== 'PENDIENTE') cal.literal = 'PENDIENTE'
              if (!cal.literal && cal.nota) cal.literal = notaEnLetras(cal.nota)
            }
          }
        }
        setPreviewCertData(cd)
      }
    } catch { /* ignore */ }
    finally { setLoadingPreview(false) }
  }, [plan])

  // Save
  const handleSave = async () => {
    if (!template) return
    const updated: TextTemplate = {
      headerLines: editHeader.split('\n'),
      bodyParagraphs: editBody.split('\n'),
      footerLines: editFooter.split('\n'),
      pageSize: editPageSize,
      showGradesTable: editShowGrades,
      gradesTableTitle: editGradesTitle,
    }
    setSaving(true)
    try {
      const payload = {
        templateType: 'text-document',
        template: updated,
        meta: { plan },
      }
      await fetch(`/api/cert-layouts?id=${layoutId}&plan=${plan}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: payload }),
      })
      setTemplate(updated)
      toast({ title: 'Guardado', description: 'Plantilla actualizada correctamente.' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Print from preview
  const handlePrint = () => {
    if (!previewCertData && !previewRef.current) return
    const data = previewCertData || SAMPLE_CERT_DATA
    if (!previewRef.current) return
    const pageSize = editPageSize
    const pageSizes: Record<string, string> = { carta: 'letter', legal: 'legal', a4: 'A4' }
    const pageWidths: Record<string, string> = { carta: '8.5in', legal: '8.5in', a4: '210mm' }
    const pageHeights: Record<string, string> = { carta: '11in', legal: '14in', a4: '297mm' }

    const currentTemplate: TextTemplate = {
      headerLines: editHeader.split('\n'),
      bodyParagraphs: editBody.split('\n'),
      footerLines: editFooter.split('\n'),
      pageSize: editPageSize,
      showGradesTable: editShowGrades,
      gradesTableTitle: editGradesTitle,
    }

    let docHtml = '<!DOCTYPE html><html><head><title>Documento</title>'
    docHtml += `<style>`
    docHtml += `@page{size:${pageSizes[pageSize]};margin:1in 1.2in}`
    docHtml += `*{margin:0;padding:0;box-sizing:border-box}`
    docHtml += `body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;color:#000}`
    docHtml += `.header{text-align:center;margin-bottom:24pt}`
    docHtml += `.header .line{display:block}`
    docHtml += `.header .school-name{font-weight:bold;font-size:12pt;margin:4pt 0}`
    docHtml += `.header .location{font-size:10pt}`
    docHtml += `.doc-title{text-align:center;font-weight:bold;font-size:12pt;text-decoration:underline;margin:18pt 0 12pt}`
    docHtml += `.student-block{text-align:center;margin:12pt 0;padding:8pt;border:1px solid #999;display:inline-block;min-width:300pt}`
    docHtml += `.student-name{font-weight:bold;font-size:12pt}`
    docHtml += `.body-text{text-align:justify;margin:6pt 0}`
    docHtml += `.signatures{margin-top:36pt}`
    docHtml += `.sig-line{margin-top:36pt;text-align:center}`
    docHtml += `.sig-name{font-weight:bold;text-align:center}`
    docHtml += `.sig-role{text-align:center;font-size:10pt}`
    docHtml += `table{border-collapse:collapse;width:100%;font-size:9pt;margin:12pt 0}`
    docHtml += `th,td{border:1px solid #333;padding:4px 6px}`
    docHtml += `th{background:#f0f0f0;font-weight:bold}`
    docHtml += `</style></head><body>`

    docHtml += '<div class="header">'
    for (const line of currentTemplate.headerLines) {
      const resolved = line.replace(/\{\{[^}]+\}\}/g, (tok) => resolveTemplateToken(tok, data))
      if (line.includes('denominacion')) docHtml += `<span class="line school-name">${resolved}</span>`
      else if (line.includes('estado')) docHtml += `<span class="line location">${resolved}</span>`
      else docHtml += `<span class="line">${resolved}</span>`
      docHtml += '<br/>'
    }
    docHtml += '</div>'

    for (const para of currentTemplate.bodyParagraphs) {
      const resolved = para.replace(/\{\{[^}]+\}\}/g, (tok) => resolveTemplateToken(tok, data))
      const isTitle = !para.includes('{{') && para.trim().length > 0 && currentTemplate.bodyParagraphs.indexOf(para) === 0
      if (isTitle) {
        docHtml += `<div class="doc-title">${resolved}</div>`
      } else if (para.includes('{{estudiante.apellidos}}') || para.includes('{{estudiante.nombres}}')) {
        docHtml += '<div class="student-block">'
        docHtml += `<div class="student-name">${resolved}</div>`
        docHtml += '</div>'
      } else if (resolved.trim() === '') {
        docHtml += '<br/>'
      } else {
        docHtml += `<p class="body-text">${resolved}</p>`
      }
    }

    if (currentTemplate.showGradesTable) {
      const yearOrder = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']
      docHtml += `<p style="text-align:center;font-weight:bold;margin:12pt 0">${currentTemplate.gradesTableTitle}</p>`
      docHtml += '<table><thead><tr style="background:#f0f0f0">'
      docHtml += '<th style="border:1px solid #333;padding:4px 6px">Año</th>'
      docHtml += '<th style="border:1px solid #333;padding:4px 6px">Asignatura</th>'
      docHtml += '<th style="border:1px solid #333;padding:4px 6px">Nota</th>'
      docHtml += '<th style="border:1px solid #333;padding:4px 6px">Literal</th>'
      docHtml += '<th style="border:1px solid #333;padding:4px 6px">Eval.</th>'
      docHtml += '</tr></thead><tbody>'
      for (const yearName of yearOrder) {
        const grades = data.calificaciones?.[yearName]
        if (!grades) continue
        let first = true
        const validGrades = grades.filter(g => g.nota && g.nota.trim() !== '' && !/^\*+$/.test(g.nota))
        for (const g of validGrades) {
          docHtml += '<tr>'
          if (first) { docHtml += `<td style="border:1px solid #333;padding:4px 6px;font-weight:bold" rowspan="${validGrades.length}">${yearName}</td>`; first = false }
          docHtml += `<td style="border:1px solid #333;padding:4px 6px">${g.materia}</td>`
          docHtml += `<td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.nota}</td>`
          docHtml += `<td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.literal}</td>`
          docHtml += `<td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.tipoEvaluacion || ''}</td>`
          docHtml += '</tr>'
        }
      }
      docHtml += '</tbody></table>'
    }

    docHtml += '<div class="signatures">'
    for (const line of currentTemplate.footerLines) {
      const resolved = line.replace(/\{\{[^}]+\}\}/g, (tok) => resolveTemplateToken(tok, data))
      if (resolved.trim() === '') { docHtml += '<br/>'; continue }
      if (/^_{3,}/.test(resolved.trim())) { docHtml += `<div class="sig-line">${resolved}</div>`; continue }
      if (line.includes('{{director.apellidosNombres}}') && !line.includes('C.I.')) { docHtml += `<div class="sig-name">${resolved}</div>`; continue }
      if (line.includes('C.I. {{director.cedula}}')) { docHtml += `<div class="sig-role">${resolved}</div>`; continue }
      if (line.includes('Secretaria') || line.includes('Director')) { docHtml += `<div class="sig-role">${resolved}</div>`; continue }
      docHtml += `<p class="body-text">${resolved}</p>`
    }
    docHtml += '</div></body></html>'

    let iframe = document.getElementById('text-editor-print-frame') as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'text-editor-print-frame'
      iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${pageWidths[pageSize]};height:${pageHeights[pageSize]};border:none`
      document.body.appendChild(iframe)
    }
    const doc = iframe.contentDocument!
    doc.open(); doc.write(docHtml); doc.close()
    setTimeout(() => { iframe!.contentWindow!.print() }, 300)
  }

  // Current template for preview (live from edits)
  const liveTemplate: TextTemplate = {
    headerLines: editHeader.split('\n'),
    bodyParagraphs: editBody.split('\n'),
    footerLines: editFooter.split('\n'),
    pageSize: editPageSize,
    showGradesTable: editShowGrades,
    gradesTableTitle: editGradesTitle,
  }

  const previewData = previewCertData || SAMPLE_CERT_DATA
  const yearOrder = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-400">Cargando plantilla...</span>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-3">
        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => router.push('/editor-formatos')} className="h-8 text-xs">
            <ArrowLeft className="h-3 w-3 mr-1" /> Volver
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white">{layoutName}</h1>
            <p className="text-[10px] text-gray-400">Editor de documento de texto</p>
          </div>
          <Badge variant={plan === 'derogado' ? 'destructive' : 'default'} className="text-[10px]">
            {plan === 'derogado' ? 'DEROGADO' : 'VIGENTE'}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)} className="h-8 text-xs">
            {showPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
            {showPreview ? 'Ocultar Vista' : 'Vista Previa'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs bg-blue-600 hover:bg-blue-500">
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs">
            <Printer className="h-3 w-3 mr-1" /> Imprimir
          </Button>
        </div>

        {/* Preview student search */}
        {showPreview && (
          <div className="flex items-center gap-2 flex-wrap">
            <StudentSearch
              onSelect={handleSelectPreviewStudent}
              placeholder="Buscar alumno para vista previa con datos reales..."
              plan={plan}
            />
            {previewStudent && (
              <Badge variant="outline" className="text-emerald-400 border-emerald-700 text-[10px]">
                {previewStudent.apellidos}, {previewStudent.nombres}
              </Badge>
            )}
            {!previewStudent && (
              <span className="text-[10px] text-gray-500">Mostrando datos de ejemplo</span>
            )}
            {loadingPreview && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
          </div>
        )}

        {/* Two-column layout: editor + preview */}
        <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
          {/* Left: Editor panel */}
          <div className={`space-y-3 shrink-0 ${showPreview ? 'w-[420px]' : 'w-full'}`}>
            {/* Header lines */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-gray-300">Encabezado</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <textarea
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded p-2 text-xs font-mono min-h-[80px] focus:border-blue-600 focus:outline-none resize-y"
                  value={editHeader}
                  onChange={(e) => setEditHeader(e.target.value)}
                  placeholder="Una linea por fila. Usa {{campo}} para insertar datos dinamicos."
                />
              </CardContent>
            </Card>

            {/* Body paragraphs */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-gray-300">Cuerpo del Documento</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <textarea
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded p-2 text-xs font-mono min-h-[200px] focus:border-blue-600 focus:outline-none resize-y"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Una linea por fila. Lineas vacias generan espacios. Usa {{campo}} para insertar datos."
                />
              </CardContent>
            </Card>

            {/* Footer lines */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-gray-300">Pie de Pagina (Firmas, Observaciones)</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <textarea
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded p-2 text-xs font-mono min-h-[120px] focus:border-blue-600 focus:outline-none resize-y"
                  value={editFooter}
                  onChange={(e) => setEditFooter(e.target.value)}
                  placeholder="Una linea por fila. Usa _____ para lineas de firma."
                />
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-gray-300">Configuracion</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-gray-400 w-24 shrink-0">Tamano hoja:</Label>
                  <select
                    className="bg-gray-900 text-white border border-gray-700 rounded px-2 py-1 text-xs flex-1"
                    value={editPageSize}
                    onChange={(e) => setEditPageSize(e.target.value as any)}
                  >
                    <option value="carta">Carta</option>
                    <option value="legal">Legal</option>
                    <option value="a4">A4</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="show-grades"
                    checked={editShowGrades}
                    onChange={(e) => setEditShowGrades(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="show-grades" className="text-xs text-gray-400">Incluir tabla de calificaciones</Label>
                </div>
                {editShowGrades && (
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-gray-400 w-24 shrink-0">Titulo tabla:</Label>
                    <Input
                      className="bg-gray-900 text-white border-gray-700 text-xs h-8 flex-1"
                      value={editGradesTitle}
                      onChange={(e) => setEditGradesTitle(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available fields */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="px-3 py-2">
                <p className="text-[10px] text-gray-500 font-semibold mb-1">Campos disponibles:</p>
                <div className="flex flex-wrap gap-1">
                  {['denominacion','od','estado','municipio','direccion','telefono','planEstudio','director.apellidosNombres','director.cedula','estudiante.apellidos','estudiante.nombres','estudiante.cedula','estudiante.fechaNacimiento','promedioAcumulado','lugar','fechaExpedicion'].map(f => (
                    <code key={f} className="text-[10px] bg-gray-900 text-blue-300 px-1.5 py-0.5 rounded">{`{{${f}}}`}</code>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Live preview */}
          {showPreview && (
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded border shadow-lg mx-auto" style={{ maxWidth: '760px' }}>
                <div ref={previewRef} className="p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.6', color: '#000' }}>
                  {/* Header */}
                  <div className="text-center" style={{ marginBottom: '20pt' }}>
                    {liveTemplate.headerLines.map((line, i) => {
                      const resolved = processTemplateLine(line, previewData)
                      const isSchoolName = line.includes('{{denominacion}}')
                      const isLocation = line.includes('{{estado}}')
                      return (
                        <div key={`h-${i}`} className={isSchoolName ? 'font-bold text-sm' : isLocation ? 'text-[10pt]' : ''}>
                          {resolved}
                        </div>
                      )
                    })}
                  </div>

                  {/* Body */}
                  {liveTemplate.bodyParagraphs.map((para, i) => {
                    const isStudentLine = para.includes('{{estudiante.apellidos}}') || para.includes('{{estudiante.nombres}}')
                    const isTitle = i === 0 && !para.includes('{{') && para.trim().length > 0

                    if (isTitle) {
                      return (
                        <div key={`b-${i}`} className="text-center font-bold underline" style={{ fontSize: '12pt', margin: '16pt 0 10pt' }}>
                          {para}
                        </div>
                      )
                    }
                    if (isStudentLine) {
                      return (
                        <div key={`b-${i}`} className="text-center" style={{ margin: '10pt 0' }}>
                          <div style={{ display: 'inline-block', border: '1px solid #999', padding: '6pt 20pt', minWidth: '280pt' }}>
                            <div className="font-bold" style={{ fontSize: '12pt' }}>
                              {processTemplateLine(para, previewData)}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    if (para.trim() === '') return <div key={`b-${i}`} style={{ height: '8pt' }} />
                    return (
                      <p key={`b-${i}`} className="text-justify" style={{ margin: '4pt 0' }}>
                        {processTemplateLine(para, previewData)}
                      </p>
                    )
                  })}

                  {/* Grades table */}
                  {liveTemplate.showGradesTable && (
                    <>
                      <p className="text-center font-bold" style={{ margin: '10pt 0' }}>
                        {liveTemplate.gradesTableTitle}
                      </p>
                      <div className="overflow-x-auto">
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '9pt', margin: '8pt 0' }}>
                          <thead>
                            <tr style={{ background: '#f0f0f0' }}>
                              <th style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>Año</th>
                              <th style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>Asignatura</th>
                              <th style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>Nota</th>
                              <th style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>Literal</th>
                              <th style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>Eval.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yearOrder.map(yearName => {
                              const grades = previewData.calificaciones?.[yearName]
                              if (!grades || grades.length === 0) return null
                              const validGrades = grades.filter(g => g.nota && g.nota.trim() !== '' && !/^\*+$/.test(g.nota))
                              if (validGrades.length === 0) return null
                              return validGrades.map((g, gi) => (
                                <tr key={`${yearName}-${gi}`}>
                                  {gi === 0 && (
                                    <td style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center', verticalAlign: 'top', fontWeight: 'bold' }}
                                      rowSpan={validGrades.length}>
                                      {yearName}
                                    </td>
                                  )}
                                  <td style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'left' }}>{g.materia}</td>
                                  <td style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>{g.nota}</td>
                                  <td style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>{g.literal}</td>
                                  <td style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>{g.tipoEvaluacion || ''}</td>
                                </tr>
                              ))
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Footer */}
                  <div style={{ marginTop: '28pt' }}>
                    {liveTemplate.footerLines.map((line, i) => {
                      const isSigLine = /^_{3,}/.test(line.trim())
                      const isDirectorName = line.includes('{{director.apellidosNombres}}') && !line.includes('C.I.')
                      const isCedula = line.includes('{{director.cedula}}')
                      const isRole = line.includes('Secretaria') || (line.includes('Director') && !line.includes('{{director'))

                      if (line.trim() === '') return <div key={`f-${i}`} style={{ height: '8pt' }} />
                      if (isSigLine) return <div key={`f-${i}`} className="text-center" style={{ marginTop: '28pt' }}>{line}</div>
                      if (isDirectorName) return <div key={`f-${i}`} className="text-center font-bold">{processTemplateLine(line, previewData)}</div>
                      if (isCedula) return <div key={`f-${i}`} className="text-center text-[10pt]">{processTemplateLine(line, previewData)}</div>
                      if (isRole) return <div key={`f-${i}`} className="text-center text-[10pt]">{line}</div>

                      return (
                        <p key={`f-${i}`} className="text-justify" style={{ margin: '4pt 0' }}>
                          {processTemplateLine(line, previewData)}
                        </p>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function TextEditorPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </AppShell>
    }>
      <TextEditorContent />
    </Suspense>
  )
}
