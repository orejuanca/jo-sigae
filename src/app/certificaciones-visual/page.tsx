'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { AppShell } from '@/components/app-shell'
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
  emptyCell, emptyRow, createDefaultTemplate, resolveBinding,
} from '@/components/cert-visual/types'
import { schoolConfig, notaEnLetras, formatCedulaFinal } from '@/lib/school-config'
import {
  Eye, EyeOff, Save, Upload, RotateCcw, Plus, Minus, Columns3, Loader2,
  FolderOpen, Trash2, CheckCircle2, ArrowUp, ArrowDown,
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
  observaciones: string; promedioAcumulado: string
  director: { apellidosNombres: string; cedula: string }
  directorCdcce: { apellidosNombres: string; cedula: string }
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
      if (parsed.rows && Array.isArray(parsed.rows) && parsed.totalCols) return parsed
    }
  } catch { /* ignore */ }
  return createDefaultTemplate()
}

function saveGridConfig(config: GridConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch { /* ignore */ }
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
  onCellClick,
  isPreview,
  displayData,
}: {
  config: GridConfig
  selectedCell: { row: number; col: number } | null
  onCellClick: (row: number, col: number) => void
  isPreview: boolean
  displayData: DisplayData | null
}) {
  const occupied = useMemo(() => new Set<string>(), [])

  return (
    <div className="overflow-auto flex-1 bg-white p-2 rounded border" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <div style={{ width: '800px', maxWidth: '100%', margin: '0 auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '9pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.2' }}>
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

                // Mark cells consumed by rowspan
                if (cell.rowspan > 1) {
                  for (let dr = 1; dr < cell.rowspan; dr++) {
                    occupied.add(`${r + dr}-${c}`)
                  }
                }

                // Resolve content for preview
                let displayContent = cell.content
                if (isPreview && cell.dataBinding && displayData) {
                  displayContent = resolveBinding(cell.dataBinding, displayData)
                }

                const borderStyle = (enabled: boolean) =>
                  enabled ? `1px solid ${cell.borderColor}` : 'none'

                const isSelected = selectedCell?.row === r && selectedCell?.col === c
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
                      height: cell.height || undefined,
                      fontSize: `${cell.fontSize}pt`,
                      fontWeight: cell.fontWeight,
                      fontStyle: cell.fontStyle,
                      textAlign: cell.textAlign,
                      verticalAlign: cell.verticalAlign,
                      backgroundColor: cell.bgColor || undefined,
                      color: cell.color || undefined,
                      whiteSpace: cell.whiteSpace,
                      padding: cell.padding,
                      cursor: isPreview ? 'default' : 'pointer',
                      outline: isSelected ? '2px solid #3b82f6' : undefined,
                      outlineOffset: '-2px',
                      minWidth: hasContent ? undefined : '0px',
                      background: isSelected ? 'rgba(59,130,246,0.06)' : cell.bgColor || undefined,
                    }}
                    onClick={() => !isPreview && onCellClick(r, c)}
                    title={cell.dataBinding ? `[${cell.dataBinding}]` : undefined}
                  >
                    {isPreview && cell.dataBinding && !displayContent ? (
                      <span style={{ color: '#ccc' }}>—</span>
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
    <div className="flex gap-0.5 flex-wrap p-1">
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
export default function CertificacionesVisualPage() {
  const { toast } = useToast()

  // Grid state
  const [gridConfig, setGridConfig] = useState<GridConfig>(createDefaultTemplate)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [gridInitialized, setGridInitialized] = useState(false)
  const [colInput, setColInput] = useState('27')

  // Student / data state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [certData, setCertData] = useState<CertData | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)

  // Saved layouts dialog state
  const [showLayoutsDialog, setShowLayoutsDialog] = useState(false)
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([])
  const [loadingLayouts, setLoadingLayouts] = useState(false)
  const [loadingLayout, setLoadingLayout] = useState(false)

  // Load grid from localStorage on mount
  useEffect(() => {
    setGridConfig(loadGridConfig())
    setGridInitialized(true)
  }, [])

  // Persist grid changes to localStorage (auto-save local)
  useEffect(() => {
    if (gridInitialized) saveGridConfig(gridConfig)
  }, [gridConfig, gridInitialized])

  // === Student selection + data fetching ===
  const handleSelectStudent = useCallback(async (student: Student) => {
    setSelectedStudent(student)
    setCertData(null)
    setLoadingData(true)
    try {
      const res = await fetch(`/api/students/${student.id}/cert-data`)
      if (!res.ok) {
        toast({ title: 'Sin datos', description: `No se encontraron datos de calificaciones para ${student.cedula}.`, variant: 'destructive' })
        setLoadingData(false)
        return
      }
      const result = await res.json()
      if (result.certData) {
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
        const gradeCount = Object.values(cd.calificaciones || {})
          .flat()
          .filter((c: CalificacionRow) => c.nota && c.nota !== '').length
        toast({ title: 'Datos cargados', description: `${gradeCount} calificaciones del rawData.` })
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar datos de calificaciones.', variant: 'destructive' })
    } finally {
      setLoadingData(false)
    }
  }, [toast])

  // Convert CertData to DisplayData for the grid
  const displayData: DisplayData | null = useMemo(() => {
    if (!certData) return null
    // Convert YYYY-MM-DD → DD/MM/YYYY
    let fechaExp = certData.fechaExpedicion
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaExp)) {
      const [y, m, d] = fechaExp.split('-')
      fechaExp = `${d}/${m}/${y}`
    }
    return {
      lugar: certData.lugar,
      fechaExpedicion: fechaExp,
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
      instituciones: certData.instituciones,
      observaciones: certData.observaciones,
      promedioAcumulado: certData.promedioAcumulado,
      director: certData.director,
      directorCdcce: certData.directorCdcce,
    }
  }, [certData])

  // === Grid Operations ===
  const handleCellClick = useCallback((r: number, c: number) => {
    setSelectedCell((prev) =>
      prev?.row === r && prev?.col === c ? null : { row: r, col: c }
    )
  }, [])

  const handleCellUpdate = useCallback((updates: Partial<CellConfig>) => {
    if (!selectedCell) return
    setGridConfig((prev) => updateCellInConfig(prev, selectedCell.row, selectedCell.col, updates))
  }, [selectedCell])

  const handleApplyColumns = () => {
    const n = parseInt(colInput)
    if (isNaN(n) || n < 1 || n > 100) {
      toast({ title: 'Error', description: 'Ingrese un número válido de columnas (1-100).', variant: 'destructive' })
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
      toast({ title: 'Sin selección', description: 'Selecciona una celda primero para insertar fila arriba.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      const newRow = emptyRow(prev.totalCols)
      const newRows = [...prev.rows]
      newRows.splice(selectedCell.row, 0, newRow)
      // Shift selection down by 1 since row was inserted above
      setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col })
      return { ...prev, rows: newRows }
    })
  }

  const handleInsertRowBelow = () => {
    if (!selectedCell) {
      toast({ title: 'Sin selección', description: 'Selecciona una celda primero para insertar fila abajo.', variant: 'destructive' })
      return
    }
    setGridConfig((prev) => {
      const newRow = emptyRow(prev.totalCols)
      const newRows = [...prev.rows]
      newRows.splice(selectedCell.row + 1, 0, newRow)
      // Selection stays on same row (the new row is below)
      return { ...prev, rows: newRows }
    })
  }

  const handleDeleteLastRow = () => {
    setGridConfig((prev) => {
      if (prev.rows.length <= 1) {
        toast({ title: 'No se puede eliminar la última fila', variant: 'destructive' })
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
      const res = await fetch('/api/cert-layouts', {
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
        title: '¡Guardado exitoso!',
        description: `El layout "${saveName.trim()}" se guardó correctamente en la base de datos.`,
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
      const res = await fetch('/api/cert-layouts')
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
      const res = await fetch(`/api/cert-layouts/${id}`)
      if (!res.ok) {
        throw new Error('Layout no encontrado')
      }
      const layout = await res.json()
      const parsed: GridConfig = typeof layout.datos === 'string'
        ? JSON.parse(layout.datos)
        : layout.datos

      if (parsed.rows && Array.isArray(parsed.rows) && parsed.totalCols) {
        setGridConfig(parsed)
        setSelectedCell(null)
        setShowLayoutsDialog(false)
        toast({ title: 'Layout cargado', description: `"${layout.nombre}" se cargó correctamente.` })
      } else {
        throw new Error('Datos de layout inválidos')
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
      const res = await fetch(`/api/cert-layouts/${id}`, { method: 'DELETE' })
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
    toast({ title: 'Diseño cargado', description: 'Se restauró desde el almacenamiento local.' })
  }

  const handleReset = () => {
    const def = createDefaultTemplate()
    setGridConfig(def)
    setSelectedCell(null)
    setColInput('27')
    toast({ title: 'Diseño restablecido', description: 'Se restauró la plantilla por defecto.' })
  }

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
        <div>
          <h1 className="text-2xl font-bold">Editor de Grilla — Certificaciones</h1>
          <p className="text-muted-foreground text-sm">Constructor celda por celda para el formato de certificación</p>
        </div>

        {/* Toolbar Row 1: Grid controls */}
        <Card>
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Columns3 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs font-medium whitespace-nowrap">Columnas:</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={colInput}
                  onChange={(e) => setColInput(e.target.value)}
                  className="h-7 w-16 text-xs text-center"
                />
                <Button size="sm" variant="outline" onClick={handleApplyColumns} className="h-7 text-xs">
                  Aplicar Columnas
                </Button>
              </div>

              <div className="w-px h-5 bg-border" />

              <Button size="sm" variant="outline" onClick={handleAddRow} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Agregar Fila
              </Button>
              <Button size="sm" variant="outline" onClick={handleInsertRowAbove} className="h-7 text-xs" title="Insertar fila arriba de la celda seleccionada">
                <ArrowUp className="h-3 w-3 mr-1" /> Fila Arriba
              </Button>
              <Button size="sm" variant="outline" onClick={handleInsertRowBelow} className="h-7 text-xs" title="Insertar fila abajo de la celda seleccionada">
                <ArrowDown className="h-3 w-3 mr-1" /> Fila Abajo
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeleteLastRow} className="h-7 text-xs">
                <Minus className="h-3 w-3 mr-1" /> Eliminar Última Fila
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
                variant={isPreview ? 'default' : 'outline'}
                onClick={() => setIsPreview(!isPreview)}
                className="h-7 text-xs"
              >
                {isPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                {isPreview ? 'Diseñador' : 'Vista Previa'}
              </Button>

              {isPreview && (
                <Badge variant="outline" className="text-xs">
                  {gridConfig.rows.length} filas × {gridConfig.totalCols} columnas
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Student search */}
        <Card>
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <StudentSearch
                  onSelect={handleSelectStudent}
                  placeholder="Buscar alumno por cédula, apellidos o nombres..."
                />
              </div>
              {selectedStudent && (
                <div className="flex items-center gap-2">
                  <Badge variant={selectedStudent.plan === 'derogado' ? 'destructive' : 'default'}>
                    {selectedStudent.plan === 'derogado' ? 'BD2' : 'BD'}
                  </Badge>
                  <span className="text-sm font-medium">{selectedStudent.apellidos}, {selectedStudent.nombres}</span>
                  <span className="text-xs text-muted-foreground">C.I.: {formatCedulaFinal(selectedStudent.cedula)}</span>
                </div>
              )}
              {loadingData && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>

        {/* Column Widths Editor (only in designer mode) */}
        {!isPreview && (
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
      <div className="flex gap-3 mt-3" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {/* Grid */}
        <div className="flex-1 min-w-0">
          <GridTable
            config={gridConfig}
            selectedCell={selectedCell}
            onCellClick={handleCellClick}
            isPreview={isPreview}
            displayData={displayData}
          />
        </div>

        {/* Properties Panel (only in designer mode, when cell selected) */}
        {!isPreview && selectedCell && (
          <div className="w-[300px] shrink-0">
            <PropertiesPanel
              cell={selectedCellData}
              row={selectedCell.row}
              col={selectedCell.col}
              onUpdate={handleCellUpdate}
            />
          </div>
        )}
      </div>

      {/* === Save Dialog (enter name) === */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
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
              placeholder="Ej: Certificación EMG 2024"
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
      </Dialog>

      {/* === Saved Layouts Dialog === */}
      <SavedLayoutsDialog
        open={showLayoutsDialog}
        onOpenChange={setShowLayoutsDialog}
        layouts={savedLayouts}
        onLoad={handleLoadLayoutFromDB}
        onDelete={handleDeleteLayout}
        loading={loadingLayouts || loadingLayout}
      />
    </AppShell>
  )
}