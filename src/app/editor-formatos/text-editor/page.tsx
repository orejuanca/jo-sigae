'use client'

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StudentSearch } from '@/components/student-search'
import { useToast } from '@/hooks/use-toast'
import { notaEnLetras, formatCedulaFinal } from '@/lib/school-config'
import {
  Save, Loader2, ArrowLeft, Printer, Search, Plus, Trash2,
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
    parts.push(<span key={match.index} className="font-semibold">{resolved}</span>)
    lastIndex = regex.lastIndex
  }
  if (lastIndex < line.length) parts.push(line.substring(lastIndex))
  return parts.length > 0 ? parts : [line]
}

// Sample certData for preview when no student is selected
const SAMPLE_CERT_DATA: CertData = {
  lugar: 'Caracas',
  fechaExpedicion: '15/08/2026',
  planEstudio: 'Plan de Estudios vigente (Ley Organica de Educacion)',
  od: 'OD-12345',
  denominacion: 'U.E. COLEGIO BOLIVARIANO "JUAN ANTONIO RODRIGUEZ DOMINGUEZ"',
  direccion: 'Av. Principal, Zona Educativa',
  telefono: '0212-1234567',
  municipio: 'Sucre',
  estado: 'Miranda',
  cdcce: 'CD-12345',
  estudiante: {
    cedula: 'V-12.345.678',
    fechaNacimiento: '15/03/2005',
    apellidos: 'GARCIA RODRIGUEZ',
    nombres: 'MARIA JOSEFINA',
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
      { materia: 'Matematica', numero: 2, nota: '16', literal: 'B', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
      { materia: 'Ciencias de la Naturaleza', numero: 3, nota: '15', literal: 'B', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
    ],
    'Segundo Año': [
      { materia: 'Castellano y Literatura', numero: 1, nota: '17', literal: 'MB', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
      { materia: 'Matematica', numero: 2, nota: '19', literal: 'MB', tipoEvaluacion: 'AC', fechaMes: '', fechaAnio: '', instEduc: '' },
    ],
  },
  orientacion: [],
  grupos: [],
  observaciones: '',
  observacionesLines: [],
  promedioAcumulado: '16.80',
  director: { apellidosNombres: 'ANA MARIA PEREZ', cedula: 'V-8.765.432' },
  directorCdcce: { apellidosNombres: 'JOSE LUIS MARTINEZ', cedula: 'V-5.432.109' },
  acta: '',
  actaFecha: '',
  actaAnio: '',
  literalesFinales: [],
}

// Inline editable line component
function EditableLine({
  value,
  onChange,
  onRemove,
  onAddAfter,
  canRemove,
  className,
  style,
  placeholder,
  isTextArea,
}: {
  value: string
  onChange: (val: string) => void
  onRemove: () => void
  onAddAfter: () => void
  canRemove: boolean
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  isTextArea?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalValue(value) }, [value])

  const handleBlur = () => {
    setEditing(false)
    if (localValue !== value) onChange(localValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBlur()
    }
  }

  return (
    <div className="group relative flex items-start gap-1" style={style}>
      {/* Editable content */}
      {editing ? (
        <textarea
          ref={ref as any}
          className="flex-1 border border-blue-400 bg-blue-50/80 rounded px-1 py-0.5 text-[inherit] font-[inherit] text-left outline-none resize-none focus:ring-1 focus:ring-blue-400"
          style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', color: '#000', minHeight: '1.4em' }}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={1}
        />
      ) : (
        <div
          className={`flex-1 cursor-text hover:bg-blue-50/60 rounded px-1 py-0.5 transition-colors min-h-[1.4em] ${className || ''}`}
          style={style}
          onClick={() => setEditing(true)}
        >
          {value || <span className="text-gray-300 italic">{placeholder || 'Doble clic para editar...'}</span>}
        </div>
      )}
      {/* Action buttons - show on hover */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-px">
        <button
          onClick={onAddAfter}
          className="w-4 h-4 flex items-center justify-center rounded bg-green-100 hover:bg-green-200 text-green-700"
          title="Agregar linea"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
        {canRemove && (
          <button
            onClick={onRemove}
            className="w-4 h-4 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 text-red-700"
            title="Eliminar linea"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  )
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

  // Preview state
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null)
  const [previewCertData, setPreviewCertData] = useState<CertData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
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
          setTemplate(parsed.template)
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

  // Template line editors
  const updateHeaderLine = (index: number, value: string) => {
    if (!template) return
    const updated = { ...template, headerLines: [...template.headerLines] }
    updated.headerLines[index] = value
    setTemplate(updated)
  }

  const addHeaderLine = (index: number) => {
    if (!template) return
    const updated = { ...template, headerLines: [...template.headerLines] }
    updated.headerLines.splice(index + 1, 0, '')
    setTemplate(updated)
  }

  const removeHeaderLine = (index: number) => {
    if (!template || template.headerLines.length <= 1) return
    const updated = { ...template, headerLines: [...template.headerLines] }
    updated.headerLines.splice(index, 1)
    setTemplate(updated)
  }

  const updateBodyLine = (index: number, value: string) => {
    if (!template) return
    const updated = { ...template, bodyParagraphs: [...template.bodyParagraphs] }
    updated.bodyParagraphs[index] = value
    setTemplate(updated)
  }

  const addBodyLine = (index: number) => {
    if (!template) return
    const updated = { ...template, bodyParagraphs: [...template.bodyParagraphs] }
    updated.bodyParagraphs.splice(index + 1, 0, '')
    setTemplate(updated)
  }

  const removeBodyLine = (index: number) => {
    if (!template || template.bodyParagraphs.length <= 1) return
    const updated = { ...template, bodyParagraphs: [...template.bodyParagraphs] }
    updated.bodyParagraphs.splice(index, 1)
    setTemplate(updated)
  }

  const updateFooterLine = (index: number, value: string) => {
    if (!template) return
    const updated = { ...template, footerLines: [...template.footerLines] }
    updated.footerLines[index] = value
    setTemplate(updated)
  }

  const addFooterLine = (index: number) => {
    if (!template) return
    const updated = { ...template, footerLines: [...template.footerLines] }
    updated.footerLines.splice(index + 1, 0, '')
    setTemplate(updated)
  }

  const removeFooterLine = (index: number) => {
    if (!template || template.footerLines.length <= 1) return
    const updated = { ...template, footerLines: [...template.footerLines] }
    updated.footerLines.splice(index, 1)
    setTemplate(updated)
  }

  // Save
  const handleSave = async () => {
    if (!template) return
    setSaving(true)
    try {
      const payload = {
        templateType: 'text-document',
        template,
        meta: { plan },
      }
      await fetch(`/api/cert-layouts?id=${layoutId}&plan=${plan}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: payload }),
      })
      toast({ title: 'Guardado', description: 'Plantilla actualizada correctamente.' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Print
  const handlePrint = () => {
    if (!template || !previewRef.current) return
    const data = previewCertData || SAMPLE_CERT_DATA
    const pageSize = template.pageSize
    const pageSizes: Record<string, string> = { carta: 'letter', legal: 'legal', a4: 'A4' }
    const pageWidths: Record<string, string> = { carta: '8.5in', legal: '8.5in', a4: '210mm' }
    const pageHeights: Record<string, string> = { carta: '11in', legal: '14in', a4: '297mm' }

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
    for (const line of template.headerLines) {
      const resolved = line.replace(/\{\{[^}]+\}\}/g, (tok) => resolveTemplateToken(tok, data))
      if (line.includes('denominacion')) docHtml += `<span class="line school-name">${resolved}</span>`
      else if (line.includes('estado')) docHtml += `<span class="line location">${resolved}</span>`
      else docHtml += `<span class="line">${resolved}</span>`
      docHtml += '<br/>'
    }
    docHtml += '</div>'

    for (const para of template.bodyParagraphs) {
      const resolved = para.replace(/\{\{[^}]+\}\}/g, (tok) => resolveTemplateToken(tok, data))
      const isTitle = !para.includes('{{') && para.trim().length > 0 && template.bodyParagraphs.indexOf(para) === 0
      if (isTitle) {
        docHtml += `<div class="doc-title">${resolved}</div>`
      } else if (para.includes('{{estudiante.apellidos}}') || para.includes('{{estudiante.nombres}}')) {
        docHtml += '<div class="student-block"><div class="student-name">' + resolved + '</div></div>'
      } else if (resolved.trim() === '') {
        docHtml += '<br/>'
      } else {
        docHtml += `<p class="body-text">${resolved}</p>`
      }
    }

    if (template.showGradesTable) {
      const yearOrder = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']
      docHtml += `<p style="text-align:center;font-weight:bold;margin:12pt 0">${template.gradesTableTitle}</p>`
      docHtml += '<table><thead><tr style="background:#f0f0f0">'
      docHtml += '<th style="border:1px solid #333;padding:4px 6px">Año</th><th style="border:1px solid #333;padding:4px 6px">Asignatura</th><th style="border:1px solid #333;padding:4px 6px">Nota</th><th style="border:1px solid #333;padding:4px 6px">Literal</th><th style="border:1px solid #333;padding:4px 6px">Eval.</th>'
      docHtml += '</tr></thead><tbody>'
      for (const yearName of yearOrder) {
        const grades = data.calificaciones?.[yearName]
        if (!grades) continue
        let first = true
        const validGrades = grades.filter(g => g.nota && g.nota.trim() !== '' && !/^\*+$/.test(g.nota))
        for (const g of validGrades) {
          docHtml += '<tr>'
          if (first) { docHtml += `<td style="border:1px solid #333;padding:4px 6px;font-weight:bold" rowspan="${validGrades.length}">${yearName}</td>`; first = false }
          docHtml += `<td style="border:1px solid #333;padding:4px 6px">${g.materia}</td><td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.nota}</td><td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.literal}</td><td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.tipoEvaluacion || ''}</td></tr>`
        }
      }
      docHtml += '</tbody></table>'
    }

    docHtml += '<div class="signatures">'
    for (const line of template.footerLines) {
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

  const previewData = previewCertData || SAMPLE_CERT_DATA
  const yearOrder = ['Primer Año', 'Segundo Año', 'Tercer Año', 'Cuarto Año', 'Quinto Año']

  if (loading || !template) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-400">Cargando plantilla...</span>
        </div>
      </AppShell>
    )
  }

  const gradeCount = previewCertData
    ? Object.values(previewCertData.calificaciones).flat().filter(c => c.nota && c.nota !== '' && !/^\*+$/.test(c.nota)).length
    : 0

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Top bar - SAME layout as /VALIDAR */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => router.push('/editor-formatos')} className="h-8 text-xs">
            <ArrowLeft className="h-3 w-3 mr-1" /> Volver
          </Button>
          <div className="flex-1 min-w-[250px]">
            <StudentSearch
              onSelect={handleSelectPreviewStudent}
              placeholder="Buscar alumno para vista previa con datos reales..."
              plan={plan}
              autoFocus
            />
          </div>
          {previewStudent && (
            <div className="flex items-center gap-2">
              <Badge variant={plan === 'derogado' ? 'destructive' : 'default'}>
                {plan === 'derogado' ? 'Plan Derogado' : 'Plan Vigente'}
              </Badge>
              <span className="text-sm font-medium text-white">
                {previewStudent.apellidos}, {previewStudent.nombres}
              </span>
              <span className="text-xs text-gray-400">
                C.I.: {formatCedulaFinal(previewStudent.cedula)}
              </span>
              {gradeCount > 0 && (
                <Badge variant="outline" className="text-emerald-400 border-emerald-700">
                  {gradeCount} notas
                </Badge>
              )}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs">
            <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs bg-blue-600 hover:bg-blue-500">
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          {loadingPreview && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        {/* Config bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-400">Tamano hoja:</Label>
            <select
              className="bg-gray-900 text-white border border-gray-700 rounded px-2 py-1 text-xs"
              value={template.pageSize}
              onChange={(e) => setTemplate({ ...template, pageSize: e.target.value as any })}
            >
              <option value="carta">Carta</option>
              <option value="legal">Legal</option>
              <option value="a4">A4</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-grades-edit"
              checked={template.showGradesTable}
              onChange={(e) => setTemplate({ ...template, showGradesTable: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="show-grades-edit" className="text-xs text-gray-400">Tabla de calificaciones</Label>
          </div>
          {template.showGradesTable && (
            <Input
              className="bg-gray-900 text-white border-gray-700 text-xs h-8 max-w-[250px]"
              value={template.gradesTableTitle}
              onChange={(e) => setTemplate({ ...template, gradesTableTitle: e.target.value })}
              placeholder="Titulo de la tabla"
            />
          )}
          <span className="text-[10px] text-gray-500 italic">
            Haz clic en cualquier linea del documento para editarla
          </span>
        </div>

        {/* Document - SAME structure as /VALIDAR but every line is editable */}
        <div className="bg-white rounded border shadow-lg mx-auto" style={{ maxWidth: '760px' }}>
          <div ref={previewRef} className="p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.6', color: '#000' }}>

            {/* Header */}
            <div className="text-center" style={{ marginBottom: '20pt' }}>
              {template.headerLines.map((line, i) => {
                const isSchoolName = line.includes('{{denominacion}}')
                const isLocation = line.includes('{{estado}}')
                return (
                  <EditableLine
                    key={`h-${i}`}
                    value={line}
                    onChange={(val) => updateHeaderLine(i, val)}
                    onRemove={() => removeHeaderLine(i)}
                    onAddAfter={() => addHeaderLine(i)}
                    canRemove={template.headerLines.length > 1}
                    className={isSchoolName ? 'font-bold text-sm text-center' : isLocation ? 'text-[10pt] text-center' : 'text-center'}
                    placeholder={`Linea de encabezado ${i + 1}`}
                  />
                )
              })}
            </div>

            {/* Body paragraphs */}
            {template.bodyParagraphs.map((para, i) => {
              const isStudentLine = para.includes('{{estudiante.apellidos}}') || para.includes('{{estudiante.nombres}}')
              const isTitle = i === 0 && !para.includes('{{') && para.trim().length > 0

              if (isTitle) {
                return (
                  <div key={`b-${i}`} style={{ margin: '16pt 0 10pt' }}>
                    <EditableLine
                      value={para}
                      onChange={(val) => updateBodyLine(i, val)}
                      onRemove={() => removeBodyLine(i)}
                      onAddAfter={() => addBodyLine(i)}
                      canRemove={template.bodyParagraphs.length > 1}
                      className="text-center font-bold underline"
                      style={{ fontSize: '12pt' }}
                      placeholder="Titulo del documento"
                    />
                  </div>
                )
              }

              if (isStudentLine) {
                return (
                  <div key={`b-${i}`} className="text-center" style={{ margin: '10pt 0' }}>
                    <EditableLine
                      value={para}
                      onChange={(val) => updateBodyLine(i, val)}
                      onRemove={() => removeBodyLine(i)}
                      onAddAfter={() => addBodyLine(i)}
                      canRemove={template.bodyParagraphs.length > 1}
                      className="font-bold"
                      style={{ fontSize: '12pt', display: 'inline-block', border: '1px solid #999', padding: '6pt 20pt', minWidth: '280pt' }}
                      placeholder="Datos del estudiante"
                    />
                  </div>
                )
              }

              if (para.trim() === '') {
                return (
                  <EditableLine
                    key={`b-${i}`}
                    value={para}
                    onChange={(val) => updateBodyLine(i, val)}
                    onRemove={() => removeBodyLine(i)}
                    onAddAfter={() => addBodyLine(i)}
                    canRemove={template.bodyParagraphs.length > 1}
                    style={{ height: '8pt' }}
                  />
                )
              }

              return (
                <EditableLine
                  key={`b-${i}`}
                  value={para}
                  onChange={(val) => updateBodyLine(i, val)}
                  onRemove={() => removeBodyLine(i)}
                  onAddAfter={() => addBodyLine(i)}
                  canRemove={template.bodyParagraphs.length > 1}
                  className="text-justify"
                  style={{ margin: '4pt 0' }}
                />
              )
            })}

            {/* Grades table */}
            {template.showGradesTable && (
              <>
                <div className="text-center font-bold" style={{ margin: '10pt 0' }}>
                  {template.gradesTableTitle}
                </div>
                <div className="overflow-x-auto">
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '9pt', margin: '8pt 0' }}>
                    <thead>
                      <tr style={{ background: '#f0f0f0' }}>
                        <th style={{ border: '1px solid #333', padding: '3px 5px', textAlign: 'center' }}>Ano</th>
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
              {template.footerLines.map((line, i) => {
                if (line.trim() === '') {
                  return (
                    <EditableLine
                      key={`f-${i}`}
                      value={line}
                      onChange={(val) => updateFooterLine(i, val)}
                      onRemove={() => removeFooterLine(i)}
                      onAddAfter={() => addFooterLine(i)}
                      canRemove={template.footerLines.length > 1}
                      style={{ height: '8pt' }}
                    />
                  )
                }

                const isSigLine = /^_{3,}/.test(line.trim())
                const isDirectorName = line.includes('{{director.apellidosNombres}}') && !line.includes('C.I.')
                const isCedula = line.includes('{{director.cedula}}')
                const isRole = line.includes('Secretaria') || (line.includes('Director') && !line.includes('{{director'))

                return (
                  <EditableLine
                    key={`f-${i}`}
                    value={line}
                    onChange={(val) => updateFooterLine(i, val)}
                    onRemove={() => removeFooterLine(i)}
                    onAddAfter={() => addFooterLine(i)}
                    canRemove={template.footerLines.length > 1}
                    className={isDirectorName ? 'text-center font-bold' : isCedula || isRole || isSigLine ? 'text-center text-[10pt]' : 'text-justify'}
                    style={isSigLine ? { marginTop: '28pt' } : isCedula || isRole ? {} : { margin: '4pt 0' }}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Hint */}
        {!previewStudent && (
          <div className="text-center">
            <span className="text-[10px] text-gray-500">
              Mostrando datos de ejemplo. Busca un alumno arriba para ver con datos reales.
            </span>
          </div>
        )}
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
