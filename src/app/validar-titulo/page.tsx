'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { AppShell } from '@/components/app-shell'
import { useCurrentPlan } from '@/hooks/use-current-plan'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StudentSearch } from '@/components/student-search'
import { useToast } from '@/hooks/use-toast'
import { notaEnLetras, formatCedulaFinal, schoolConfig } from '@/lib/school-config'
import {
  type GridConfig, type DisplayData,
  emptyCell, resolveBinding,
} from '@/components/cert-visual/types'
import {
  Search, Printer, Loader2,
} from 'lucide-react'

// === Types ===
interface Student {
  id: string
  cedula: string
  apellidos: string
  nombres: string
  plan?: string
}

// El formato se diseña exclusivamente en el Editor de Formatos (cuadricula)
// y se guarda como CertLayout. Esta hoja es solo para vista e impresion.

export default function ValidarTituloPage() {
  const plan = useCurrentPlan()
  const { toast } = useToast()

  const [gridConfig, setGridConfig] = useState<GridConfig | null>(null)
  const [loadingLayout, setLoadingLayout] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [certData, setCertData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [rawDataFlat, setRawDataFlat] = useState<Record<string, string> | null>(null)
  const [dashboardCells, setDashboardCells] = useState<string[][] | null>(null)

  // Load grid layout from DB — busca layout que contenga "validar titulo"
  useEffect(() => {
    async function loadLayout() {
      try {
        // Normalizar texto: quitar acentos y pasar a minusculas
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        const searchTerm = 'validar titulo'

        // Busca layout que contenga "valida" (coincide con "validar" y "validacion") y "titulo"
        const matchesName = (nombre: string) => {
          const n = normalize(nombre)
          return (n.includes('validar') || n.includes('validacion') || n.includes('validadcion')) && n.includes('titulo')
        }

        // 1) Intentar con el plan actual
        let res = await fetch(`/api/cert-layouts?plan=${plan}`)
        if (res.ok) {
          const layouts = await res.json()
          console.log('[Validar Titulo] plan=%s, layouts encontrados: %d', plan, Array.isArray(layouts) ? layouts.length : 0)
          if (Array.isArray(layouts)) {
            console.log('[Validar Titulo] nombres:', layouts.map((l: any) => l.nombre))
          }
          const found = layouts.find((l: any) => matchesName(l.nombre))
          if (found) {
            console.log('[Validar Titulo] layout encontrado:', found.nombre, found.id)
            const detailRes = await fetch(`/api/cert-layouts?id=${found.id}&plan=${plan}`)
            if (detailRes.ok) {
              const detail = await detailRes.json()
              const parsed = typeof detail.datos === 'string' ? JSON.parse(detail.datos) : detail.datos
              setGridConfig(parsed as GridConfig)
              return
            }
          }
        } else {
          console.warn('[Validar Titulo] API respondio con error:', res.status, res.statusText)
        }

        // 2) Fallback: buscar en todos los planes
        console.log('[Validar Titulo] fallback a plan=all')
        const resAll = await fetch('/api/cert-layouts?plan=all')
        if (resAll.ok) {
          const allLayouts = await resAll.json()
          const foundAll = allLayouts.find((l: any) => matchesName(l.nombre))
          if (foundAll) {
            console.log('[Validar Titulo] layout encontrado en fallback:', foundAll.nombre, foundAll.id, 'plan:', foundAll.plan)
            const detailRes = await fetch(`/api/cert-layouts?id=${foundAll.id}&plan=all`)
            if (detailRes.ok) {
              const detail = await detailRes.json()
              const parsed = typeof detail.datos === 'string' ? JSON.parse(detail.datos) : detail.datos
              setGridConfig(parsed as GridConfig)
              return
            }
          }
        }

        toast({ title: 'Sin formato', description: 'No se encontro un layout de Validar Titulo en el Editor de Formatos.', variant: 'destructive' })
      } catch (err) {
        console.error('[Validar Titulo] error cargando layout:', err)
        toast({ title: 'Error', description: 'Error cargando formato.', variant: 'destructive' })
      } finally {
        setLoadingLayout(false)
      }
    }
    loadLayout()
  }, [plan, toast])

  // Load dashboard cells (same as cert-view and editor)
  const reloadDashboardCells = useCallback(() => {
    fetch(`/api/dashboard-state?plan=${plan}`)
      .then(res => res.json())
      .then(data => {
        if (data.found && data.datos) {
          const state = typeof data.datos === 'string' ? JSON.parse(data.datos) : data.datos
          if (state.cells) setDashboardCells(state.cells)
        }
      })
      .catch(() => {})
  }, [plan])

  useEffect(() => { reloadDashboardCells() }, [reloadDashboardCells])
  useEffect(() => {
    const onFocus = () => reloadDashboardCells()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reloadDashboardCells])

  // Build displayData — same logic as cert-view and certificaciones-visual
  const displayData: DisplayData | null = useMemo(() => {
    const dashboardExtra: Record<string, string> = {}
    if (dashboardCells) {
      const z4 = dashboardCells[3]?.[25]?.trim() || ''
      const ah4 = dashboardCells[3]?.[33]?.trim() || ''
      const today = new Date()
      const dd = String(today.getDate()).padStart(2, '0')
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const yyyy = today.getFullYear()
      dashboardExtra['EXPEDICION.FECHA'] = z4 || `${dd}/${mm}/${yyyy}`
      dashboardExtra['EXPEDICION.LUGAR'] = ah4 || 'MIRANDA'
      const z6 = dashboardCells[5]?.[25]?.trim() || ''
      const z7 = dashboardCells[6]?.[25]?.trim() || ''
      dashboardExtra['DIRECTOR.NOMBRE'] = z6 || 'PAREDES HURTADO, RAQUEL'
      dashboardExtra['DIRECTOR.CEDULA'] = z7 || 'V 6419439'
    }

    const rawDataMap = rawDataFlat ? { ...rawDataFlat, ...dashboardExtra } : (Object.keys(dashboardExtra).length > 0 ? dashboardExtra : undefined)

    // Plan derogado: no certData, build from rawDataMap
    if (!certData) {
      if (rawDataMap && Object.keys(rawDataMap).length > 0) {
        const YEAR_NAME_MAP_FB: Record<string, string> = { '1': 'Primer Ano', '2': 'Segundo Ano', '3': 'Tercer Ano', '4': 'Cuarto Ano', '5': 'Quinto Ano' }
        const SUBJECT_CODES_FB: Record<number, string[]> = {
          1: ['CA', 'IN', 'MA', 'EN', 'HV', 'EFC', 'GG', 'EA', 'EF', 'EPT'],
          2: ['CA', 'IN', 'MA', 'EPS', 'CB', 'HV', 'HU', 'EA', 'EF', 'ET'],
          3: ['CA', 'IN', 'MA', 'CB', 'FI', 'QU', 'HVCB', 'GV', 'EF', 'ET'],
          4: ['CA', 'MA', 'HC', 'IN', 'EF', 'FI', 'QU', 'BI', 'DT', 'FIL', 'IPM'],
          5: ['IN', 'EF', 'GEV', 'CA', 'MA', 'FI', 'QU', 'BI', 'CT', 'IPM'],
        }
        const calificacionesFB: Record<string, any[]> = {}
        for (let y = 1; y <= 5; y++) {
          const codes = SUBJECT_CODES_FB[y]
          if (!codes) continue
          const yearName = YEAR_NAME_MAP_FB[String(y)]
          const yearCals: any[] = []
          for (let i = 0; i < codes.length; i++) {
            const code = codes[i]
            const nota = rawDataMap[`NOTA.${code}.${y}`] || ''
            const literal = rawDataMap[`LITERAL.${code}.${y}`] || ''
            const eval_ = rawDataMap[`EVAL.${code}.${y}`] || ''
            const mes = rawDataMap[`MES.${code}.${y}`] || ''
            const anio = rawDataMap[`ANO.${code}.${y}`] || ''
            const inst = rawDataMap[`INST.${code}.${y}`] || ''
            if (nota || literal) {
              yearCals.push({ materia: code, numero: i + 1, nota, literal, tipoEvaluacion: eval_, fechaMes: mes, fechaAnio: anio, instEduc: inst })
            }
          }
          if (yearCals.length > 0) calificacionesFB[yearName] = yearCals
        }
        const literalesFB: string[] = []
        for (let i = 1; i <= 5; i++) {
          const val = rawDataMap[`LITERAL.FINAL.${i}`]
          if (val) literalesFB.push(val)
        }
        return {
          lugar: rawDataMap['EXPEDICION.LUGAR'] || '', fechaExpedicion: rawDataMap['EXPEDICION.FECHA'] || '', planEstudio: '', planCodigo: schoolConfig.planCodigo,
          od: rawDataMap['OD'] || '', denominacion: rawDataMap['DENOMINACION'] || '', direccion: '', telefono: '', municipio: rawDataMap['MUNICIPIO'] || '', estado: rawDataMap['ESTADO'] || '', cdcce: rawDataMap['CDCEE'] || '',
          estudiante: { cedula: rawDataMap.CEDULA || '', fechaNacimiento: rawDataMap.FECHA || '', apellidos: rawDataMap.APELLIDOS || '', nombres: rawDataMap.NOMBRES || '', pais: rawDataMap.PAIS || 'VENEZUELA', estado: rawDataMap.ESTADO || '', municipio: rawDataMap.MUNICIPIO || '' },
          instituciones: [], calificaciones: calificacionesFB, orientacion: [], grupos: [],
          observaciones: '', observacionesLines: [], promedioAcumulado: rawDataMap['PROMEDIO.BASICA'] || '',
          director: { apellidosNombres: rawDataMap['DIRECTOR.NOMBRE'] || '', cedula: rawDataMap['DIRECTOR.CEDULA'] || '' }, directorCdcce: { apellidosNombres: '', cedula: '' },
          acta: rawDataMap['ACTA'] || '', actaFecha: rawDataMap['FECHAEMISIONT'] || '', actaAnio: rawDataMap['EGRESOANO'] || '', literalesFinales: literalesFB,
          rawDataMap,
        }
      }
      return null
    }

    // Plan vigente: build from certData
    let fechaExp = certData.fechaExpedicion
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaExp)) {
      const [y, m, d] = fechaExp.split('-')
      fechaExp = `${d}/${m}/${y}`
    }

    const dashLugar = dashboardExtra['EXPEDICION.LUGAR'] || ''
    const dashFecha = dashboardExtra['EXPEDICION.FECHA'] || ''
    const dashDirectorNombre = dashboardExtra['DIRECTOR.NOMBRE'] || ''
    const dashDirectorCedula = dashboardExtra['DIRECTOR.CEDULA'] || ''

    return {
      lugar: dashLugar || certData.lugar,
      fechaExpedicion: dashFecha || fechaExp,
      planEstudio: certData.planEstudio,
      planCodigo: schoolConfig.planCodigo,
      od: certData.od,
      denominacion: certData.denominacion,
      direccion: certData.direccion,
      telefono: certData.telefono,
      municipio: certData.municipio,
      estado: certData.estado,
      cdcce: certData.cdcce,
      estudiante: certData.estudiante,
      instituciones: certData.instituciones || [],
      calificaciones: certData.calificaciones || {},
      orientacion: certData.orientacion || [],
      grupos: certData.grupos || [],
      observaciones: certData.observaciones || '',
      observacionesLines: certData.observacionesLines || [],
      promedioAcumulado: certData.promedioAcumulado || '',
      director: {
        apellidosNombres: dashDirectorNombre || certData.director?.apellidosNombres || '',
        cedula: dashDirectorCedula || certData.director?.cedula || '',
      },
      directorCdcce: certData.directorCdcce || { apellidosNombres: '', cedula: '' },
      acta: certData.acta || '',
      actaFecha: certData.actaFecha || '',
      actaAnio: certData.actaAnio || '',
      literalesFinales: certData.literalesFinales || [],
      rawDataMap,
    }
  }, [certData, rawDataFlat, dashboardCells])

  // Load student data
  const handleSelectStudent = useCallback(async (student: Student) => {
    setSelectedStudent(student)
    setCertData(null)
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
      }
    } catch {
      toast({ title: 'Error', description: 'Error cargando datos.', variant: 'destructive' })
    } finally {
      setLoadingData(false)
    }
  }, [plan, toast])

  // === Print === (same as cert-view)
  const buildTableHtml = () => {
    const cfg = gridConfig!
    const data = displayData
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
    const borderStyle = (enabled: boolean, color: string, bs?: string) => {
      const style = bs || 'solid'
      const width = (style === 'double' || style === 'groove' || style === 'ridge') ? '3px' : '1px'
      return enabled ? `${width} ${style} ${color}` : 'none'
    }
    const getLogoSrc = (content: string) => {
      if (!content.startsWith('##LOGO_') || !content.endsWith('##')) return ''
      const name = content.slice(7, -2).trim().toLowerCase().replace(/_/g, '-')
      return name ? `${window.location.origin}/logo-${name}.png` : `${window.location.origin}/logo-gob-mppe.png`
    }
    let rowsHtml = ''
    for (let r = 0; r < cfg.rows.length; r++) {
      const gridRow = cfg.rows[r]
      let cellsHtml = ''
      for (let c = 0; c < cfg.totalCols; c++) {
        if (occupied.has(`${r}-${c}`)) continue
        const cell = gridRow.cells[c] || emptyCell()
        let content = cell.content
        if (cell.dataBinding && data) content = resolveBinding(cell.dataBinding, data, cfg, cell.dateFormat) || ''
        const csAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ''
        const rsAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ''
        const bgLogoMatch = content && content.match(/^##BGLOGO_(.+)##$/)
        const bgLogoName = bgLogoMatch ? bgLogoMatch[1].split(':')[0].trim().toLowerCase().replace(/_/g, '-') : ''
        const bgLogoSizeVal = bgLogoMatch ? (bgLogoMatch[1].split(':')[1]?.trim() || 'contain') : ''
        const isBgLogo = !!bgLogoMatch
        const bgLogoImg = isBgLogo ? `<img src="/logo-${bgLogoName}.png" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:${bgLogoSizeVal};pointer-events:none;">` : ''
        const imgTag = !isBgLogo && content && content.startsWith('##LOGO_') && content.endsWith('##')
          ? `<img src="${getLogoSrc(content)}" style="max-width:100%;height:auto;object-fit:contain;display:block;">` : ''
        const text = isBgLogo ? '' : (imgTag || (content || ''))
        const autoFitAttr = cell.autoFit ? ' data-autofit="1"' : ''
        const autoFitSpan = (cell.autoFit && !imgTag && !isBgLogo && content)
          ? `<span style="display:inline-block;white-space:nowrap">${content}</span>` : text
        const wmStyle = cell.writingMode && cell.writingMode !== 'horizontal-tb' ? `writing-mode:${cell.writingMode};` : ''
        const transformStyle = cell.writingMode === 'rotate-180' ? 'transform:rotate(180deg);' : ''
        const bgPosStyle = isBgLogo ? 'position:relative;overflow:hidden;' : ''        cellsHtml += `<td${csAttr}${rsAttr}${autoFitAttr} style="${bgPosStyle}border-top:${borderStyle(cell.borderTop, cell.borderColor, cell.borderStyle)};border-right:${borderStyle(cell.borderRight, cell.borderColor, cell.borderStyle)};border-bottom:${borderStyle(cell.borderBottom, cell.borderColor, cell.borderStyle)};border-left:${borderStyle(cell.borderLeft, cell.borderColor, cell.borderStyle)};width:${cell.width || 'auto'};height:${cell.height || 'auto'};font-size:${cell.fontSize}pt;font-weight:${cell.fontWeight};font-style:${cell.fontStyle};text-decoration:${cell.textDecoration === 'underline' ? 'underline' : 'none'};text-align:${cell.textAlign};vertical-align:${cell.verticalAlign};color:${cell.color || 'inherit'};white-space:${cell.whiteSpace};padding:${cell.padding};${wmStyle}${transformStyle}background:${cell.bgColor || 'transparent'}">${bgLogoImg}${autoFitSpan}</td>`
      }
      rowsHtml += `<tr>${cellsHtml}</tr>`
    }
    const colgroupHtml = cfg.columnWidths.map(w => `<col style="width:${w || 'auto'}">`).join('')
    return `<table><colgroup>${colgroupHtml}</colgroup><tbody>${rowsHtml}</tbody></table>`
  }

  const handlePrint = () => {
    if (!gridConfig) return
    const tableHtml = buildTableHtml()
    const html = `<!DOCTYPE html><html><head><title>Certificacion</title><style>
@page { size: legal; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 215.9mm; background: white; }
body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.2; }
#print-content { width: 215.9mm; }
#print-content table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.2; table-layout: fixed; }
#print-content td { overflow: hidden; }
#print-content img { max-width: 100%; height: auto; display: block; object-fit: contain; }
@media print {
  html, body { width: 215.9mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
}
</style></head><body><div id="print-content">${tableHtml}</div><script>
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
    const old = document.getElementById('validar-titulo-print-frame')
    if (old) old.remove()
    const iframe = document.createElement('iframe')
    iframe.id = 'validar-titulo-print-frame'
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;border:none'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument!
    doc.open(); doc.write(html); doc.close()
    setTimeout(() => {
      const imgs = doc.querySelectorAll('img')
      if (imgs.length > 0) {
        let loaded = 0
        const onDone = () => { loaded++; if (loaded >= imgs.length) setTimeout(() => { iframe.contentWindow!.print() }, 300) }
        imgs.forEach(img => { if (img.complete) onDone(); else { img.onload = onDone; img.onerror = onDone } })
      } else { setTimeout(() => { iframe.contentWindow!.print() }, 300) }
    }, 150)
  }

  // === Screen preview grid === (same as cert-view)
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

  const tableRef = useRef<HTMLTableElement>(null)
  useEffect(() => {
    if (!gridConfig || !tableRef.current) return
    const tds = tableRef.current.querySelectorAll('td[data-autofit="1"]')
    tds.forEach(td => {
      const span = td.querySelector('span') as HTMLSpanElement | null
      if (!span?.textContent?.trim()) return
      const cs = getComputedStyle(td)
      const avail = td.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      if (avail <= 0) return
      if (span.scrollWidth > avail) {
        const origSize = parseFloat(td.style.fontSize) || 9
        const ratio = (avail * 0.99) / span.scrollWidth
        const newSize = Math.max(Math.round(origSize * ratio * 10) / 10, origSize * 0.5)
        ;(td as HTMLElement).style.fontSize = newSize + 'pt'
      }
    })
  }, [gridConfig, displayData])

  return (
    <AppShell>
      <div className="space-y-3 print:hidden">
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
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={!displayData || !gridConfig}
            className="h-8 text-xs">
            <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
          </Button>
          {loadingData && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        {loadingLayout ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Cargando formato...</span>
          </div>
        ) : !gridConfig ? (
          <div className="text-center py-16">
            <Search className="h-10 w-10 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">
              No se encontro un layout de Validar Titulo en el Editor de Formatos.
              Crea un layout con la palabra <span className="font-bold text-white">&quot;validar titulo&quot;</span> en el nombre
              desde el Editor de Formatos (plan {plan === 'derogado' ? 'derogado' : 'vigente'}).
            </p>
          </div>
        ) : (
          <div className="bg-white p-2 rounded border" style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={{ width: '816px', minHeight: '200px', maxWidth: '100%', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', overflow: 'visible' }}>
              <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%', fontSize: '9pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.2', tableLayout: 'fixed' }}>
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
                      if (cell.dataBinding && displayData) {
                        displayContent = resolveBinding(cell.dataBinding, displayData, gridConfig, cell.dateFormat) || ''
                      }
                      const bgLogoMatch = displayContent.match(/^##BGLOGO_(.+)##$/)
                      const bgLogoName = bgLogoMatch ? bgLogoMatch[1].split(':')[0].trim().toLowerCase().replace(/_/g, '-') : ''
                      const bgLogoSizeVal = bgLogoMatch ? (bgLogoMatch[1].split(':')[1]?.trim() || 'contain') : ''
                      const isBgLogo = !!bgLogoMatch
                      const borderS = (enabled: boolean) => {
                        const bs = cell.borderStyle || 'solid'
                        const bw = (bs === 'double' || bs === 'groove' || bs === 'ridge') ? '3px' : '1px'
                        return enabled ? `${bw} ${bs} ${cell.borderColor}` : 'none'
                      }
                      cells.push(
                        <td
                          key={`${r}-${c}`}
                          data-autofit={cell.autoFit ? '1' : undefined}
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
                            padding: cell.padding,
                            backgroundColor: isBgLogo ? 'transparent' : cell.bgColor || undefined,
                            backgroundImage: isBgLogo ? `url(/logo-${bgLogoName}.png)` : undefined,
                            backgroundSize: isBgLogo ? bgLogoSizeVal : undefined,
                            backgroundPosition: isBgLogo ? 'center' : undefined,
                            backgroundRepeat: isBgLogo ? 'no-repeat' : undefined,
                            writingMode: cell.writingMode || undefined,
                            userSelect: 'none', position: 'relative', overflow: 'hidden',
                          }}
                        >
                          {isBgLogo ? null
                          : cell.autoFit && displayContent && !displayContent.startsWith('##LOGO_') ? (
                            <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>{displayContent}</span>
                          ) : (displayContent && displayContent.startsWith('##LOGO_') && displayContent.endsWith('##') ? (
                            <img src={`/logo-${displayContent.slice(7, -2).trim().toLowerCase().replace(/_/g, '-')}.png`} style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', display: 'block' }} />
                          ) : (displayContent || ''))}
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

        {/* No student selected */}
        {gridConfig && !displayData && !loadingData && (
          <div className="text-center py-8">
            <Search className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <p className="text-gray-400 text-sm">
              Busca un alumno para generar la Validacion de Titulo
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
