'use client'

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { useCurrentPlan } from '@/hooks/use-current-plan'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { StudentSearch } from '@/components/student-search'
import { useToast } from '@/hooks/use-toast'
import { PropertiesPanel } from '@/components/cert-visual/properties-panel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  type GridConfig, type CellConfig, type DisplayData,
  emptyCell, emptyRow, createDefaultTemplate, resolveBinding, patchDataBindings,
} from '@/components/cert-visual/types'
import { schoolConfig, notaEnLetras, formatCedulaFinal } from '@/lib/school-config'
import {
  Eye, EyeOff, Save, Upload, RotateCcw, Plus, Minus, Columns3, Loader2,
  FolderOpen, Trash2, CheckCircle2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Combine, TableCellsMerge, TableCellsSplit, Group, Printer,
} from 'lucide-react'

// === Student & CertData types (local to this page) ===
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

interface SavedLayout {
  id: string; nombre: string; createdAt: string; updatedAt: string
}

const STORAGE_KEY = 'cert-grid-layout'

// === Grid helpers ===
function loadGridConfig(): GridConfig {
  if (typeof window === 'undefined') return createDefaultTemplate()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as GridConfig
      if (parsed.rows && Array.isArray(parsed.rows) && parsed.totalCols) return patchDataBindings(parsed)
    }
  } catch { /* ignore */ }
  return createDefaultTemplate()
}

function saveGridConfig(config: GridConfig) {
  try {
    const patched = patchDataBindings(config)
    const json = JSON.stringify(patched)
    console.log('[saveGridConfig] size:', (json.length / 1024).toFixed(1), 'KB')
    localStorage.setItem(STORAGE_KEY, json)
  } catch (e) {
    console.error('[saveGridConfig] FAILED:', e)
  }
}

function updateCellInConfig(
  config: GridConfig,
  rowIdx: number,
  colIdx: number,
  updates: Partial<CellConfig>
): GridConfig {
  const newRows = config.rows.map((r, i) => {
    if (i !== rowIdx) return r
    const cell = r.cells[colIdx] || emptyCell()
    return { cells: { ...r.cells, [colIdx]: { ...cell, ...updates } } }
  })
  return { ...config, rows: newRows }
}

