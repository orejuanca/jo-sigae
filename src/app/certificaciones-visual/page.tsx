'use client'

import { useState, useCallback, useEffect } from 'react'
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StudentSearch } from '@/components/student-search'
import { useToast } from '@/hooks/use-toast'
import { notaEnLetras, formatCedulaFinal } from '@/lib/school-config'
import {
  Eye, EyeOff, Save, Upload, RotateCcw, Printer,
  Loader2, GripVertical,
} from 'lucide-react'
import { Palette } from '@/components/cert-visual/palette'
import { Canvas } from '@/components/cert-visual/canvas'
import { PropertiesPanel } from '@/components/cert-visual/properties-panel'
import { renderSection } from '@/components/cert-visual/section-renderer'
import {
  type LayoutConfig, type BlockConfig, type BlockProps,
  AVAILABLE_BLOCKS, DEFAULT_BLOCK_PROPS,
  createDefaultLayout,
} from '@/components/cert-visual/types'

// --- Types ---
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

const STORAGE_KEY = 'cert-visual-layout'

function loadLayout(): LayoutConfig {
  if (typeof window === 'undefined') return createDefaultLayout()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LayoutConfig
      if (parsed.blocks && Array.isArray(parsed.blocks)) return parsed
    }
  } catch { /* ignore */ }
  return createDefaultLayout()
}

function saveLayout(layout: LayoutConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...layout, updatedAt: new Date().toISOString() }))
  } catch { /* ignore */ }
}

