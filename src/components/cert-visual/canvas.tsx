'use client'

import { useDroppable } from '@dnd-kit/core'
import { useSortable, verticalListSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { renderSection } from './section-renderer'
import { type BlockConfig, AVAILABLE_BLOCKS } from './types'

interface CanvasProps {
  blocks: BlockConfig[]
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onRemoveBlock: (id: string) => void
  isPreview: boolean
  certData: any
}

function SortableBlock({
  block,
  isSelected,
  onSelect,
  onRemove,
  isPreview,
  certData,
}: {
  block: BlockConfig
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  isPreview: boolean
  certData: any
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, data: { type: 'canvas', blockId: block.id } })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginTop: `${block.props.marginTop}px`,
    marginBottom: `${block.props.marginBottom}px`,
  }

  if (isPreview) {
    return (
      <div style={style}>
        {renderSection(block.id, block.props, certData)}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative rounded border-2 transition-colors cursor-pointer
        ${isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/60'}
      `}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      {/* Builder toolbar */}
      <div className="absolute -top-3 left-2 flex items-center gap-1 z-10">
        <span
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex items-center gap-1 bg-background border rounded px-2 py-0.5 text-xs font-medium cursor-grab active:cursor-grabbing shadow-sm hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3" />
          {block.label}
        </span>
        <Button
          variant="destructive"
          size="sm"
          className="h-6 w-6 p-0 text-xs shadow-sm"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Block content / placeholder */}
      <div className="p-4 min-h-[40px] flex items-center justify-center bg-white">
        {certData ? (
          <div className="w-full">
            {renderSection(block.id, block.props, certData)}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Eye className="h-4 w-4" />
            <span>{block.label} — seleccione un alumno para previsualizar</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function Canvas({ blocks, selectedBlockId, onSelectBlock, onRemoveBlock, isPreview, certData }: CanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop-zone' })

  if (isPreview) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-4 mx-auto" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="space-y-0">
            {blocks.map(block => (
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
        </ScrollArea>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-white shadow-lg rounded-lg p-4 mx-auto border-2 border-dashed transition-colors
        ${isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}
      `}
      style={{ maxWidth: '210mm', minHeight: '297mm' }}
      onClick={() => onSelectBlock(null)}
    >
      <ScrollArea className="h-[calc(100vh-160px)]">
        {blocks.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Arrastre bloques aquí desde la paleta de la izquierda
          </div>
        ) : (
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {blocks.map(block => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onRemove={() => onRemoveBlock(block.id)}
                  isPreview={false}
                  certData={certData}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </ScrollArea>
    </div>
  )
}