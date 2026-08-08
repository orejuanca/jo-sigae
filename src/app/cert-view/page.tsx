'use client'

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StudentSearch } from '@/components/student-search'
import { useToast } from '@/hooks/use-toast'
import {
  type GridConfig, type DisplayData,
  emptyCell, resolveBinding,
} from '@/components/cert-visual/types'
import { notaEnLetras, formatCedulaFinal } from '@/lib/school-config'
import { Loader2, Printer } from 'lucide-react'

interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  plan?: string
}

function CertViewContent() {
  const searchParams = useSearchParams()
  const layoutId = searchParams.get('layout') || ''
  const plan = searchParams.get('plan') || 'vigente'
  const { toast } = useToast()

  const [gridConfig, setGridConfig] = useState<GridConfig | null>(null)
  const [loadingLayout, setLoadingLayout] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [displayData, setDisplayData] = useState<DisplayData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [rawDataFlat, setRawDataFlat] = useState<Record<string, string> | null>(null)

  // Load layout on mount
  useEffect(() => {
    if (!layoutId) { setLoadingLayout(false); return }
    fetch(`/api/cert-layouts?plan=${plan}&id=${layoutId}`)
      .then(async r => {
        if (!r.ok) { console.error('cert-layouts API error:', r.status, await r.text()) }
        return r.ok ? r.json() : null
      })
      .then(layout => {
        console.log('layout response:', layout?.id, layout?.nombre, layout?.datos ? 'datos=OK len=' + layout.datos.length : 'datos=NULL')
        if (layout?.datos) {
          const parsed = typeof layout.datos === 'string' ? JSON.parse(layout.datos) : layout.datos
          setGridConfig(parsed as GridConfig)
        }
        else toast({ title: 'Error', description: 'No se pudo cargar el formato.', variant: 'destructive' })
      })
      .catch(() => toast({ title: 'Error', description: 'Error cargando formato.', variant: 'destructive' }))
      .finally(() => setLoadingLayout(false))
  }, [layoutId, plan])

  // Build displayData when student is selected
  const handleSelectStudent = useCallback(async (student: Student) => {
    setSelectedStudent(student)
    setDisplayData(null)
    setRawDataFlat(null)
    setLoadingData(true)
    try {
      const certApiUrl = plan === 'vigente'
        ? `/api/plan-vigente/${student.id}/cert-data`
        : `/api/plan-derogado/${student.id}/cert-data`
      const res = await fetch(certApiUrl)
      if (!res.ok) {
        toast({ title: 'Sin datos', description: `No se encontraron datos para ${student.cedula}.`, variant: 'destructive' })
        setLoadingData(false)
        return
      }
      const result = await res.json()
      if (result.rawDataFlat) {
        const flat: Record<string, string> = {}
        for (const [k, v] of Object.entries(result.rawDataFlat)) {
          if (typeof v === 'string') flat[k] = v
          else if (v !== null && v !== undefined) flat[k] = String(v)
        }
        setRawDataFlat(flat)
      }
      if (result.certData) {
        const cd = result.certData
        // Fix literals
        if (cd.calificaciones) {
          for (const anio of Object.keys(cd.calificaciones)) {
            for (const cal of cd.calificaciones[anio]) {
              if (cal.nota === 'IN' && cal.literal !== 'INASISTENTE') cal.literal = 'INASISTENTE'
              if (cal.nota === 'PE' && cal.literal !== 'PENDIENTE') cal.literal = 'PENDIENTE'
              if (!cal.literal && cal.nota) cal.literal = notaEnLetras(cal.nota)
            }
          }
        }
        setDisplayData({
          lugar: cd.lugar || '',
          fechaExpedicion: cd.fechaExpedicion || '',
          planEstudio: cd.planEstudio || '',
          planCodigo: cd.planCodigo || '',
          od: cd.od || '',
          denominacion: cd.denominacion || '',
          direccion: cd.direccion || '',
          telefono: cd.telefono || '',
          municipio: cd.municipio || '',
          estado: cd.estado || '',
          cdcce: cd.cdcce || '',
          estudiante: cd.estudiante || { cedula: '', fechaNacimiento: '', apellidos: '', nombres: '', pais: '', estado: '', municipio: '' },
          instituciones: cd.instituciones || [],
          calificaciones: cd.calificaciones || {},
          orientacion: cd.orientacion || [],
          grupos: cd.grupos || [],
          observaciones: cd.observaciones || '',
          observacionesLines: cd.observacionesLines || [],
          promedioAcumulado: cd.promedioAcumulado || '',
          director: cd.director || { apellidosNombres: '', cedula: '' },
          directorCdcce: cd.directorCdcce || { apellidosNombres: '', cedula: '' },
          acta: cd.acta || '',
          actaFecha: cd.actaFecha || '',
          actaAnio: cd.actaAnio || '',
          literalesFinales: cd.literalesFinales || [],
          rawDataMap: rawDataFlat ? rawDataFlat : undefined,
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Error cargando datos.', variant: 'destructive' })
    } finally {
      setLoadingData(false)
    }
  }, [plan, toast])

  // Enrich displayData with rawDataMap literals (same safety net as editor)
  const enrichedDisplayData = useMemo(() => {
    if (!displayData || !rawDataFlat) return displayData
    const data = { ...displayData }
    const cals = { ...data.calificaciones }
    const YEAR_TO_NUM: Record<string, number> = {
      'Primer Año': 1, 'Segundo Año': 2, 'Tercer Año': 3, 'Cuarto Año': 4, 'Quinto Año': 5,
    }
    const CODES: Record<number, string[]> = {
      1: ['CA','IN','MA','EN','HV','EFC','GG','EA','EF','EPT'],
      2: ['CA','IN','MA','EPS','CB','HV','HU','EA','EF','ET'],
      3: ['CA','IN','MA','CB','FI','QU','HVCB','GV','EF','ET'],
      4: ['CA','MA','HC','IN','EF','FI','QU','BI','DT','FIL','IPM'],
      5: ['IN','EF','GEV','CA','MA','FI','QU','BI','CT','IPM'],
    }
    for (const [yearName, yearCals] of Object.entries(cals)) {
      const yNum = YEAR_TO_NUM[yearName]
      if (!yNum) continue
      const codes = CODES[yNum]
      if (!codes) continue
      for (let i = 0; i < yearCals.length; i++) {
        const cal = yearCals[i]
        const code = codes[i]
        if (!code) continue
        if (!cal.nota) {
          const rn = rawDataFlat[`NOTA.${code}.${yNum}`]
          if (rn) cal.nota = rn
        }
        if (!cal.literal) {
          const rl = rawDataFlat[`LITERAL.${code}.${yNum}`]
          if (rl) cal.literal = rl
          else if (cal.nota) cal.literal = notaEnLetras(cal.nota)
        }
      }
    }
    data.calificaciones = cals
    data.rawDataMap = rawDataFlat
    return data
  }, [displayData, rawDataFlat])

  // === Print ===
  const buildTableHtml = () => {
    const cfg = gridConfig!
    const data = enrichedDisplayData
    const occupied = new Set<string>()
    for (let r = 0; r < cfg.rows.length; r++) {
      const row = cfg.rows[r]
      if (!row) continue
      for (const [key, cell] of Object.entries(row.cells)) {
        const c = Number(key)
        const rs = cell.rowspan || 1
        const cs = cell.colspan || 1
        if (rs > 1) { for (let dr = 1; dr < rs; dr++) occupied.add(`${r + dr}-${c}`) }
        if (cs > 1) { for (let dc = 1; dc < cs; dc++) occupied.add(`${r}-${c + dc}`) }
      }
    }
    const borderStyle = (enabled: boolean, color: string) => enabled ? `1px solid ${color}` : 'none'
    const logoSrc = `${window.location.origin}/logo-gob-mppe.png`
    let rowsHtml = ''
    for (let r = 0; r < cfg.rows.length; r++) {
      const gridRow = cfg.rows[r]
      let cellsHtml = ''
      for (let c = 0; c < cfg.totalCols; c++) {
        if (occupied.has(`${r}-${c}`)) continue
        const cell = gridRow.cells[c] || emptyCell()
        let content = cell.content
        if (cell.dataBinding && data) content = resolveBinding(cell.dataBinding, data, cfg) || ''
        const csAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ''
        const rsAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ''
        const imgTag = content && content.startsWith('##LOGO_') && content.endsWith('##')
          ? `<img src="${logoSrc}" style="max-width:100%;height:auto;object-fit:contain;display:block">` : ''
        const text = imgTag || (content || '')
        const autoFitAttr = cell.autoFit ? ' data-autofit="1"' : ''
        const autoFitSpan = (cell.autoFit && !imgTag && content)
          ? `<span style="display:inline-block;white-space:nowrap">${content}</span>` : text
        cellsHtml += `<td${csAttr}${rsAttr}${autoFitAttr} style="border-top:${borderStyle(cell.borderTop, cell.borderColor)};border-right:${borderStyle(cell.borderRight, cell.borderColor)};border-bottom:${borderStyle(cell.borderBottom, cell.borderColor)};border-left:${borderStyle(cell.borderLeft, cell.borderColor)};width:${cell.width || 'auto'};height:${cell.height || 'auto'};font-size:${cell.fontSize}pt;font-weight:${cell.fontWeight};font-style:${cell.fontStyle};text-decoration:${cell.textDecoration === 'underline' ? 'underline' : 'none'};text-align:${cell.textAlign};vertical-align:${cell.verticalAlign};color:${cell.color || 'inherit'};white-space:${cell.whiteSpace};padding:${cell.padding};background:${cell.bgColor || 'transparent'}">${autoFitSpan}</td>`
      }
      rowsHtml += `<tr>${cellsHtml}</tr>`
    }
    const colgroupHtml = cfg.columnWidths.map(w => `<col style="width:${w || 'auto'}">`).join('')
    return `<table><colgroup>${colgroupHtml}</colgroup><tbody>${rowsHtml}</tbody></table>`
  }

  const handlePrint = () => {
    if (!gridConfig) return
    const tableHtml = buildTableHtml()
    const html = `<!DOCTYPE html><html><head><title>Certificación</title><style>
@page{size:Legal;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;justify-content:center;align-items:flex-start;min-height:100vh}
table{border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:9pt;line-height:1.2;table-layout:fixed;transform-origin:top center}
td{overflow:hidden}
img{max-width:100%;height:auto}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${tableHtml}<script>
document.querySelectorAll('td[data-autofit]').forEach(function(td){
  var span=td.querySelector('span');
  if(!span||!span.textContent.trim())return;
  var cs=getComputedStyle(td);
  var avail=td.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  if(avail<=0)return;
  var textW=span.offsetWidth;
  if(textW>avail){
    var origSize=parseFloat(td.style.fontSize)||9;
    var ratio=(avail*0.99)/textW;
    var newSize=Math.max(Math.round(origSize*ratio*10)/10,origSize*0.5);
    td.style.fontSize=newSize+'pt';
    span.style.whiteSpace='nowrap';span.style.overflow='hidden';span.style.maxWidth=avail+'px';
  }
});
</script></body></html>`
    let iframe = document.getElementById('cert-print-frame') as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'cert-print-frame'
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:215.9mm;height:400mm;border:none'
      document.body.appendChild(iframe)
    }
    const doc = iframe.contentDocument!
    doc.open(); doc.write(html); doc.close()
    setTimeout(() => {
      const imgs = doc.querySelectorAll('img')
      if (imgs.length > 0) {
        let loaded = 0
        const onDone = () => { loaded++; if (loaded >= imgs.length) setTimeout(() => { iframe!.contentWindow!.print() }, 300) }
        imgs.forEach(img => { if (img.complete) onDone(); else { img.onload = onDone; img.onerror = onDone } })
      } else { setTimeout(() => { iframe!.contentWindow!.print() }, 300) }
    }, 150)
  }

  // === Screen preview grid ===
  const occupied = useMemo(() => {
    if (!gridConfig) return new Set<string>()
    const occ = new Set<string>()
    for (let r = 0; r < gridConfig.rows.length; r++) {
      const row = gridConfig.rows[r]
      if (!row) continue
      for (const [key, cell] of Object.entries(row.cells)) {
        const c = Number(key)
        const rs = cell.rowspan || 1; const cs = cell.colspan || 1
        if (rs > 1) { for (let dr = 1; dr < rs; dr++) occ.add(`${r + dr}-${c}`) }
        if (cs > 1) { for (let dc = 1; dc < cs; dc++) occ.add(`${r}-${c + dc}`) }
      }
    }
    return occ
  }, [gridConfig])

  return (
    <AppShell>
      <div className="space-y-3">
        {/* Toolbar: search + print */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <StudentSearch
              onSelect={handleSelectStudent}
              placeholder="Buscar alumno por cédula, apellidos o nombres..."
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
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={!enrichedDisplayData || !gridConfig}
            className="h-8 text-xs">
            <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
          </Button>
          {loadingData && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        {/* Format preview */}
        {loadingLayout ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Cargando formato...</span>
          </div>
        ) : !gridConfig ? (
          <div className="text-center py-16 text-gray-500 text-sm">No se encontró el formato.</div>
        ) : (
          <div className="bg-white p-2 rounded border" style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={{ width: '816px', minHeight: '200px', maxWidth: '100%', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', overflow: 'visible' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '9pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.2', tableLayout: 'fixed' }}>
                <colgroup>
                  {gridConfig.columnWidths.map((w, i) => (
                    <col key={i} style={{ width: w || `${100 / gridConfig.totalCols}%` }} />
                  ))}
                </colgroup>
                <tbody>
                  {gridConfig.rows.map((gridRow, r) => {
                    const cells: React.ReactNode[] = []
                    for (let c = 0; c < gridConfig.totalCols; c++) {
                      if (occupied.has(`${r}-${c}`)) continue
                      const cell = gridRow.cells[c] || emptyCell()
                      let displayContent = cell.content
                      if (cell.dataBinding && enrichedDisplayData) {
                        displayContent = resolveBinding(cell.dataBinding, enrichedDisplayData, gridConfig) || ''
                      }
                      const borderS = (enabled: boolean) => enabled ? `1px solid ${cell.borderColor}` : 'none'
                      cells.push(
                        <td
                          key={`${r}-${c}`}
                          colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                          rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                          style={{
                            borderTop: borderS(cell.borderTop), borderRight: borderS(cell.borderRight),
                            borderBottom: borderS(cell.borderBottom), borderLeft: borderS(cell.borderLeft),
                            width: cell.width || undefined, height: cell.height || '24px',
                            fontSize: `${cell.fontSize}pt`, fontWeight: cell.fontWeight,
                            fontStyle: cell.fontStyle,
                            textDecoration: cell.textDecoration === 'underline' ? 'underline' : undefined,
                            textAlign: cell.textAlign, verticalAlign: cell.verticalAlign,
                            color: cell.color || undefined, whiteSpace: cell.whiteSpace,
                            padding: cell.padding, background: cell.bgColor || undefined,
                            userSelect: 'none', position: 'relative', overflow: 'hidden',
                          }}
                        >
                          {displayContent && displayContent.startsWith('##LOGO_') && displayContent.endsWith('##') ? (
                            <img src={`${window.location.origin}/logo-gob-mppe.png`} style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', display: 'block' }} />
                          ) : (displayContent || '')}
                        </td>
                      )
                    }
                    return <tr key={r}>{cells}</tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default function CertViewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    }>
      <CertViewContent />
    </Suspense>
  )
}
