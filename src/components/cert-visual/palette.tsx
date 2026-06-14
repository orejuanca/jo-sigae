'use client'

import { useDraggable } from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText, Building2, User, School, BookOpen,
  MessageSquare, Stamp, ShieldCheck, DollarSign,
  type LucideIcon, GripVertical,
} from 'lucide-react'
import { AVAILABLE_BLOCKS, type BlockConfig } from './types'

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Building2, User, School, BookOpen,
  MessageSquare, Stamp, ShieldCheck, DollarSign,
}

interface PaletteProps {
  canvasBlockIds: string[]
}

function PaletteItem({ block, disabled }: { block: typeof AVAILABLE_BLOCKS[number]; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${block.id}`,
    data: { type: 'palette', blockId: block.id },
    disabled,
  })

  const Icon = ICON_MAP[block.icon] || FileText

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing
        transition-colors select-none
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent border-border'}
        ${isDragging ? 'ring-2 ring-primary shadow-lg' : ''}
      `}
      style={disabled ? { pointerEvents: 'none' } : undefined}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium truncate">{block.label}</span>
    </div>
  )
}

export function Palette({ canvasBlockIds }: PaletteProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-3">
        <h3 className="text-sm font-semibold mb-3">Bloques Disponibles</h3>
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-2 pr-2">
            {AVAILABLE_BLOCKS.map(block => (
              <PaletteItem
                key={block.id}
                block={block}
                disabled={canvasBlockIds.includes(block.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}