// --- Main Component ---
export default function CertificacionesVisualPage() {
  const { toast } = useToast()

  // Layout state
  const [layout, setLayout] = useState<LayoutConfig>(createDefaultLayout)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [layoutInitialized, setLayoutInitialized] = useState(false)

  // Student / data state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [certData, setCertData] = useState<CertData | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Load layout from localStorage on mount
  useEffect(() => {
    setLayout(loadLayout())
    setLayoutInitialized(true)
  }, [])

  // Persist layout changes
  useEffect(() => {
    if (layoutInitialized) saveLayout(layout)
  }, [layout, layoutInitialized])

  // --- Student selection + data fetching ---
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

  // --- DnD handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Dragging from palette to canvas
    if (activeId.startsWith('palette-')) {
      const blockId = activeId.replace('palette-', '')
      // Only add if not already on canvas
      if (layout.blocks.some(b => b.id === blockId)) return
      const blockDef = AVAILABLE_BLOCKS.find(b => b.id === blockId)
      if (!blockDef) return

      const newBlock: BlockConfig = {
        id: blockId,
        label: blockDef.label,
        props: { ...DEFAULT_BLOCK_PROPS },
      }

      // Insert at position if dropped over a canvas block
      const overIdx = layout.blocks.findIndex(b => b.id === overId)
      if (overIdx >= 0) {
        setLayout(prev => {
          const blocks = [...prev.blocks]
          blocks.splice(overIdx, 0, newBlock)
          return { ...prev, blocks }
        })
      } else {
        // Dropped on empty canvas — append
        setLayout(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }))
      }
      return
    }

    // Reordering within canvas
    if (activeId !== overId) {
      setLayout(prev => {
        const oldIdx = prev.blocks.findIndex(b => b.id === activeId)
        const newIdx = prev.blocks.findIndex(b => b.id === overId)
        if (oldIdx === -1 || newIdx === -1) return prev
        return { ...prev, blocks: arrayMove(prev.blocks, oldIdx, newIdx) }
      })
    }
  }

  // --- Block operations ---
  const handleRemoveBlock = useCallback((id: string) => {
    setLayout(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== id) }))
    if (selectedBlockId === id) setSelectedBlockId(null)
  }, [selectedBlockId])

  const handleUpdateProps = useCallback((blockId: string, props: Partial<BlockProps>) => {
    setLayout(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === blockId ? { ...b, props: { ...b.props, ...props } } : b
      ),
    }))
  }, [])

  const handleResetProps = useCallback((blockId: string) => {
    setLayout(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === blockId ? { ...b, props: { ...DEFAULT_BLOCK_PROPS } } : b
      ),
    }))
  }, [])

  const handleResetLayout = () => {
    const def = createDefaultLayout()
    setLayout(def)
    setSelectedBlockId(null)
    toast({ title: 'Diseño restablecido', description: 'Se restauró el diseño por defecto.' })
  }

  const handleExportLayout = () => {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cert-visual-layout.json'
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Diseño exportado' })
  }

  const handleImportLayout = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as LayoutConfig
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          setLayout(parsed)
          toast({ title: 'Diseño importado' })
        } else {
          toast({ title: 'Error', description: 'Formato de archivo inválido.', variant: 'destructive' })
        }
      } catch {
        toast({ title: 'Error', description: 'No se pudo leer el archivo.', variant: 'destructive' })
      }
    }
    input.click()
  }

  const handlePrint = () => {
    window.print()
  }

  // Selected block
  const selectedBlock = layout.blocks.find(b => b.id === selectedBlockId) || null

  // Active drag overlay content
  const activeDragLabel = activeId?.startsWith('palette-')
    ? AVAILABLE_BLOCKS.find(b => b.id === activeId.replace('palette-', ''))?.label
    : layout.blocks.find(b => b.id === activeId)?.label

  return (
    <AppShell>
      <div className="space-y-4 print:hidden">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Visual Builder — Certificaciones</h1>
          <p className="text-muted-foreground">Diseñe visualmente el formato de certificación con drag-and-drop</p>
        </div>

        {/* Student search */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <StudentSearch
                  onSelect={handleSelectStudent}
                  placeholder="Buscar alumno por cédula, apellidos o nombres..."
                />
              </div>
              {selectedStudent && (
                <div className="flex items-center gap-2">
                  <Badge variant={selectedStudent.plan === 'derogado' ? 'destructive' : 'default'}>
                    {selectedStudent.plan === 'derogado' ? 'BD2 — Plan Derogado' : 'BD — Plan Vigente'}
                  </Badge>
                  <span className="text-sm font-medium">{selectedStudent.apellidos}, {selectedStudent.nombres}</span>
                  <span className="text-sm text-muted-foreground">C.I.: {formatCedulaFinal(selectedStudent.cedula)}</span>
                </div>
              )}
              {loadingData && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={isPreview ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {isPreview ? 'Diseñador' : 'Vista Previa'}
          </Button>

          <div className="w-px h-6 bg-border" />

          <Button variant="outline" size="sm" onClick={handleExportLayout}>
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportLayout}>
            <Upload className="h-4 w-4 mr-1" /> Cargar
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetLayout}>
            <RotateCcw className="h-4 w-4 mr-1" /> Restablecer
          </Button>

          <div className="w-px h-6 bg-border" />

          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!certData}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex gap-4 ${isPreview ? 'print:block' : ''}`}>
          {/* Left: Palette (hidden in preview) */}
          {!isPreview && (
            <div className="w-56 shrink-0 print:hidden">
              <Palette canvasBlockIds={layout.blocks.map(b => b.id)} />
            </div>
          )}

          {/* Center: Canvas */}
          <div className="flex-1 min-w-0">
            <Canvas
              blocks={layout.blocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onRemoveBlock={handleRemoveBlock}
              isPreview={isPreview}
              certData={certData}
            />
          </div>

          {/* Right: Properties Panel (hidden in preview) */}
          {!isPreview && (
            <div className="w-64 shrink-0 print:hidden">
              <PropertiesPanel
                block={selectedBlock}
                onUpdateProps={handleUpdateProps}
                onResetProps={handleResetProps}
              />
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && activeDragLabel && (
            <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-xl opacity-80 pointer-events-none">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{activeDragLabel}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Print-only: render full cert in A4 */}
      {isPreview && certData && (
        <div className="hidden print:block bg-white p-6" style={{ maxWidth: '210mm', margin: '0 auto' }}>
          {layout.blocks.map(block => (
            <div
              key={block.id}
              style={{
                marginTop: `${block.props.marginTop}px`,
                marginBottom: `${block.props.marginBottom}px`,
              }}
            >
              {renderSection(block.id, block.props, certData)}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}