// === Grid Rendering Component ===
function GridTable({
  config,
  selectedCell,
  selectionRange,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  isPreview,
  displayData,
  onCellEdit,
  savingDraft,
  draftOverrides,
}: {
  config: GridConfig
  selectedCell: { row: number; col: number } | null
  selectionRange: { r1: number; c1: number; r2: number; c2: number } | null
  onCellMouseDown: (row: number, col: number) => void
  onCellMouseEnter: (row: number, col: number) => void
  onCellMouseUp: () => void
  isPreview: boolean
  displayData: DisplayData | null
  onCellEdit?: (binding: string, newValue: string) => void
  savingDraft?: boolean
  draftOverrides?: Record<string, string>
}) {
  // Recompute occupied set on every render to track rowspan AND colspan correctly
  const occupied = useMemo(() => {
    const occ = new Set<string>()
    for (let r = 0; r < config.rows.length; r++) {
      const row = config.rows[r]
      if (!row) continue
      for (const [key, cell] of Object.entries(row.cells)) {
        const c = Number(key)
        const rs = cell.rowspan || 1
        const cs = cell.colspan || 1
        // Mark cells consumed by rowspan (rows below)
        if (rs > 1) {
          for (let dr = 1; dr < rs; dr++) {
            occ.add(`${r + dr}-${c}`)
          }
        }
        // Mark cells consumed by colspan (columns to the right, same row)
        if (cs > 1) {
          for (let dc = 1; dc < cs; dc++) {
            occ.add(`${r}-${c + dc}`)
          }
        }
      }
    }
    return occ
  }, [config.rows])

  const inRange = (r: number, c: number) => {
    if (!selectionRange) return false
    const minR = Math.min(selectionRange.r1, selectionRange.r2)
    const maxR = Math.max(selectionRange.r1, selectionRange.r2)
    const minC = Math.min(selectionRange.c1, selectionRange.c2)
    const maxC = Math.max(selectionRange.c1, selectionRange.c2)
    return r >= minR && r <= maxR && c >= minC && c <= maxC
  }

  const isRangeActive = selectionRange !== null
  const isSingleSelected = selectedCell && !isRangeActive

  return (
    <div
      className="bg-white p-2 rounded border"
      style={{ maxWidth: '860px', margin: '0 auto', overflow: 'visible' }}
      onMouseUp={() => !isPreview && onCellMouseUp()}
    >
      <div style={{ width: '816px', minHeight: '1344px', maxWidth: '100%', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', position: 'relative', paddingBottom: '20px', overflow: 'visible' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '9pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.2', tableLayout: 'fixed' }}>
          <colgroup>
            {config.columnWidths.map((w, i) => (
              <col key={i} style={{ width: w || `${100 / config.totalCols}%` }} />
            ))}
          </colgroup>
          <tbody>
            {config.rows.map((gridRow, r) => {
              const cells: React.ReactNode[] = []
              for (let c = 0; c < config.totalCols; c++) {
                const key = `${r}-${c}`
                if (occupied.has(key)) continue

                const cell = gridRow.cells[c] || emptyCell()

                let displayContent = cell.content
                if (isPreview && cell.dataBinding && displayData) {
                  const ov = draftOverrides?.[cell.dataBinding]
                  displayContent = ov !== undefined && ov !== '' ? ov : resolveBinding(cell.dataBinding, displayData, config)
                }

                const borderStyle = (enabled: boolean) =>
                  enabled ? `1px solid ${cell.borderColor}` : 'none'

                const cellIsSelected = isSingleSelected && selectedCell?.row === r && selectedCell?.col === c
                const cellInRange = isRangeActive && inRange(r, c)
                const hasContent = cell.content || cell.dataBinding

                cells.push(
                  <td
                    key={key}
                    colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                    rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                    style={{
                      borderTop: borderStyle(cell.borderTop),
                      borderRight: borderStyle(cell.borderRight),
                      borderBottom: borderStyle(cell.borderBottom),
                      borderLeft: borderStyle(cell.borderLeft),
                      width: cell.width || undefined,
                      height: cell.height || '24px',
                      fontSize: `${cell.fontSize}pt`,
                      fontWeight: cell.fontWeight,
                      fontStyle: cell.fontStyle,
                      textDecoration: cell.textDecoration === 'underline' ? 'underline' : undefined,
                      textAlign: cell.textAlign,
                      verticalAlign: cell.verticalAlign,
                      color: cell.color || undefined,
                      whiteSpace: cell.whiteSpace,
                      padding: cell.padding,
                      cursor: isPreview ? 'default' : 'cell',
                      outline: cellIsSelected ? '2px solid #3b82f6' : undefined,
                      outlineOffset: '-2px',
                      minWidth: hasContent ? undefined : '0px',
                      minHeight: '24px',
                      background: cellInRange
                        ? 'rgba(59,130,246,0.15)'
                        : cellIsSelected
                          ? 'rgba(59,130,246,0.06)'
                          : cell.bgColor || undefined,
                      userSelect: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseDown={() => !isPreview && onCellMouseDown(r, c)}
                    onMouseEnter={() => !isPreview && onCellMouseEnter(r, c)}
                    title={cell.dataBinding ? `[${cell.dataBinding}]` : undefined}
                    onDoubleClick={(e) => {
                      if (isPreview && cell.dataBinding && onCellEdit) {
                        e.stopPropagation()
                        const target = e.currentTarget.querySelector('[data-editable]') as HTMLElement | null
                        if (target) {
                          target.setAttribute('contentEditable', 'true')
                          target.focus()
                          // Select all text
                          const range = document.createRange()
                          range.selectNodeContents(target)
                          const sel = window.getSelection()
                          sel?.removeAllRanges()
                          sel?.addRange(range)
                        }
                      }
                    }}
                  >
                    {!isPreview && cell.dataBinding && (
                      <span style={{
                        position: 'absolute', top: '1px', right: '2px',
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: '#f97316', display: 'inline-block',
                        pointerEvents: 'none',
                      }} />
                    )}
                    {isPreview && cell.dataBinding && !displayContent ? (
                      <span style={{ color: '#ccc' }}>ÔÇö</span>
                    ) : isPreview && cell.dataBinding && onCellEdit ? (
                      <span
                        data-editable
                        style={{ cursor: 'text', outline: 'none', minWidth: '20px', display: 'inline-block', minHeight: '1em' }}
                        onBlur={(e) => {
                          e.currentTarget.setAttribute('contentEditable', 'false')
                          const newVal = e.currentTarget.textContent || ''
                          if (newVal !== displayContent) {
                            onCellEdit(cell.dataBinding, newVal)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            e.currentTarget.blur()
                          }
                          if (e.key === 'Escape') {
                            e.currentTarget.blur()
                          }
                        }}
                        suppressContentEditableWarning
                      >
                        {displayContent}
                      </span>
                    ) : displayContent.startsWith('##LOGO_') && displayContent.endsWith('##') ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img
                          src="/logo-gob-mppe.png"
                          alt="Logo Gobierno Bolivariano"
                          style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                    ) : (
                      displayContent
                    )}
                  </td>
                )
              }
              return <tr key={r}>{cells}</tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// === Column Width Editor ===
function ColumnWidthEditor({
  config,
  onUpdate,
}: {
  config: GridConfig
  onUpdate: (config: GridConfig) => void
}) {
  const [editing, setEditing] = useState<number | null>(null)
  const [value, setValue] = useState('')

  const startEdit = (idx: number) => {
    setEditing(idx)
    setValue(config.columnWidths[idx] || '')
  }

  const commitEdit = () => {
    if (editing !== null && value.trim()) {
      const newWidths = [...config.columnWidths]
      newWidths[editing] = value.trim()
      onUpdate({ ...config, columnWidths: newWidths })
    }
    setEditing(null)
  }

  return (
    <div className="flex gap-0.5 overflow-x-auto p-1" style={{ flexWrap: 'nowrap' }}>
      {config.columnWidths.map((w, i) => (
        <div
          key={i}
          className="text-center border rounded px-0.5 py-0.5 min-w-[44px]"
          style={{ fontSize: '7pt', backgroundColor: '#f8f8f8' }}
        >
          <div className="text-muted-foreground" style={{ fontSize: '6pt' }}>C{i}</div>
          {editing === i ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
              className="w-10 h-4 text-center text-[7pt] border rounded"
              style={{ padding: '0 1px' }}
            />
          ) : (
            <div
              onClick={() => startEdit(i)}
              className="cursor-pointer hover:bg-accent rounded"
              title="Clic para editar"
            >
              {w}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// === Saved Layouts Dialog ===
function SavedLayoutsDialog({
  open,
  onOpenChange,
  layouts,
  onLoad,
  onDelete,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  layouts: SavedLayout[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Layouts Guardados</DialogTitle>
          <DialogDescription>
            Selecciona un layout para cargarlo en el editor.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
          </div>
        ) : layouts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No hay layouts guardados.
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {layouts.map((layout) => (
              <div
                key={layout.id}
                className="flex items-center justify-between p-2 rounded border hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{layout.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(layout.updatedAt).toLocaleString('es-VE')}
                  </div>
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onLoad(layout.id)}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Cargar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => onDelete(layout.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// === Main Page Component ===
function CertVisualEditorContent() {
  const plan = useCurrentPlan()
  const isVigenteReadOnly = plan === 'vigente'
  const { toast } = useToast()

  // Grid state
  const [gridConfig, setGridConfig] = useState<GridConfig>(createDefaultTemplate)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [gridInitialized, setGridInitialized] = useState(false)
  const [colInput, setColInput] = useState('27')
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [printScale, setPrintScale] = useState(100)

  // Range selection state (drag to select multiple cells)
  const [selAnchor, setSelAnchor] = useState<{ row: number; col: number } | null>(null)
  const [selEnd, setSelEnd] = useState<{ row: number; col: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Computed selection range
  const selectionRange = useMemo(() => {
    if (!selAnchor || !selEnd) return null
    return { r1: selAnchor.row, c1: selAnchor.col, r2: selEnd.row, c2: selEnd.col }
  }, [selAnchor, selEnd])

  // Student / data state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [certData, setCertData] = useState<CertData | null>(null)
  const [rawDataFlat, setRawDataFlat] = useState<Record<string, string> | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Datos del tablero (celdas Z4 y AH4 para expedici├│n)
  const [dashboardCells, setDashboardCells] = useState<string[][] | null>(null)
  // Z5: Contador de registros en la base de datos
  const [dbRecordCount, setDbRecordCount] = useState<number | null>(null)

  // Inline editing: overrides per dataBinding path
  const [draftOverrides, setDraftOverrides] = useState<Record<string, string>>({})
  const [savingDraft, setSavingDraft] = useState(false)

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)

  // Saved layouts dialog state
  const [showLayoutsDialog, setShowLayoutsDialog] = useState(false)
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([])
  const [loadingLayouts, setLoadingLayouts] = useState(false)
  const [loadingLayout, setLoadingLayout] = useState(false)
  const searchParams = useSearchParams()

  // Load grid from localStorage on mount (or from ?layout= param)
  useEffect(() => {
    const layoutId = searchParams.get('layout')
    if (layoutId) {
      // Load layout from DB
      setLoadingLayout(true)
      fetch(`/api/cert-layouts/${layoutId}?plan=${plan}`)
        .then(res => {
          if (!res.ok) throw new Error('Layout no encontrado')
          return res.json()
        })
        .then(layout => {
          const parsed: GridConfig = typeof layout.datos === 'string'
            ? JSON.parse(layout.datos) : layout.datos
          if (parsed.rows && Array.isArray(parsed.rows) && parsed.totalCols) {
            setGridConfig(patchDataBindings(parsed))
            toast({ title: 'Layout cargado', description: `"${layout.nombre}"` })
          }
        })
        .catch(() => {
          setGridConfig(loadGridConfig())
        })
        .finally(() => {
          setLoadingLayout(false)
          setGridInitialized(true)
        })
    } else {
      setGridConfig(loadGridConfig())
      setGridInitialized(true)
    }
  }, [searchParams, toast])

  // Persist grid changes to localStorage (debounced auto-save)
  useEffect(() => {
    if (!gridInitialized) return
    const timer = setTimeout(() => saveGridConfig(gridConfig), 500)
    return () => clearTimeout(timer)
  }, [gridConfig, gridInitialized])

  // Cargar celdas del tablero para datos en caliente (ambos planes)
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

  // Al montar o cambiar de plan
  useEffect(() => { reloadDashboardCells() }, [reloadDashboardCells])

  // Al volver a la pesta├▒a (datos en caliente)
  useEffect(() => {
    const onFocus = () => reloadDashboardCells()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reloadDashboardCells])

  // === Student selection + data fetching ===
  const handleSelectStudent = useCallback(async (student: Student) => {
    setSelectedStudent(student)
    setCertData(null)
    setRawDataFlat(null)
    setDraftOverrides({})
    setLoadingData(true)
    reloadDashboardCells() // datos en caliente del tablero
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
      // Always set rawDataFlat if available (plan derogado uses it directly)
      if (result.rawDataFlat) {
        const flat: Record<string, string> = {}
        for (const [k, v] of Object.entries(result.rawDataFlat)) {
          if (typeof v === 'string') flat[k] = v
          else if (v !== null && v !== undefined) flat[k] = String(v)
        }
        setRawDataFlat(flat)
      }
      if (result.certData) {
        // Load draft overrides if they exist
        try {
          const draftLoadUrl = plan === 'vigente'
           ? `/api/plan-vigente/${student.id}/cert-draft`
           : `/api/plan-derogado/${student.id}/cert-draft`
         const draftRes = await fetch(draftLoadUrl)
          if (draftRes.ok) {
            const draftData = await draftRes.json()
            if (draftData.draft?.overrides) {
              // Filter out empty-string overrides ÔÇö they were blocking real data
              // Also skip dashboard-sourced bindings (display-only, edited in tablero)
              const dashboardBindings = ['director.nombre', 'director.cedula', 'expedicion.fecha', 'expedicion.lugar']
              const clean: Record<string, string> = {}
              for (const [k, v] of Object.entries(draftData.draft.overrides)) {
                if (v !== undefined && v !== null && v !== '' && !dashboardBindings.includes(k)) clean[k] = v as string
              }
              setDraftOverrides(clean)
            } else {
              setDraftOverrides({})
            }
          }
        } catch { /* ignore */ }

        const cd = result.certData
        if (!cd.fechaExpedicion || cd.fechaExpedicion.trim() === '') {
          cd.fechaExpedicion = new Date().toISOString().split('T')[0]
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cd.fechaExpedicion)) {
          const parts = cd.fechaExpedicion.split('/')
          cd.fechaExpedicion = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
        // Fix old literals
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
        // Apply draft overrides to displayData later (via useMemo)
        const allCals = Object.values(cd.calificaciones || {}).flat() as CalificacionRow[]
        const gradeCount = allCals.filter(c => c.nota && c.nota !== '').length
        toast({ title: 'Datos cargados', description: `${gradeCount} calificaciones del rawData.` })
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar datos de calificaciones.', variant: 'destructive' })
    } finally {
      setLoadingData(false)
    }
  }, [toast, plan, reloadDashboardCells])

  // Inline edit handler: update a single dataBinding value and auto-save
  const handleCellEdit = useCallback((binding: string, newValue: string) => {
    setDraftOverrides(prev => {
      return { ...prev, [binding]: newValue }
    })
    // Auto-save to cert-draft ÔÇö outside state updater to avoid side-effects in React
    if (selectedStudent) {
      const updated = { ...draftOverrides, [binding]: newValue }
      setSavingDraft(true)
      const draftSaveUrl = plan === 'vigente'
       ? `/api/plan-vigente/${selectedStudent.id}/cert-draft`
       : `/api/plan-derogado/${selectedStudent.id}/cert-draft`
     fetch(draftSaveUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: { overrides: updated } }),
      }).then(res => {
        if (res.ok) {
          toast({ title: 'Guardado', description: `Cambios guardados en borrador.`, duration: 1500 })
        }
      }).catch(() => {
        toast({ title: 'Error', description: 'No se pudo guardar el cambio.', variant: 'destructive' })
      }).finally(() => setSavingDraft(false))
    }
  }, [selectedStudent, draftOverrides, toast])

  // Helper: apply draft overrides to simple array fields (inst, orient, grupo)
  function applyArrayOverrides(
    arr: Record<string, any>[] | undefined, ov: Record<string, string>, prefix: string, fields: string[]
  ): Record<string, any>[] {
    if (!arr) return []
    return arr.map((item, idx) => {
      const patched = { ...item }
      for (const field of fields) {
        const key = `${prefix}.${idx}.${field}`
        const val = ov[key]
        if (val !== undefined && val !== null && val !== '') {
          patched[field] = val
        }
      }
      return patched
    })
  }

  // Helper: build instituciones array from rawDataMap flat keys (plan derogado)
  // rawDataMap has INST.BASICA.1-5, LOCAL.BASICA.1-5, EF.BASICA.1-5
  // and INST.DIV.1-5, LOCAL.DIV.1-5, EF.DIV.1-5
  function buildInstitucionesFromRaw(rm: Record<string, string>): { numero: number; denominacion: string; localidad: string; ef: string }[] {
    const result: { numero: number; denominacion: string; localidad: string; ef: string }[] = []
    // Collect all institution entries (BASICA first, then DIV)
    const allEntries: { denominacion: string; localidad: string; ef: string }[] = []
    for (let i = 1; i <= 5; i++) {
      allEntries.push({
        denominacion: rm[`INST.BASICA.${i}`] || '',
        localidad: rm[`LOCAL.BASICA.${i}`] || '',
        ef: rm[`EF.BASICA.${i}`] || '',
      })
    }
    for (let i = 1; i <= 5; i++) {
      const denom = rm[`INST.DIV.${i}`] || ''
      const loc = rm[`LOCAL.DIV.${i}`] || ''
      const ef = rm[`EF.DIV.${i}`] || ''
      // Only add DIV entries if they have data and aren't duplicates of BASICA
      if (denom && !allEntries.some(e => e.denominacion === denom)) {
        allEntries.push({ denominacion: denom, localidad: loc, ef })
      }
    }
    // Fallback: check top-level flat keys (INSTITUCION1-5, LOCALIDAD1-5, EF1-5)
    if (allEntries.every(e => !e.denominacion)) {
      for (let i = 1; i <= 5; i++) {
        allEntries.push({
          denominacion: rm[`INSTITUCION${i}`] || '',
          localidad: rm[`LOCALIDAD${i}`] || '',
          ef: rm[`EF${i}`] || '',
        })
      }
    }
    // Build final result with numbering, skip empty entries
    let num = 1
    for (const entry of allEntries) {
      if (entry.denominacion) {
        result.push({ numero: num++, ...entry })
      }
      if (result.length >= 5) break
    }
    return result
  }

  // Helper: apply draft overrides to calificaciones (nested by year key)
  function applyCalifOverrides(
    cals: Record<string, any[]> | undefined, ov: Record<string, string>
  ): Record<string, any[]> {
    if (!cals) return {}
    const YEAR_NAME_MAP: Record<string, string> = {
      '1': 'Primer A├▒o', '2': 'Segundo A├▒o', '3': 'Tercer A├▒o',
      '4': 'Cuarto A├▒o', '5': 'Quinto A├▒o',
    }
    const CALIF_FIELD_MAP: Record<string, string> = {
      materia: 'materia', numero: 'numero', nota: 'nota', literal: 'literal',
      te: 'tipoEvaluacion', mes: 'fechaMes', anio: 'fechaAnio', inst: 'instEduc',
    }
    const result: Record<string, any[]> = {}
    for (const [yearKey, subjects] of Object.entries(cals)) {
      result[yearKey] = subjects.map((subj: any, sIdx: number) => {
        const patched = { ...subj }
        // Check both numeric key (e.g., "calif.1.0.nota") and year-name key
        for (let yNum = 1; yNum <= 5; yNum++) {
          if (YEAR_NAME_MAP[String(yNum)] !== yearKey) continue
          for (const [shortField, realField] of Object.entries(CALIF_FIELD_MAP)) {
            const key = `calif.${yNum}.${sIdx}.${shortField}`
            const val = ov[key]
            if (val !== undefined && val !== null && val !== '') {
              patched[realField] = val
            }
          }
        }
        return patched
      })
    }
    return result
  }

  // Convert CertData to DisplayData for the grid
  const displayData: DisplayData | null = useMemo(() => {
    // Extraer datos del tablero: Z4 (col 25, row 3) = fecha expedici├│n, AH4 (col 33, row 3) = lugar
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
      // Z6 (row 5, col 25) = Nombre del Director, Z7 (row 6, col 25) = C├®dula del Director
      const z6 = dashboardCells[5]?.[25]?.trim() || ''
      const z7 = dashboardCells[6]?.[25]?.trim() || ''
      dashboardExtra['DIRECTOR.NOMBRE'] = z6 || 'PAREDES HURTADO, RAQUEL'
      dashboardExtra['DIRECTOR.CEDULA'] = z7 || 'V 6419439'
    }

    // Build rawDataMap from rawDataFlat + dashboard + draft overrides
    const rawDataMap = rawDataFlat ? { ...rawDataFlat, ...dashboardExtra, ...Object.fromEntries(
      Object.entries(draftOverrides).filter(([k]) => k.startsWith('rawData.')).map(([k, v]) => [k.replace('rawData.', ''), v])
    ) } : undefined

    // For plan derogado with only rawDataFlat (no parsed certData), return minimal DisplayData with rawDataMap
    if (!certData) {
      if (rawDataMap && Object.keys(rawDataMap).length > 0) {
        return {
          lugar: '', fechaExpedicion: '', planEstudio: '', planCodigo: schoolConfig.planCodigo,
          od: '', denominacion: '', direccion: '', telefono: '', municipio: '', estado: '', cdcce: '',
          estudiante: { cedula: rawDataMap.CEDULA || '', fechaNacimiento: rawDataMap.FECHA || '', apellidos: rawDataMap.APELLIDOS || '', nombres: rawDataMap.NOMBRES || '', pais: rawDataMap.PAIS || '', estado: rawDataMap.ESTADO || '', municipio: rawDataMap.MUNICIPIO || '' },
          instituciones: buildInstitucionesFromRaw(rawDataMap), calificaciones: {}, orientacion: [], grupos: [],
          observaciones: '', observacionesLines: [], promedioAcumulado: '',
          director: { apellidosNombres: '', cedula: '' }, directorCdcce: { apellidosNombres: '', cedula: '' },
          acta: '', actaFecha: '', actaAnio: '', literalesFinales: [],
          rawDataMap,
        }
      }
      return null
    }

    // Convert YYYY-MM-DD ÔåÆ DD/MM/YYYY
    let fechaExp = certData.fechaExpedicion
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaExp)) {
      const [y, m, d] = fechaExp.split('-')
      fechaExp = `${d}/${m}/${y}`
    }

    // Apply draft overrides to certData fields
    // Treat empty string as "no override" so nullish coalescing works
    const ov = draftOverrides
    const get = (binding: string): string | undefined => {
      const v = ov[binding]
      return (v === undefined || v === null || v === '') ? undefined : v
    }

    // Datos del tablero para inyectar en displayData (para resolveBinding)
    const dashLugar = dashboardExtra['EXPEDICION.LUGAR'] || ''
    const dashFecha = dashboardExtra['EXPEDICION.FECHA'] || ''
    const dashDirectorNombre = dashboardExtra['DIRECTOR.NOMBRE'] || ''
    const dashDirectorCedula = dashboardExtra['DIRECTOR.CEDULA'] || ''

    return {
      lugar: get('doc.lugar') ?? (dashLugar || certData.lugar),
      fechaExpedicion: get('doc.fechaExpedicion') ?? (dashFecha || fechaExp),
      planEstudio: get('doc.planEstudio') ?? certData.planEstudio,
      planCodigo: schoolConfig.planCodigo,
      od: get('school.codigo') ?? certData.od,
      denominacion: get('school.denominacion') ?? certData.denominacion,
      direccion: get('school.direccion') ?? certData.direccion,
      telefono: get('school.telefono') ?? certData.telefono,
      municipio: get('school.municipio') ?? certData.municipio,
      estado: get('school.estado') ?? certData.estado,
      cdcce: get('school.cdcce') ?? certData.cdcce,
      estudiante: {
        cedula: get('student.cedula') ?? certData.estudiante.cedula,
        fechaNacimiento: get('student.fechaNacimiento') ?? certData.estudiante.fechaNacimiento,
        apellidos: get('student.apellidos') ?? certData.estudiante.apellidos,
        nombres: get('student.nombres') ?? certData.estudiante.nombres,
        pais: get('student.pais') ?? certData.estudiante.pais,
        estado: get('student.estado') ?? certData.estudiante.estado,
        municipio: get('student.municipio') ?? certData.estudiante.municipio,
      },
      instituciones: applyArrayOverrides(certData.instituciones, ov, 'inst', ['denominacion', 'localidad', 'ef']),
      calificaciones: applyCalifOverrides(certData.calificaciones, ov),
      orientacion: applyArrayOverrides(certData.orientacion, ov, 'orient', ['anio', 'literal']),
      grupos: applyArrayOverrides(certData.grupos, ov, 'grupo', ['anio', 'grupo', 'literal']),
      observaciones: get('doc.observaciones') ?? certData.observaciones,
      observacionesLines: [
        get('obsCert.0') ?? (certData.observacionesLines?.[0] || ''),
        get('obsCert.1') ?? (certData.observacionesLines?.[1] || ''),
        get('obsCert.2') ?? (certData.observacionesLines?.[2] || ''),
        get('obsCert.3') ?? (certData.observacionesLines?.[3] || ''),
      ],
      promedioAcumulado: get('doc.promedioAcumulado') ?? certData.promedioAcumulado,
      director: {
        apellidosNombres: dashDirectorNombre || certData.director?.apellidosNombres || '',
        cedula: dashDirectorCedula || certData.director?.cedula || '',
      },
      directorCdcce: certData.directorCdcce,
      acta: get('doc.acta') ?? (certData.acta || ''),
      actaFecha: get('doc.actaFecha') ?? (certData.actaFecha || ''),
      actaAnio: get('doc.actaAnio') ?? (certData.actaAnio || ''),
      literalesFinales: [
        get('doc.literalFinal.0') ?? (certData.literalesFinales?.[0] || ''),
        get('doc.literalFinal.1') ?? (certData.literalesFinales?.[1] || ''),
        get('doc.literalFinal.2') ?? (certData.literalesFinales?.[2] || ''),
        get('doc.literalFinal.3') ?? (certData.literalesFinales?.[3] || ''),
        get('doc.literalFinal.4') ?? (certData.literalesFinales?.[4] || ''),
      ],
      rawDataMap,
    }
  }, [certData, draftOverrides, rawDataFlat, dashboardCells])

  // === Grid Operations ===
  // Mouse handlers for range selection
  const handleCellMouseDown = useCallback((r: number, c: number) => {
    setIsDragging(true)
    setSelAnchor({ row: r, col: c })
    setSelEnd({ row: r, col: c })
    setSelectedCell({ row: r, col: c })
  }, [])

  const handleCellMouseEnter = useCallback((r: number, c: number) => {
    if (!isDragging) return
    setSelEnd({ row: r, col: c })
  }, [isDragging])

  const handleCellMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const clearRangeSelection = useCallback(() => {
    setSelAnchor(null)
    setSelEnd(null)
    setIsDragging(false)
  }, [])

  const handleCellUpdate = useCallback((updates: Partial<CellConfig>) => {
    if (!selectedCell) return
    setGridConfig((prev) => updateCellInConfig(prev, selectedCell.row, selectedCell.col, updates))
  }, [selectedCell])

  // Apply format updates to ALL cells in the current selection range
  const handleCellUpdateRange = useCallback((updates: Partial<CellConfig>) => {
    if (!selectionRange) return
    const minR = Math.min(selectionRange.r1, selectionRange.r2)
    const maxR = Math.max(selectionRange.r1, selectionRange.r2)
    const minC = Math.min(selectionRange.c1, selectionRange.c2)
    const maxC = Math.max(selectionRange.c1, selectionRange.c2)
    setGridConfig((prev) => {
      let updated = prev
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          // Skip cells that are occupied by a rowspan/colspan from another cell
          const row = updated.rows[r]
          if (!row) continue
          const cell = row.cells[c]
          if (!cell) continue
          // Skip cells that are purely occupied (no content/binding of their own)
          // They are part of a merged cell from another origin
          updated = updateCellInConfig(updated, r, c, updates)
        }
      }
      return updated
    })
  }, [selectionRange])

  // Properties that should apply to the range in batch (format-only, NOT content/binding/merge)
  const FORMAT_ONLY_KEYS = new Set([
    'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'verticalAlign',
    'color', 'whiteSpace', 'padding', 'bgColor',
    'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderColor',
    'width', 'height',
  ])

  // Unified update handler: format props go to range, content/binding/merge go to single cell
  const handleFormatUpdate = useCallback((updates: Partial<CellConfig>) => {
    if (!selectedCell) return

    // Check if updates contain only format properties
    const keys = Object.keys(updates)
    const hasOnlyFormat = keys.every(k => FORMAT_ONLY_KEYS.has(k))
    const hasNonFormat = keys.some(k => !FORMAT_ONLY_KEYS.has(k))

    if (selectionRange && hasOnlyFormat) {
      // Pure format change ÔåÆ apply to all cells in range
      handleCellUpdateRange(updates)
    }

    if (hasNonFormat) {
      // Content/binding/merge ÔåÆ always apply to single selected cell only
      const nonFormatUpdates: Partial<CellConfig> = {}
      for (const k of keys) {
        if (!FORMAT_ONLY_KEYS.has(k)) {
          ;(nonFormatUpdates as any)[k] = (updates as any)[k]
        }
      }
      if (Object.keys(nonFormatUpdates).length > 0) {
        setGridConfig((prev) => updateCellInConfig(prev, selectedCell.row, selectedCell.col, nonFormatUpdates))
      }
    }

    // If only format keys AND no range, apply to single cell
    if (!selectionRange && hasOnlyFormat) {
      setGridConfig((prev) => updateCellInConfig(prev, selectedCell.row, selectedCell.col, updates))
    }
  }, [selectionRange, selectedCell, handleCellUpdateRange])

  const handleApplyColumns = () => {
    const n = parseInt(colInput)
    if (isNaN(n) || n < 1 || n > 100) {
      toast({ title: 'Error', description: 'Ingrese un n├║mero v├ílido de columnas (1-100).', variant: 'destructive' })
      return
    }
    const newConfig: GridConfig = {
      totalCols: n,
      columnWidths: Array(n).fill(`${(100 / n).toFixed(2)}%`),
      rows: [emptyRow(n)],
    }
    setGridConfig(newConfig)
    setSelectedCell(null)
    toast({ title: `Grilla reiniciada con ${n} columnas` })
  }

  const handleAddRow = () => {
    setGridConfig((prev) => ({
      ...prev,
      rows: [...prev.rows, emptyRow(prev.totalCols)],
    }))
  }

  const handleInsertRowAbove = () => {
    if (!selectedCell) {
      toast({ title: 'Sin selecci├│n', description: 'Selecciona una celda primero para insertar fila arriba.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      const newRow = emptyRow(prev.totalCols)
      const newRows = [...prev.rows]

      // Adjust rowspan of cells in the row above (selectedCell.row - 1)
      // that span across the insertion point
      const aboveIdx = selectedCell.row - 1
      if (aboveIdx >= 0 && aboveIdx < prev.rows.length) {
        const aboveRow = prev.rows[aboveIdx]
        const adjustedCells: Record<number, CellConfig> = {}
        for (const [key, cell] of Object.entries(aboveRow.cells)) {
          const col = Number(key)
          const rs = cell.rowspan || 1
          // If this cell spans to or past the insertion row, reduce rowspan
          if (col === 0 || true) { // check all cells
            if (rs > 1 && (aboveIdx + rs) > selectedCell.row) {
              adjustedCells[col] = { ...cell, rowspan: rs - 1 }
              continue
            }
          }
          adjustedCells[col] = cell
        }
        newRows[aboveIdx] = { cells: adjustedCells }
      }

      // Also adjust rowspan of cells in the CURRENT row (selectedCell.row)
      // since it shifts down by 1, but their rowspan origin stays the same
      const currentRow = prev.rows[selectedCell.row]
      if (currentRow) {
        const adjustedCurrent: Record<number, CellConfig> = {}
        for (const [key, cell] of Object.entries(currentRow.cells)) {
          const col = Number(key)
          const rs = cell.rowspan || 1
          // Cells that started in a row above and were part of a rowspan
          // don't need adjustment - they're already handled by the row above
          adjustedCurrent[col] = cell
        }
        // Keep the current row as-is (it just moves down)
      }

      newRows.splice(selectedCell.row, 0, newRow)
      setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col })
      return { ...prev, rows: newRows }
    })
  }

  const handleInsertRowBelow = () => {
    if (!selectedCell) {
      toast({ title: 'Sin selecci├│n', description: 'Selecciona una celda primero para insertar fila abajo.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      const newRow = emptyRow(prev.totalCols)
      const insertAt = selectedCell.row + 1
      const newRows = [...prev.rows]

      // Adjust rowspan of cells in selectedCell.row that span across insertAt
      const currentRow = prev.rows[selectedCell.row]
      if (currentRow) {
        const adjustedCells: Record<number, CellConfig> = {}
        for (const [key, cell] of Object.entries(currentRow.cells)) {
          const col = Number(key)
          const rs = cell.rowspan || 1
          if (rs > 1 && (selectedCell.row + rs) > insertAt) {
            adjustedCells[col] = { ...cell, rowspan: rs - 1 }
            continue
          }
          adjustedCells[col] = cell
        }
        newRows[selectedCell.row] = { cells: adjustedCells }
      }

      newRows.splice(insertAt, 0, newRow)
      return { ...prev, rows: newRows }
    })
  }

  const handleDeleteLastRow = () => {
    setGridConfig((prev) => {
      if (prev.rows.length <= 1) {
        toast({ title: 'No se puede eliminar la ├║ltima fila', variant: 'destructive' })
        return prev
      }
      const newRows = prev.rows.slice(0, -1)
      // Clear selection if it was on the deleted row
      if (selectedCell && selectedCell.row >= newRows.length) {
        setSelectedCell(null)
      }
      return { ...prev, rows: newRows }
    })
  }

  // === Column Operations ===
  const handleInsertColLeft = () => {
    if (!selectedCell) {
      toast({ title: 'Sin selecci├│n', description: 'Selecciona una celda primero para insertar columna a la izquierda.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      const insertAt = selectedCell.col
      // Shift cell indices >= insertAt in every row
      const newRows = prev.rows.map((row) => {
        const newCells: Record<number, CellConfig> = {}
        for (const [key, cell] of Object.entries(row.cells)) {
          const idx = Number(key)
          if (idx >= insertAt) {
            newCells[idx + 1] = cell
          } else {
            newCells[idx] = cell
          }
        }
        newCells[insertAt] = emptyCell()
        return { cells: newCells }
      })
      // Insert column width
      const newWidths = [...prev.columnWidths]
      newWidths.splice(insertAt, 0, '3%')
      // Adjust selection
      setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 })
      return { ...prev, totalCols: prev.totalCols + 1, columnWidths: newWidths, rows: newRows }
    })
    setColInput(String(gridConfig.totalCols + 1))
  }

  const handleInsertColRight = () => {
    if (!selectedCell) {
      toast({ title: 'Sin selecci├│n', description: 'Selecciona una celda primero para insertar columna a la derecha.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      const insertAt = selectedCell.col + 1
      // Shift cell indices >= insertAt in every row
      const newRows = prev.rows.map((row) => {
        const newCells: Record<number, CellConfig> = {}
        for (const [key, cell] of Object.entries(row.cells)) {
          const idx = Number(key)
          if (idx >= insertAt) {
            newCells[idx + 1] = cell
          } else {
            newCells[idx] = cell
          }
        }
        newCells[insertAt] = emptyCell()
        return { cells: newCells }
      })
      // Insert column width
      const newWidths = [...prev.columnWidths]
      newWidths.splice(insertAt, 0, '3%')
      // Selection stays on same column
      return { ...prev, totalCols: prev.totalCols + 1, columnWidths: newWidths, rows: newRows }
    })
    setColInput(String(gridConfig.totalCols + 1))
  }

  const handleDeleteLastCol = () => {
    setGridConfig((prev) => {
      if (prev.totalCols <= 1) {
        toast({ title: 'No se puede eliminar la ├║ltima columna', variant: 'destructive' })
        return prev
      }
      const lastCol = prev.totalCols - 1
      const newRows = prev.rows.map((row) => {
        const { [lastCol]: _removed, ...rest } = row.cells
        return { cells: rest }
      })
      const newWidths = prev.columnWidths.slice(0, -1)
      if (selectedCell && selectedCell.col >= prev.totalCols - 1) {
        setSelectedCell(null)
      }
      return { ...prev, totalCols: prev.totalCols - 1, columnWidths: newWidths, rows: newRows }
    })
    setColInput(String(gridConfig.totalCols - 1))
  }

  // === Merge Selection (drag range) ===
  const handleMergeSelection = () => {
    if (!selectionRange) {
      toast({ title: 'Sin selecci├│n', description: 'Selecciona varias celdas arrastrando primero.', variant: 'destructive' })
      return
    }
    const minR = Math.min(selectionRange.r1, selectionRange.r2)
    const maxR = Math.max(selectionRange.r1, selectionRange.r2)
    const minC = Math.min(selectionRange.c1, selectionRange.c2)
    const maxC = Math.max(selectionRange.c1, selectionRange.c2)
    const spanCols = maxC - minC + 1
    const spanRows = maxR - minR + 1
    if (spanCols === 1 && spanRows === 1) {
      toast({ title: 'Una sola celda', description: 'Selecciona al menos 2 celdas para combinar.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      const updated = updateCellInConfig(prev, minR, minC, {
        colspan: spanCols,
        rowspan: spanRows,
      })
      const newRows = updated.rows.map((row, ri) => {
        if (ri < minR || ri > maxR) return row
        const newCells = { ...row.cells }
        for (let ci = minC; ci <= maxC; ci++) {
          if (ri === minR && ci === minC) continue
          delete newCells[ci]
        }
        return { cells: newCells }
      })
      return { ...updated, rows: newRows }
    })
    setSelectedCell({ row: minR, col: minC })
    clearRangeSelection()
    toast({ title: 'Celdas combinadas', description: `${spanCols}x${spanRows} celdas fusionadas en una.` })
  }

  // === Merge / Split Operations ===
  // Combina columnas: elimina la columna de la derecha y suma su ancho a la actual.
  // El total de columnas baja (ej: 27 ÔåÆ 26).
  const handleMergeColumns = () => {
    if (!selectedCell) {
      toast({ title: 'Sin selecci├│n', description: 'Selecciona una celda primero.', variant: 'destructive' })
      return
    }
    if (gridConfig.totalCols <= 1) {
      toast({ title: 'No se puede', description: 'Solo queda 1 columna.', variant: 'destructive' })
      return
    }
    const mergeCol = selectedCell.col
    if (mergeCol >= gridConfig.totalCols - 1) {
      toast({ title: 'No se puede', description: 'No hay columna a la derecha para combinar.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      // Sumar ancho de la columna derecha a la actual
      const newWidths = [...prev.columnWidths]
      const leftW = parseFloat(newWidths[mergeCol]) || 0
      const rightW = parseFloat(newWidths[mergeCol + 1]) || 0
      newWidths[mergeCol] = `${leftW + rightW}%`
      newWidths.splice(mergeCol + 1, 1)
      // En cada fila, remover la columna mergeCol+1 y reindexar
      const newRows = prev.rows.map((row) => {
        const newCells: Record<number, CellConfig> = {}
        for (const [key, cell] of Object.entries(row.cells)) {
          const idx = Number(key)
          if (idx === mergeCol + 1) continue // descartar columna derecha
          if (idx > mergeCol + 1) {
            newCells[idx - 1] = cell // reindexar
          } else {
            newCells[idx] = cell
          }
        }
        return { cells: newCells }
      })
      // Ajustar seleccion si estaba mas alla de la columna eliminada
      if (selectedCell.col > mergeCol) {
        setSelectedCell({ row: selectedCell.row, col: Math.max(0, selectedCell.col - 1) })
      }
      const newTotal = prev.totalCols - 1
      return { ...prev, totalCols: newTotal, columnWidths: newWidths, rows: newRows }
    })
    setColInput(String(gridConfig.totalCols - 1))
  }

  // Combina filas: elimina la fila de abajo y la suma a la actual.
  // El total de filas baja en 1.
  const handleMergeRows = () => {
    if (!selectedCell) {
      toast({ title: 'Sin selecci├│n', description: 'Selecciona una celda primero.', variant: 'destructive' })
      return
    }
    if (gridConfig.rows.length <= 1) {
      toast({ title: 'No se puede', description: 'Solo queda 1 fila.', variant: 'destructive' })
      return
    }
    const mergeRow = selectedCell.row
    if (mergeRow >= gridConfig.rows.length - 1) {
      toast({ title: 'No se puede', description: 'No hay fila debajo para combinar.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      const currentRow = prev.rows[mergeRow]
      const nextRow = prev.rows[mergeRow + 1]
      // Fusionar contenido de celdas: si la celda de abajo tiene contenido y la actual no, copiarlo
      const mergedCells: Record<number, CellConfig> = { ...currentRow.cells }
      for (const [key, cell] of Object.entries(nextRow.cells)) {
        const idx = Number(key)
        const existing = mergedCells[idx]
        if (!existing || (!existing.content && !existing.dataBinding)) {
          mergedCells[idx] = { ...cell }
        } else if (cell.content && !existing.content) {
          mergedCells[idx] = { ...existing, content: existing.content + ' ' + cell.content }
        }
      }
      const newRows = [...prev.rows]
      newRows[mergeRow] = { cells: mergedCells }
      newRows.splice(mergeRow + 1, 1)
      if (selectedCell.row >= newRows.length) {
        setSelectedCell(null)
      }
      return { ...prev, rows: newRows }
    })
  }

  // Separar celda: reset colspan/rowspan a 1
  const handleSplitCell = () => {
    if (!selectedCell) {
      toast({ title: 'Sin selecci├│n', description: 'Selecciona una celda primero.', variant: 'destructive' })
      return
    }
    const cell = gridConfig.rows[selectedCell.row]?.cells[selectedCell.col]
    if (!cell || (cell.colspan === 1 && cell.rowspan === 1)) {
      toast({ title: 'Sin combinaci├│n', description: 'Esta celda no est├í combinada (colspan/rowspan ya es 1).', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => updateCellInConfig(prev, selectedCell.row, selectedCell.col, { colspan: 1, rowspan: 1 }))
  }

  // === Save to DB (opens dialog for name) ===
  const handleOpenSaveDialog = () => {
    setSaveName('')
    setShowSaveDialog(true)
  }

  const handleConfirmSave = async () => {
    if (!saveName.trim()) {
      toast({ title: 'Nombre requerido', description: 'Ingresa un nombre para el layout.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/cert-layouts?plan=${plan}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: saveName.trim(),
          datos: gridConfig,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }

      setShowSaveDialog(false)
      toast({
        title: '┬íGuardado exitoso!',
        description: `El layout "${saveName.trim()}" se guard├│ correctamente en la base de datos.`,
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido'
      toast({ title: 'Error al guardar', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // === Load saved layouts ===
  const handleOpenLayoutsDialog = async () => {
    setShowLayoutsDialog(true)
    setLoadingLayouts(true)
    try {
      const res = await fetch(`/api/cert-layouts?plan=${plan}`)
      if (res.ok) {
        const data = await res.json()
        setSavedLayouts(data)
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los layouts.', variant: 'destructive' })
    } finally {
      setLoadingLayouts(false)
    }
  }

  const handleLoadLayoutFromDB = async (id: string) => {
    setLoadingLayout(true)
    try {
      const res = await fetch(`/api/cert-layouts/${id}?plan=${plan}`)
      if (!res.ok) {
        throw new Error('Layout no encontrado')
      }
      const layout = await res.json()
      const parsed: GridConfig = typeof layout.datos === 'string'
        ? JSON.parse(layout.datos)
        : layout.datos

      if (parsed.rows && Array.isArray(parsed.rows) && parsed.totalCols) {
        setGridConfig(patchDataBindings(parsed))
        setSelectedCell(null)
        setShowLayoutsDialog(false)
        toast({ title: 'Layout cargado', description: `"${layout.nombre}" se carg├│ correctamente.` })
      } else {
        throw new Error('Datos de layout inv├ílidos')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido'
      toast({ title: 'Error al cargar', description: msg, variant: 'destructive' })
    } finally {
      setLoadingLayout(false)
    }
  }

  const handleDeleteLayout = async (id: string) => {
    try {
      const res = await fetch(`/api/cert-layouts/${id}?plan=${plan}`, { method: 'DELETE' })
      if (res.ok) {
        setSavedLayouts((prev) => prev.filter((l) => l.id !== id))
        toast({ title: 'Layout eliminado' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el layout.', variant: 'destructive' })
    }
  }

  // Local save/load/reset
  const handleLoadLocal = () => {
    const loaded = loadGridConfig()
    setGridConfig(loaded)
    setSelectedCell(null)
    toast({ title: 'Dise├▒o cargado', description: 'Se restaur├│ desde el almacenamiento local.' })
  }

  const handleReset = () => {
    const def = createDefaultTemplate()
    setGridConfig(def)
    setSelectedCell(null)
    setColInput('27')
    toast({ title: 'Dise├▒o restablecido', description: 'Se restaur├│ la plantilla por defecto.' })
  }

  // Build the certification table HTML string (shared by print & PDF)
  const buildTableHtml = () => {
    const cfg = gridConfig
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

    const borderStyle = (enabled: boolean, color: string) =>
      enabled ? `1px solid ${color}` : 'none'
    const logoSrc = `${window.location.origin}/logo-gob-mppe.png`

    let rowsHtml = ''
    for (let r = 0; r < cfg.rows.length; r++) {
      const gridRow = cfg.rows[r]
      let cellsHtml = ''
      for (let c = 0; c < cfg.totalCols; c++) {
        if (occupied.has(`${r}-${c}`)) continue
        const cell = gridRow.cells[c] || emptyCell()
        let content = cell.content
        if (cell.dataBinding && data) {
          content = resolveBinding(cell.dataBinding, data, cfg) || ''
        }
        const csAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ''
        const rsAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ''
        const imgTag = content && content.startsWith('##LOGO_') && content.endsWith('##')
          ? `<img src="${logoSrc}" style="max-width:100%;height:auto;object-fit:contain;display:block">`
          : ''
        const text = imgTag || (content || '')
        cellsHtml += `<td${csAttr}${rsAttr} style="border-top:${borderStyle(cell.borderTop, cell.borderColor)};border-right:${borderStyle(cell.borderRight, cell.borderColor)};border-bottom:${borderStyle(cell.borderBottom, cell.borderColor)};border-left:${borderStyle(cell.borderLeft, cell.borderColor)};width:${cell.width || 'auto'};height:${cell.height || 'auto'};font-size:${cell.fontSize}pt;font-weight:${cell.fontWeight};font-style:${cell.fontStyle};text-decoration:${cell.textDecoration === 'underline' ? 'underline' : 'none'};text-align:${cell.textAlign};vertical-align:${cell.verticalAlign};color:${cell.color || 'inherit'};white-space:${cell.whiteSpace};padding:${cell.padding};background:${cell.bgColor || 'transparent'}">${text}</td>`
      }
      rowsHtml += `<tr>${cellsHtml}</tr>`
    }

    const colgroupHtml = cfg.columnWidths.map(w => `<col style="width:${w || 'auto'}">`).join('')
    return { tableHtml: `<table><colgroup>${colgroupHtml}</colgroup><tbody>${rowsHtml}</tbody></table>`, colgroupHtml, hasLogo: rowsHtml.includes('<img') }
  }

  const executePrint = (scale: number) => {
    setShowPrintDialog(false)
    const { tableHtml } = buildTableHtml()

    const html = `<!DOCTYPE html><html><head><title>Certificaci├│n</title><style>
/* FORZAMOS EL TAMA├æO LEGAL EN LA IMPRESORA */
@page{size: Legal; margin:5mm}
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;justify-content:center;align-items:flex-start;min-height:100vh}
/* La tabla sigue teniendo el tama├▒o ARCH B internamente */
table{border-collapse:collapse;width:816px;height:1344px;font-family:Arial,sans-serif;font-size:9pt;line-height:1.2;table-layout:fixed;transform:scale(${scale / 100});transform-origin:top center}
td{overflow:hidden}
img{max-width:100%;height:auto}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${tableHtml}</body></html>`

    let iframe = document.getElementById('cert-print-frame') as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'cert-print-frame'
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;border:none'
      document.body.appendChild(iframe)
    }
    const doc = iframe.contentDocument!
    doc.open()
    doc.write(html)
    doc.close()

    const imgs = doc.querySelectorAll('img')
    if (imgs.length > 0) {
      let loaded = 0
      const onDone = () => {
        loaded++
        if (loaded >= imgs.length) {
          setTimeout(() => { iframe!.contentWindow!.print() }, 300)
        }
      }
      imgs.forEach(img => {
        if (img.complete) { onDone() }
        else { img.onload = onDone; img.onerror = onDone }
      })
    } else {
      setTimeout(() => { iframe!.contentWindow!.print() }, 300)
    }
  }

  const handlePrint = () => setShowPrintDialog(true)

  // Selected cell data
  const selectedCellData = useMemo(() => {
    if (!selectedCell) return null
    const row = gridConfig.rows[selectedCell.row]
    return row?.cells[selectedCell.col] || emptyCell()
  }, [selectedCell, gridConfig])

  return (
    <AppShell>
      <div className="space-y-3 print:hidden">
        {/* Header */}
        {isVigenteReadOnly ? (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">CertificaciÃ³n EMG</h1>
              <p className="text-muted-foreground text-sm">Vista e impresiÃ³n de certificaciones (solo lectura)</p>
            </div>
            <Button size="sm" variant="default" onClick={handlePrint} className="h-8 text-xs" title="Imprimir la certificaciÃ³n con los datos actuales">
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir
            </Button>
          </div>
        ) : (
          <div>
          <h1 className="text-2xl font-bold">Editor de Grilla ÃÃ Certificaciones</h1>
          <p className="text-muted-foreground text-sm">Constructor celda por celda para el formato de certificaciÃ³n</p>
          </div>
        )}

        {/* Toolbar Row 1: Grid controls — solo para derogado */}
        {!isVigenteReadOnly && <Card>
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* === FILAS === */}
              <Badge variant="secondary" className="h-7 text-[10px] font-semibold px-2">FILAS</Badge>
              <Button size="sm" variant="outline" onClick={handleAddRow} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
              <Button size="sm" variant="outline" onClick={handleInsertRowAbove} className="h-7 text-xs" title="Insertar fila arriba de la celda seleccionada">
                <ArrowUp className="h-3 w-3 mr-1" /> Arriba
              </Button>
              <Button size="sm" variant="outline" onClick={handleInsertRowBelow} className="h-7 text-xs" title="Insertar fila abajo de la celda seleccionada">
                <ArrowDown className="h-3 w-3 mr-1" /> Abajo
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeleteLastRow} className="h-7 text-xs">
                <Minus className="h-3 w-3 mr-1" /> Eliminar
              </Button>

              <div className="w-px h-5 bg-border" />

              {/* === COLUMNAS === */}
              <Badge variant="secondary" className="h-7 text-[10px] font-semibold px-2">COLS</Badge>
              <Button size="sm" variant="outline" onClick={handleInsertColLeft} className="h-7 text-xs" title="Insertar columna a la izquierda de la celda seleccionada">
                <ArrowLeft className="h-3 w-3 mr-1" /> Izquierda
              </Button>
              <Button size="sm" variant="outline" onClick={handleInsertColRight} className="h-7 text-xs" title="Insertar columna a la derecha de la celda seleccionada">
                <ArrowRight className="h-3 w-3 mr-1" /> Derecha
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeleteLastCol} className="h-7 text-xs">
                <Minus className="h-3 w-3 mr-1" /> Eliminar
              </Button>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Total:</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={colInput}
                  onChange={(e) => setColInput(e.target.value)}
                  className="h-7 w-14 text-xs text-center"
                />
                <Button size="sm" variant="outline" onClick={handleApplyColumns} className="h-7 text-xs">
                  Aplicar
                </Button>
              </div>

              <div className="w-px h-5 bg-border" />

              {/* === COMBINAR === */}
              <Badge variant="secondary" className="h-7 text-[10px] font-semibold px-2">COMBINAR</Badge>
              <Button size="sm" variant="outline" onClick={handleMergeSelection} className="h-7 text-xs" title="Arrastra sobre varias celdas, luego pulsa para combinarlas en una">
                <Group className="h-3 w-3 mr-1" /> Selecci├│n
              </Button>
              <Button size="sm" variant="outline" onClick={() => { clearRangeSelection(); handleMergeColumns() }} className="h-7 text-xs" title="Elimina la columna derecha y suma su ancho. Total cols baja en 1.">
                <Combine className="h-3 w-3 mr-1" /> Columnas
              </Button>
              <Button size="sm" variant="outline" onClick={() => { clearRangeSelection(); handleMergeRows() }} className="h-7 text-xs" title="Elimina la fila de abajo. Total filas baja en 1.">
                <TableCellsMerge className="h-3 w-3 mr-1" /> Filas
              </Button>
              <Button size="sm" variant="outline" onClick={() => { clearRangeSelection(); handleSplitCell() }} className="h-7 text-xs" title="Reset colspan/rowspan a 1">
                <TableCellsSplit className="h-3 w-3 mr-1" /> Separar
              </Button>

              <div className="w-px h-5 bg-border" />

              <Button size="sm" variant="default" onClick={handleOpenSaveDialog} className="h-7 text-xs">
                <Save className="h-3 w-3 mr-1" /> Guardar
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenLayoutsDialog} className="h-7 text-xs">
                <FolderOpen className="h-3 w-3 mr-1" /> Mis Layouts
              </Button>
              <Button size="sm" variant="outline" onClick={handleLoadLocal} className="h-7 text-xs">
                <Upload className="h-3 w-3 mr-1" /> Local
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset} className="h-7 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" /> Restablecer
              </Button>

              <div className="w-px h-5 bg-border" />

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Deep clone so React detects the state change
                  const cloned: GridConfig = {
                    ...gridConfig,
                    rows: gridConfig.rows.map(row => ({
                      ...row,
                      cells: { ...row.cells },
                    })),
                  }
                  const patched = patchDataBindings(cloned)
                  setGridConfig(patched)
                  let count = 0
                  for (const row of patched.rows) {
                    for (const col of Object.keys(row.cells)) {
                      if (row.cells[Number(col)].dataBinding) count++
                    }
                  }
                  toast({ title: 'Bindings parcheados', description: `Se asignaron ${count} data bindings a las celdas.` })
                }}
                className="h-7 text-xs"
                title="Asignar autom├íticamente todos los data bindings de calificaciones, orientaci├│n, grupos y observaciones"
              >
                <Combine className="h-3 w-3 mr-1" /> Parchear Bindings
              </Button>

              <div className="w-px h-5 bg-border" />

              <Button
                size="sm"
                variant={isPreview ? 'default' : 'outline'}
                onClick={() => setIsPreview(!isPreview)}
                className="h-7 text-xs"
              >
                {isPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                {isPreview ? 'Dise├▒ador' : 'Vista Previa'}
              </Button>

              {isPreview && (
                <Badge variant="outline" className="text-xs">
                  {gridConfig.rows.length} filas ├ù {gridConfig.totalCols} columnas
                </Badge>
              )}

              <div className="w-px h-5 bg-border" />

              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                className="h-7 text-xs"
                title="Imprimir la certificaci├│n con los datos actuales"
              >
                <Printer className="h-3 w-3 mr-1" /> Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>}

        {/* Student search */}
        <Card>
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <StudentSearch
                  onSelect={handleSelectStudent}
                  placeholder="Buscar alumno por c├®dula, apellidos o nombres..."
                  plan={plan}
                />
              </div>
              {selectedStudent && (
                <div className="flex items-center gap-2">
                  <Badge variant={selectedStudent.plan === 'derogado' ? 'destructive' : 'default'}>
                    {selectedStudent.plan === 'derogado' ? 'BD2 ÔÇö Plan Derogado' : 'BD ÔÇö Plan Vigente'}
                  </Badge>
                  <span className="text-sm font-medium">{selectedStudent.apellidos}, {selectedStudent.nombres}</span>
                  <span className="text-xs text-muted-foreground">C.I.: {formatCedulaFinal(selectedStudent.cedula)}</span>
                </div>
              )}
              {loadingData && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {savingDraft && <Loader2 className="h-3 w-3 animate-spin text-orange-500" />}
            </div>
          </CardContent>
        </Card>

        {/* Column Widths Editor (only in designer mode) */}
        {!isVigenteReadOnly && !isPreview && (
          <Card>
            <CardContent className="py-2 px-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Anchos de columna (clic para editar):</span>
              </div>
              <ColumnWidthEditor config={gridConfig} onUpdate={setGridConfig} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Area: Grid + Properties Panel */}
      {/* Agrega overflowY: 'auto' y overflowX: 'hidden' */}
      <div className="flex gap-3 mt-3" style={{ minHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Grid */}
        {/* Agrega overflow: 'visible' */}
        <div className="flex-1 min-w-0" style={{ overflow: 'visible' }}>
          <GridTable
            config={gridConfig}
            selectedCell={isVigenteReadOnly ? null : selectedCell}
            selectionRange={isVigenteReadOnly ? null : selectionRange}
            onCellMouseDown={isVigenteReadOnly ? () => {} : handleCellMouseDown}
            onCellMouseEnter={isVigenteReadOnly ? () => {} : handleCellMouseEnter}
            onCellMouseUp={isVigenteReadOnly ? () => {} : handleCellMouseUp}
            isPreview={isVigenteReadOnly ? true : isPreview}
            displayData={displayData}
            onCellEdit={isVigenteReadOnly ? undefined : handleCellEdit}
            savingDraft={savingDraft}
            draftOverrides={draftOverrides}
          />
        </div>

        {/* Properties Panel (only in designer mode, when cell selected) */}
        {!isVigenteReadOnly && !isPreview && selectedCell && (
          <div className="w-[320px] shrink-0">
            {selectionRange && (
              <div className="mb-1.5 px-1">
                <Badge variant="default" className="text-[10px] gap-1">
                  <Group className="h-3 w-3" />
                  Formato a {Math.abs(selectionRange.r2 - selectionRange.r1) + 1}├ù{Math.abs(selectionRange.c2 - selectionRange.c1) + 1} celdas
                </Badge>
              </div>
            )}
            <PropertiesPanel
              cell={selectedCellData}
              row={selectedCell.row}
              col={selectedCell.col}
              onUpdate={handleFormatUpdate}
              plan={plan}
              isRangeMode={!!selectionRange}
            />
          </div>
        )}
      </div>

      {/* === Save Dialog (enter name) — solo derogado === */}
      {!isVigenteReadOnly && <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Layout</DialogTitle>
            <DialogDescription>
              Asigna un nombre a este layout para guardarlo en la base de datos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="layout-name" className="text-sm font-medium">Nombre del layout</Label>
            <Input
              id="layout-name"
              placeholder="Ej: Certificaci├│n EMG 2024"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmSave() }}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={saving || !saveName.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              )}
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>}

      {/* === Saved Layouts Dialog === */}
      {!isVigenteReadOnly && <SavedLayoutsDialog
        open={showLayoutsDialog}
        onOpenChange={setShowLayoutsDialog}
        layouts={savedLayouts}
        onLoad={handleLoadLayoutFromDB}
        onDelete={handleDeleteLayout}
        loading={loadingLayouts || loadingLayout}
      />}

      {/* === Print Dialog === */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Imprimir Certificaci├│n</DialogTitle>
            <DialogDescription>Configura la escala antes de imprimir.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Escala</Label>
                <span className="text-sm font-semibold text-primary">{printScale}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                step={5}
                value={printScale}
                onChange={(e) => setPrintScale(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <span>50%</span>
                <span>100%</span>
                <span>150%</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>Cancelar</Button>
            <Button onClick={() => executePrint(printScale)}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

export default function CertificacionesVisualPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <CertVisualEditorContent />
    </Suspense>
  )
}
