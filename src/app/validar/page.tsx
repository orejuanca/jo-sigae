'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { AppShell } from '@/components/app-shell'
import { useCurrentPlan } from '@/hooks/use-current-plan'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StudentSearch } from '@/components/student-search'
import { useToast } from '@/hooks/use-toast'
import { notaEnLetras, formatCedulaFinal } from '@/lib/school-config'
import {
  Search, Printer, Loader2,
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

// Template text document structure
interface TextTemplate {
  headerLines: string[]
  bodyParagraphs: string[]
  footerLines: string[]
  pageSize: 'carta' | 'legal' | 'a4'
  showGradesTable: boolean
  gradesTableTitle: string
}

// Default template for "Validacion de Notas"
const DEFAULT_TEMPLATE: TextTemplate = {
  headerLines: [
    'REPUBLICA BOLIVARIANA DE VENEZUELA',
    'MINISTERIO DEL PODER POPULAR PARA LA EDUCACION',
    '{{denominacion}}',
    '{{estado}} - {{municipio}}',
  ],
  bodyParagraphs: [
    'Validacion de Notas',
    '',
    'Quien suscribe, {{director.apellidosNombres}}, C.I. {{director.cedula}}, en mi condicion de Directora del Plantel {{denominacion}}, codigo {{od}}, hace constar que el(la) ciudadano(a):',
    '',
    '{{estudiante.apellidos}} {{estudiante.nombres}}',
    'C.I.: {{estudiante.cedula}}',
    '',
    'curso y aprobo en esta institucion las asignaturas correspondientes al {{planEstudio}}, segun se detalla a continuacion:',
  ],
  footerLines: [
    'Obteniendo un promedio acumulado de {{promedioAcumulado}} puntos.',
    '',
    'Las calificaciones aqui expresadas son fieles copia de los registros llevados en este plantel. Se expide a solicitud de la parte interesada, en {{lugar}}, a los {{fechaExpedicion}}.',
    '',
    '___________________________',
    '{{director.apellidosNombres}}',
    'C.I. {{director.cedula}}',
    'Directora',
    '',
    '___________________________',
    'Secretaria',
  ],
  pageSize: 'legal',
  showGradesTable: true,
  gradesTableTitle: 'RELACION DE CALIFICACIONES',
}

const LAYOUT_NAME = 'VALIDACION DE NOTAS'

function formatDateLong(dateStr: string): string {
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return dateStr
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const day = parseInt(m[1])
  const month = months[parseInt(m[2]) - 1] || m[2]
  const year = m[3]
  return `${day} de ${month} de ${year}`
}

// Replace {{placeholder}} tokens with data
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
    if (top !== undefined && top !== null) {
      value = String(top)
    }
  }

  if (key === 'fechaExpedicion' && value) {
    value = formatDateLong(value)
  }

  return value
}

// Process a line of text, replacing all {{tokens}} with values
function processTemplateLine(line: string, data: CertData | null): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /\{\{[^}]+\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index))
    }
    const resolved = resolveTemplateToken(match[0], data)
    parts.push(
      <span key={match.index} className="font-semibold">{resolved}</span>
    )
    lastIndex = regex.lastIndex
  }
  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [line]
}

// Build the grades table HTML for print
function buildGradesTableHtml(data: CertData): string {
  const yearOrder = ['Primer Ano', 'Segundo Ano', 'Tercer Ano', 'Cuarto Ano', 'Quinto Ano']
  let html = '<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:9pt;margin:12pt 0">'
  html += '<thead><tr style="background:#f0f0f0">'
  html += '<th style="border:1px solid #333;padding:4px 6px;text-align:center">Ano</th>'
  html += '<th style="border:1px solid #333;padding:4px 6px;text-align:center">Asignatura</th>'
  html += '<th style="border:1px solid #333;padding:4px 6px;text-align:center">Nota</th>'
  html += '<th style="border:1px solid #333;padding:4px 6px;text-align:center">Literal</th>'
  html += '<th style="border:1px solid #333;padding:4px 6px;text-align:center">Eval.</th>'
  html += '</tr></thead><tbody>'

  for (const yearName of yearOrder) {
    const grades = data.calificaciones?.[yearName]
    if (!grades || grades.length === 0) continue

    let first = true
    for (const g of grades) {
      if (!g.nota || g.nota.trim() === '' || /^\*+$/.test(g.nota)) continue
      html += '<tr>'
      if (first) {
        html += `<td style="border:1px solid #333;padding:4px 6px;text-align:center;vertical-align:top;font-weight:bold" rowspan="${grades.filter(x => x.nota && x.nota.trim() !== '' && !/^\*+$/.test(x.nota)).length}">${yearName}</td>`
        first = false
      }
      html += `<td style="border:1px solid #333;padding:4px 6px;text-align:left">${g.materia}</td>`
      html += `<td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.nota}</td>`
      html += `<td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.literal}</td>`
      html += `<td style="border:1px solid #333;padding:4px 6px;text-align:center">${g.tipoEvaluacion || ''}</td>`
      html += '</tr>'
    }
  }

  html += '</tbody></table>'
  return html
}

