'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Settings2 } from 'lucide-react'
import { type BlockConfig, type BlockProps, DEFAULT_BLOCK_PROPS } from './types'

interface PropertiesPanelProps {
  block: BlockConfig | null
  onUpdateProps: (blockId: string, props: Partial<BlockProps>) => void
  onResetProps: (blockId: string) => void
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs whitespace-nowrap">{label}</Label>
      <div className="flex items-center gap-2 flex-1 justify-end">
        {children}
      </div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  unit?: string
}) {
  return (
    <PropRow label={label}>
      <span className="text-xs text-muted-foreground w-8 text-right">{value}{unit || ''}</span>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-28"
      />
    </PropRow>
  )
}

export function PropertiesPanel({ block, onUpdateProps, onResetProps }: PropertiesPanelProps) {
  if (!block) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Seleccione un bloque para editar sus propiedades</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const p = block.props
  const showSeparator = block.id === 'seccion5'

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{block.label}</CardTitle>
          <button
            onClick={() => onResetProps(block.id)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Restablecer
          </button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-4">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4 pr-2">
            <SliderRow
              label="Tamaño de fuente"
              value={p.fontSize}
              min={6}
              max={14}
              step={0.5}
              unit="pt"
              onChange={(v) => onUpdateProps(block.id, { fontSize: v })}
            />

            <SliderRow
              label="Altura de fila"
              value={p.rowHeight}
              min={10}
              max={28}
              step={1}
              unit="px"
              onChange={(v) => onUpdateProps(block.id, { rowHeight: v })}
            />

            <SliderRow
              label="Ancho de borde"
              value={p.borderWidth}
              min={0}
              max={3}
              step={0.5}
              unit="px"
              onChange={(v) => onUpdateProps(block.id, { borderWidth: v })}
            />

            <SliderRow
              label="Padding X"
              value={p.paddingX}
              min={0}
              max={8}
              step={1}
              unit="px"
              onChange={(v) => onUpdateProps(block.id, { paddingX: v })}
            />

            <SliderRow
              label="Padding Y"
              value={p.paddingY}
              min={0}
              max={6}
              step={1}
              unit="px"
              onChange={(v) => onUpdateProps(block.id, { paddingY: v })}
            />

            <Separator />

            <PropRow label="Fondo encabezado">
              <input
                type="color"
                value={p.headerBg}
                onChange={(e) => onUpdateProps(block.id, { headerBg: e.target.value })}
                className="h-7 w-9 rounded border cursor-pointer"
              />
              <Input
                value={p.headerBg}
                onChange={(e) => onUpdateProps(block.id, { headerBg: e.target.value })}
                className="h-7 w-24 text-xs font-mono"
              />
            </PropRow>

            <PropRow label="Color encabezado">
              <input
                type="color"
                value={p.headerColor}
                onChange={(e) => onUpdateProps(block.id, { headerColor: e.target.value })}
                className="h-7 w-9 rounded border cursor-pointer"
              />
              <Input
                value={p.headerColor}
                onChange={(e) => onUpdateProps(block.id, { headerColor: e.target.value })}
                className="h-7 w-24 text-xs font-mono"
              />
            </PropRow>

            <Separator />

            <PropRow label="Mostrar bordes">
              <Switch
                checked={p.showBorders}
                onCheckedChange={(checked) => onUpdateProps(block.id, { showBorders: checked })}
              />
            </PropRow>

            {showSeparator && (
              <PropRow label="Ancho separador">
                <Input
                  value={p.separatorWidth}
                  onChange={(e) => onUpdateProps(block.id, { separatorWidth: e.target.value })}
                  className="h-7 w-20 text-xs font-mono"
                />
              </PropRow>
            )}

            <Separator />

            <SliderRow
              label="Margen superior"
              value={p.marginTop}
              min={0}
              max={20}
              step={1}
              unit="px"
              onChange={(v) => onUpdateProps(block.id, { marginTop: v })}
            />

            <SliderRow
              label="Margen inferior"
              value={p.marginBottom}
              min={0}
              max={20}
              step={1}
              unit="px"
              onChange={(v) => onUpdateProps(block.id, { marginBottom: v })}
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}