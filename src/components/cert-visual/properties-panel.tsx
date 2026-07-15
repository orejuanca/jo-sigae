'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Settings2, ChevronDown, Search, Check } from 'lucide-react'
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
    <div className="flex items-center gap-2">
      <Label className="text-xs whitespace-nowrap">{label}</Label>
      <div className="flex items-center gap-2 ml-auto">
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

function BindingCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = value
    ? DATA_BINDINGS.flatMap(g => g.bindings).find(b => b.value === value)
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="h-7 text-xs w-full flex items-center justify-between rounded-md border border-input bg-background px-2 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
        >
          {selected ? (
            <span className="truncate">{selected.label}</span>
          ) : value ? (
            <span className="font-mono truncate text-muted-foreground">{value}</span>
          ) : (
            <span className="text-muted-foreground">Buscar campo de datos...</span>
          )}
          <Search className="h-3 w-3 ml-1 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Buscar campo..." className="h-8 text-xs" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="text-xs py-2 px-2">Sin resultados</CommandEmpty>
            {DATA_BINDINGS.map((group) => (
              <CommandGroup key={group.group} heading={group.group}>
                <CommandItem
                  value="__none__"
                  onSelect={() => { onChange(''); setOpen(false) }}
                  className="text-xs"
                >
                  <span className="opacity-60">— Quitar enlace —</span>
                </CommandItem>
                {group.bindings.map((binding) => (
                  <CommandItem
                    key={binding.value}
                    value={`${binding.label} ${binding.value}`}
                    onSelect={() => { onChange(binding.value); setOpen(false) }}
                    className="text-xs"
                  >
                    <Check className={`h-3 w-3 mr-2 ${value === binding.value ? 'opacity-100' : 'opacity-0'}`} />
                    {binding.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Helper: check if a binding path exists in the DATA_BINDINGS catalog
function isCatalogBinding(value: string): boolean {
  if (!value) return false
  return DATA_BINDINGS.some(g => g.bindings.some(b => b.value === value))
}

// Mutually-exclusive binding mode: catalog dropdown OR free-text direct path
function BindingModeSection({ dataBinding, onUpdate }: { dataBinding: string; onUpdate: (updates: Partial<CellConfig>) => void }) {
  const isDirect = dataBinding !== '' && !isCatalogBinding(dataBinding)
  const [mode, setMode] = useState<'none' | 'catalog' | 'direct'>(
    !dataBinding ? 'none' : isDirect ? 'direct' : 'catalog'
  )

  // Sync mode when dataBinding changes externally (e.g. patchDataBindings)
  const effectiveIsDirect = dataBinding !== '' && !isCatalogBinding(dataBinding)
  const effectiveMode = !dataBinding ? 'none' : effectiveIsDirect ? 'direct' : 'catalog'

  const handleModeChange = (newMode: 'none' | 'catalog' | 'direct') => {
    setMode(newMode)
    if (newMode === 'none') {
      onUpdate({ dataBinding: '' })
    } else if (newMode === 'catalog') {
      // Clear any direct binding so user picks from catalog
      if (isDirect) onUpdate({ dataBinding: '' })
    } else if (newMode === 'direct') {
      // Clear any catalog binding so user types freely
      if (!isDirect && dataBinding) onUpdate({ dataBinding: '' })
    }
  }

  const handleCatalogChange = (v: string) => {
    onUpdate({ dataBinding: v })
  }

  const handleDirectChange = (v: string) => {
    onUpdate({ dataBinding: v })
  }

  const currentMode = effectiveMode

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs whitespace-nowrap min-w-[120px]">Modo enlace:</Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleModeChange('none')}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              currentMode === 'none'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            }`}
          >
            Ninguno
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('catalog')}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              currentMode === 'catalog'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            }`}
          >
            Catálogo
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('direct')}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              currentMode === 'direct'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            }`}
          >
            Directo
          </button>
        </div>
      </div>

      {currentMode === 'catalog' && (
        <FieldRow label="Enlazar a dato:">
          <BindingCombobox
            value={dataBinding}
            onChange={handleCatalogChange}
          />
        </FieldRow>
      )}

      {currentMode === 'direct' && (
        <FieldRow label="Enlace directo:">
          <Input
            value={dataBinding}
            onChange={(e) => handleDirectChange(e.target.value)}
            className="h-7 text-xs font-mono"
            placeholder="student.cedula"
          />
        </FieldRow>
      )}
    </div>
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

  return (
    <Card style={{ minWidth: 320 }}>
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
      <CardContent className="p-3 overflow-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="space-y-3 pr-2" style={{ minWidth: 340 }}>
            {/* CONTENIDO */}
            <SectionHeader title="Contenido" defaultOpen>
              <FieldRow label="Texto estático:">
                <Input
                  value={cell.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  className="h-7 text-xs"
                />
              </FieldRow>
              <BindingModeSection
                dataBinding={cell.dataBinding}
                onUpdate={onUpdate}
              />
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
      </CardContent>
    </Card>
  )
}