export default function ValidarPage() {
  const plan = useCurrentPlan()
  const { toast } = useToast()

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [certData, setCertData] = useState<CertData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [template, setTemplate] = useState<TextTemplate>(DEFAULT_TEMPLATE)
  const previewRef = useRef<HTMLDivElement>(null)

  // Load template from DB (CertLayouts) on mount — the template is edited
  // exclusively in the Editor de Formatos page and stored as a CertLayout.
  // Here we only read it.
  useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch(`/api/cert-layouts?plan=${plan}`)
        if (res.ok) {
          const layouts = await res.json()
          const layoutName = plan === 'derogado'
            ? `${LAYOUT_NAME} (DEROGADO)`
            : `${LAYOUT_NAME} (VIGENTE)`
          const found = layouts.find((l: any) => l.nombre === layoutName)
          if (found) {
            const detailRes = await fetch(`/api/cert-layouts?id=${found.id}&plan=${plan}`)
            if (detailRes.ok) {
              const detail = await detailRes.json()
              const parsed = typeof detail.datos === 'string' ? JSON.parse(detail.datos) : detail.datos
              if (parsed.templateType === 'text-document' && parsed.template) {
                setTemplate(parsed.template)
                return
              }
            }
          }
        }
      } catch { /* use default */ }
    }
    loadTemplate()
  }, [plan])

  // Load student cert data
  const handleSelectStudent = useCallback(async (student: Student) => {
    setSelectedStudent(student)
    setCertData(null)
    setLoadingData(true)
    try {
      const certApiUrl = plan === 'vigente'
        ? `/api/plan-vigente/${student.id}/cert-data`
        : `/api/plan-derogado/${student.id}/cert-data`
      const res = await fetch(certApiUrl)
      if (!res.ok) {
        toast({ title: 'Sin datos', description: `No se encontraron datos de calificaciones para ${student.cedula}.`, variant: 'destructive' })
        setLoadingData(false)
        return
      }
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
        setCertData(cd)
        const allCals = Object.values(cd.calificaciones || {}).flat() as CalificacionRow[]
        const gradeCount = allCals.filter(c => c.nota && c.nota !== '' && !/^\*+$/.test(c.nota)).length
        toast({ title: 'Datos cargados', description: `${gradeCount} calificaciones encontradas.` })
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar datos de calificaciones.', variant: 'destructive' })
    } finally {
      setLoadingData(false)
    }
  }, [plan, toast])

  // Print
  const handlePrint = () => {
    if (!certData || !previewRef.current) return
    const pageSize = template.pageSize
    const pageSizes: Record<string, string> = { carta: 'letter', legal: 'legal', a4: 'A4' }
    const pageWidths: Record<string, string> = { carta: '8.5in', legal: '8.5in', a4: '210mm' }
    const pageHeights: Record<string, string> = { carta: '11in', legal: '14in', a4: '297mm' }

    let docHtml = '<!DOCTYPE html><html><head><title>Validacion de Notas</title>'
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
    docHtml += `.student-cedula{margin-top:4pt}`
    docHtml += `.body-text{text-align:justify;margin:12pt 0;text-indent:0}`
    docHtml += `.body-text p{margin-bottom:8pt}`
    docHtml += `.signatures{margin-top:36pt}`
    docHtml += `.sig-line{margin-top:36pt;text-align:center}`
    docHtml += `.sig-name{font-weight:bold;text-align:center}`
    docHtml += `.sig-role{text-align:center;font-size:10pt}`
    docHtml += `table{border-collapse:collapse;width:100%;font-size:9pt;margin:12pt 0}`
    docHtml += `th,td{border:1px solid #333;padding:4px 6px}`
    docHtml += `th{background:#f0f0f0;font-weight:bold}`
    docHtml += `@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    docHtml += `</style></head><body>`

    // Header
    docHtml += '<div class="header">'
    for (const line of template.headerLines) {
      const resolved = resolveTemplateToken(line, certData)
      if (resolved.includes('{{')) {
        const plain = line.replace(/\{\{[^}]+\}\}/g, '')
        if (plain.trim()) {
          if (line.includes('denominacion')) docHtml += `<span class="line school-name">${plain}</span>`
          else if (line.includes('estado')) docHtml += `<span class="line location">${plain}</span>`
          else docHtml += `<span class="line">${plain}</span>`
        }
      } else {
        if (line.includes('denominacion')) docHtml += `<span class="line school-name">${resolved}</span>`
        else if (line.includes('estado')) docHtml += `<span class="line location">${resolved}</span>`
        else docHtml += `<span class="line">${resolved}</span>`
      }
      docHtml += '<br/>'
    }
    docHtml += '</div>'

    // Body paragraphs
    let foundTitle = false
    for (const para of template.bodyParagraphs) {
      const resolved = para.replace(/\{\{[^}]+\}\}/g, (token) => resolveTemplateToken(token, certData))

      if (!foundTitle && (para.trim() === '' || para === template.bodyParagraphs[0])) {
        if (template.bodyParagraphs[0] && !template.bodyParagraphs[0].includes('{{') && template.bodyParagraphs[0].trim().length > 0 && template.bodyParagraphs[0] === template.bodyParagraphs[template.headerLines.length > 0 ? 1 : 0]) {
          docHtml += `<div class="doc-title">${resolved}</div>`
          foundTitle = true
          continue
        }
      }

      if (para.includes('{{estudiante.apellidos}}') || para.includes('{{estudiante.nombres}}')) {
        docHtml += '<div style="text-align:center;margin:12pt 0;padding:8pt;border:1px solid #999;display:inline-block;min-width:300pt">'
        docHtml += `<div class="student-name">${resolved}</div>`
        docHtml += '</div><br/>'
        continue
      }

      if (resolved.trim() === '') {
        docHtml += '<br/>'
      } else {
        docHtml += `<p class="body-text" style="text-align:justify">${resolved}</p>`
      }
    }

    // Grades table
    if (template.showGradesTable) {
      docHtml += `<p style="text-align:center;font-weight:bold;margin:12pt 0">${template.gradesTableTitle}</p>`
      docHtml += buildGradesTableHtml(certData)
    }

    // Footer
    docHtml += '<div class="signatures">'
    for (const line of template.footerLines) {
      const resolved = line.replace(/\{\{[^}]+\}\}/g, (token) => resolveTemplateToken(token, certData))
      if (resolved.trim() === '') {
        docHtml += '<br/>'
      } else if (/^_{3,}/.test(resolved.trim())) {
        docHtml += `<div class="sig-line">${resolved}</div>`
      } else if (line.includes('{{director.apellidosNombres}}') && !line.includes('C.I.')) {
        docHtml += `<div class="sig-name">${resolved}</div>`
      } else if (line.includes('C.I. {{director.cedula}}')) {
        docHtml += `<div class="sig-role">${resolved}</div>`
      } else if (line.includes('Secretaria') || line.includes('Director')) {
        docHtml += `<div class="sig-role">${resolved}</div>`
      } else {
        docHtml += `<p class="body-text" style="text-align:justify">${resolved}</p>`
      }
    }
    docHtml += '</div></body></html>'

    // Print via iframe
    let iframe = document.getElementById('validar-print-frame') as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'validar-print-frame'
      iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${pageWidths[pageSize]};height:${pageHeights[pageSize]};border:none`
      document.body.appendChild(iframe)
    }
    const doc = iframe.contentDocument!
    doc.open()
    doc.write(docHtml)
    doc.close()
    setTimeout(() => { iframe!.contentWindow!.print() }, 300)
  }

  const gradeCount = useMemo(() => {
    if (!certData) return 0
    return Object.values(certData.calificaciones).flat().filter(c => c.nota && c.nota !== '' && !/^\*+$/.test(c.nota)).length
  }, [certData])

  const yearOrder = ['Primer Ano', 'Segundo Ano', 'Tercer Ano', 'Cuarto Ano', 'Quinto Ano']

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Top bar: search + print */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <StudentSearch
              onSelect={handleSelectStudent}
              placeholder="Buscar alumno por cedula, apellidos o nombres..."
              plan={plan}
              autoFocus
            />
          </div>
          {selectedStudent && (
            <div className="flex items-center gap-2">
              <Badge variant={plan === 'derogado' ? 'destructive' : 'default'}>
                {plan === 'derogado' ? 'Plan Derogado' : 'Plan Vigente'}
              </Badge>
              <span className="text-sm font-medium text-white">
                {selectedStudent.apellidos}, {selectedStudent.nombres}
              </span>
              <span className="text-xs text-gray-400">
                C.I.: {formatCedulaFinal(selectedStudent.cedula)}
              </span>
              {gradeCount > 0 && (
                <Badge variant="outline" className="text-emerald-400 border-emerald-700">
                  {gradeCount} notas
                </Badge>
              )}
            </div>
          )}
          {certData && (
            <Button size="sm" variant="outline" onClick={handlePrint}
              className="h-8 text-xs">
              <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
            </Button>
          )}
          {loadingData && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        {/* Document preview */}
        {certData && (
          <div className="bg-white rounded border shadow-lg mx-auto" style={{ maxWidth: '760px' }}>
            <div ref={previewRef} className="p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.6', color: '#000' }}>
              {/* Header */}
              <div className="text-center" style={{ marginBottom: '20pt' }}>
                {template.headerLines.map((line, i) => {
                  const resolved = processTemplateLine(line, certData)
                  const isSchoolName = line.includes('{{denominacion}}')
                  const isLocation = line.includes('{{estado}}')
                  return (
                    <div key={`h-${i}`} className={isSchoolName ? 'font-bold text-sm' : isLocation ? 'text-[10pt]' : ''}>
                      {resolved}
                    </div>
                  )
                })}
              </div>

              {/* Body paragraphs */}
              {template.bodyParagraphs.map((para, i) => {
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
                          {processTemplateLine(para, certData)}
                        </div>
                      </div>
                    </div>
                  )
                }

                if (para.trim() === '') {
                  return <div key={`b-${i}`} style={{ height: '8pt' }} />
                }

                return (
                  <p key={`b-${i}`} className="text-justify" style={{ margin: '4pt 0' }}>
                    {processTemplateLine(para, certData)}
                  </p>
                )
              })}

              {/* Grades table */}
              {template.showGradesTable && (
                <>
                  <p className="text-center font-bold" style={{ margin: '10pt 0' }}>
                    {template.gradesTableTitle}
                  </p>
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
                          const grades = certData.calificaciones?.[yearName]
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
                  const isSigLine = /^_{3,}/.test(line.trim())
                  const isDirectorName = line.includes('{{director.apellidosNombres}}') && !line.includes('C.I.')
                  const isCedula = line.includes('{{director.cedula}}')
                  const isRole = line.includes('Secretaria') || (line.includes('Director') && !line.includes('{{director'))

                  if (line.trim() === '') return <div key={`f-${i}`} style={{ height: '8pt' }} />
                  if (isSigLine) return <div key={`f-${i}`} className="text-center" style={{ marginTop: '28pt' }}>{line}</div>
                  if (isDirectorName) return <div key={`f-${i}`} className="text-center font-bold">{processTemplateLine(line, certData)}</div>
                  if (isCedula) return <div key={`f-${i}`} className="text-center text-[10pt]">{processTemplateLine(line, certData)}</div>
                  if (isRole) return <div key={`f-${i}`} className="text-center text-[10pt]">{line}</div>

                  return (
                    <p key={`f-${i}`} className="text-justify" style={{ margin: '4pt 0' }}>
                      {processTemplateLine(line, certData)}
                    </p>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* No student selected */}
        {!certData && !loadingData && (
          <div className="text-center py-16">
            <Search className="h-10 w-10 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">
              Busca un alumno para generar la Validacion de Notas
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
