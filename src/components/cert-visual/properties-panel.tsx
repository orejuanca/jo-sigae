'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Settings2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { CellConfig } from './types'
import { DATA_BINDINGS } from './types'

interface PropertiesPanelProps {
  cell: CellConfig | null
  row: number
  col: number
  onUpdate: (updates: Partial<CellConfig>) => void
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs whitespace-nowrap min-w-[120px]">{label}</Label>
      <div className="flex items-center gap-2 flex-1 justify-end">
        {children}
      </div>
    </div>
  )
}

function SectionHeader({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1">
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2.5 pl-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function PropertiesPanel({ cell, row, col, onUpdate }: PropertiesPanelProps) {
  if (!cell) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Seleccione una celda para editar sus propiedades</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Build flat list of all bindings for the select dropdown
  const allBindings = DATA_BINDINGS.flatMap(g => g.bindings)

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Celda [{row}, {col}]</CardTitle>
          <span className="text-[10px] text-muted-foreground font-mono">
            {cell.colspan > 1 || cell.rowspan > 1
              ? `${cell.colspan}×${cell.rowspan}`
              : '1×1'}
          </span>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-3">
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="space-y-3 pr-2">
            {/* CONTENIDO */}
            <SectionHeader title="Contenido" defaultOpen>
              <FieldRow label="Texto:">
                <Input
                  value={cell.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  className="h-7 text-xs"
                />
              </FieldRow>
              <FieldRow label="Enlazar a dato:">
                <Select
                  value={cell.dataBinding || '__none__'}
                  onValueChange={(v) => onUpdate({ dataBinding: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger className="h-7 text-xs w-full">
                    <SelectValue placeholder="Sin enlace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin enlace —</SelectItem>
                    {DATA_BINDINGS.map((group) => (
                      <SelectItem key={group.group} disabled value={`__group_${group.group}`}>
                        <span className="font-semibold text-xs">{group.group}</span>
                      </SelectItem>
                    ))}
                    {allBindings.map((binding) => (
                      <SelectItem key={binding.value} value={binding.value} className="pl-6">
                        <span className="text-xs">{binding.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Enlace directo:">
                <Input
                  value={cell.dataBinding}
                  onChange={(e) => onUpdate({ dataBinding: e.target.value })}
                  className="h-7 text-xs font-mono"
                  placeholder="student.cedula"
                />
              </FieldRow>
            </SectionHeader>

            <Separator />

            {/* COMBINACIÓN DE CELDAS */}
            <SectionHeader title="Combinación de Celdas" defaultOpen>
              <FieldRow label="Columnas (colspan):">
                <Input
                  type="number"
                  min={1}
                  value={cell.colspan}
                  onChange={(e) => onUpdate({ colspan: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-7 text-xs w-20"
                />
              </FieldRow>
              <FieldRow label="Filas (rowspan):">
                <Input
                  type="number"
                  min={1}
                  value={cell.rowspan}
                  onChange={(e) => onUpdate({ rowspan: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-7 text-xs w-20"
                />
              </FieldRow>
            </SectionHeader>

            <Separator />

            {/* DIMENSIONES */}
            <SectionHeader title="Dimensiones" defaultOpen={false}>
              <FieldRow label="Ancho:">
                <Input
                  value={cell.width}
                  onChange={(e) => onUpdate({ width: e.target.value })}
                  className="h-7 text-xs w-24 font-mono"
                  placeholder="10%, 50px"
                />
              </FieldRow>
              <FieldRow label="Alto:">
                <Input
                  value={cell.height}
                  onChange={(e) => onUpdate({ height: e.target.value })}
                  className="h-7 text-xs w-24 font-mono"
                  placeholder="20px, auto"
                />
              </FieldRow>
            </SectionHeader>

            <Separator />

            {/* BORDES */}
            <SectionHeader title="Bordes" defaultOpen>
              <FieldRow label="Borde Superior:">
                <Switch
                  checked={cell.borderTop}
                  onCheckedChange={(checked) => onUpdate({ borderTop: checked })}
                />
              </FieldRow>
              <FieldRow label="Borde Derecho:">
                <Switch
                  checked={cell.borderRight}
                  onCheckedChange={(checked) => onUpdate({ borderRight: checked })}
                />
              </FieldRow>
              <FieldRow label="Borde Inferior:">
                <Switch
                  checked={cell.borderBottom}
                  onCheckedChange={(checked) => onUpdate({ borderBottom: checked })}
                />
              </FieldRow>
              <FieldRow label="Borde Izquierdo:">
                <Switch
                  checked={cell.borderLeft}
                  onCheckedChange={(checked) => onUpdate({ borderLeft: checked })}
                />
              </FieldRow>
              <FieldRow label="Color Borde:">
                <input
                  type="color"
                  value={cell.borderColor}
                  onChange={(e) => onUpdate({ borderColor: e.target.value })}
                  className="h-7 w-9 rounded border cursor-pointer"
                />
                <Input
                  value={cell.borderColor}
                  onChange={(e) => onUpdate({ borderColor: e.target.value })}
                  className="h-7 w-20 text-xs font-mono"
                />
              </FieldRow>
            </SectionHeader>

            <Separator />

            {/* TEXTO */}
            <SectionHeader title="Texto" defaultOpen>
              <FieldRow label="Tamaño Fuente (pt):">
                <Input
                  type="number"
                  min={6}
                  max={20}
                  value={cell.fontSize}
                  onChange={(e) => onUpdate({ fontSize: Math.max(6, Math.min(20, parseInt(e.target.value) || 9)) })}
                  className="h-7 text-xs w-20"
                />
              </FieldRow>
              <FieldRow label="Negrita:">
                <Switch
                  checked={cell.fontWeight === 'bold'}
                  onCheckedChange={(checked) => onUpdate({ fontWeight: checked ? 'bold' : 'normal' })}
                />
              </FieldRow>
              <FieldRow label="Cursiva:">
                <Switch
                  checked={cell.fontStyle === 'italic'}
                  onCheckedChange={(checked) => onUpdate({ fontStyle: checked ? 'italic' : 'normal' })}
                />
              </FieldRow>
              <FieldRow label="Alineación Horiz.:">
                <Select
                  value={cell.textAlign}
                  onValueChange={(v) => onUpdate({ textAlign: v as CellConfig['textAlign'] })}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Izquierda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Derecha</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Alineación Vert.:">
                <Select
                  value={cell.verticalAlign}
                  onValueChange={(v) => onUpdate({ verticalAlign: v as CellConfig['verticalAlign'] })}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Superior</SelectItem>
                    <SelectItem value="middle">Medio</SelectItem>
                    <SelectItem value="bottom">Inferior</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Espacio Blanco:">
                <Select
                  value={cell.whiteSpace}
                  onValueChange={(v) => onUpdate({ whiteSpace: v as CellConfig['whiteSpace'] })}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="nowrap">Sin Salto</SelectItem>
                    <SelectItem value="pre">Pre</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Color Texto:">
                <input
                  type="color"
                  value={cell.color || '#000000'}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="h-7 w-9 rounded border cursor-pointer"
                />
                <Input
                  value={cell.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="h-7 w-20 text-xs font-mono"
                  placeholder="inherit"
                />
              </FieldRow>
              <FieldRow label="Padding:">
                <Input
                  value={cell.padding}
                  onChange={(e) => onUpdate({ padding: e.target.value })}
                  className="h-7 text-xs w-24 font-mono"
                  placeholder="1px 2px"
                />
              </FieldRow>
            </SectionHeader>

            <Separator />

            {/* FONDO */}
            <SectionHeader title="Fondo" defaultOpen={false}>
              <FieldRow label="Color Fondo:">
                <input
                  type="color"
                  value={cell.bgColor || '#ffffff'}
                  onChange={(e) => onUpdate({ bgColor: e.target.value })}
                  className="h-7 w-9 rounded border cursor-pointer"
                />
                <Input
                  value={cell.bgColor}
                  onChange={(e) => onUpdate({ bgColor: e.target.value })}
                  className="h-7 w-20 text-xs font-mono"
                  placeholder="transparent"
                />
              </FieldRow>
            </SectionHeader>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}