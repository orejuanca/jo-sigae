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
import { Settings2, ChevronDown, Search, Check, X, Plus } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import type { CellConfig } from './types'
import { getDataBindings } from './types'

interface PropertiesPanelProps {
  cell: CellConfig | null
  row: number
  col: number
  onUpdate: (updates: Partial<CellConfig>) => void
  plan?: string
  isRangeMode?: boolean
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

// Helper: parse comma-separated bindings into array
function parseBindings(dataBinding: string): string[] {
  if (!dataBinding) return []
  return dataBinding.split(',').map(s => s.trim()).filter(Boolean)
}

// Helper: join array back to comma-separated string
function joinBindings(parts: string[]): string {
  return parts.join(', ')
}

// Helper: find label for a binding value in the catalog
function findBindingLabel(value: string, plan: string): string | null {
  const bindings = getDataBindings(plan)
  const found = bindings.flatMap(g => g.bindings).find(b => b.value === value)
  return found ? found.label : null
}

// Helper: check if ALL parts are catalog bindings
function areAllCatalogBindings(dataBinding: string, plan: string): boolean {
  const parts = parseBindings(dataBinding)
  if (parts.length === 0) return false
  return parts.every(p => {
    const bindings = getDataBindings(plan)
    return bindings.some(g => g.bindings.some(b => b.value === p))
  })
}

// Combobox to ADD a binding (does not replace existing)
function AddBindingCombobox({ existingBindings, onAdd, plan }: { existingBindings: string[]; onAdd: (v: string) => void; plan: string }) {
  const [open, setOpen] = useState(false)
  const bindings = getDataBindings(plan)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-6 text-[10px] flex items-center gap-1 rounded border border-dashed border-input bg-background px-2 hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Agregar enlace
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Buscar campo..." className="h-8 text-xs" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="text-xs py-2 px-2">Sin resultados</CommandEmpty>
            {bindings.map((group) => (
              <CommandGroup key={group.group} heading={group.group}>
                {group.bindings.map((binding) => {
                  const alreadyAdded = existingBindings.includes(binding.value)
                  return (
                    <CommandItem
                      key={binding.value}
                      value={`${binding.label} ${binding.value}`}
                      onSelect={() => { if (!alreadyAdded) { onAdd(binding.value); setOpen(false) } }}
                      className={`text-xs ${alreadyAdded ? 'opacity-40 pointer-events-none' : ''}`}
                      disabled={alreadyAdded}
                    >
                      <Check className={`h-3 w-3 mr-2 ${alreadyAdded ? 'opacity-100' : 'opacity-0'}`} />
                      {binding.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Multi-binding section: shows chips + add button
function BindingModeSection({ dataBinding, onUpdate, plan }: { dataBinding: string; onUpdate: (updates: Partial<CellConfig>) => void; plan: string }) {
  const parts = useMemo(() => parseBindings(dataBinding), [dataBinding])
  const allCatalog = areAllCatalogBindings(dataBinding, plan)
  const hasDirect = parts.some(p => !findBindingLabel(p, plan))
  const [mode, setMode] = useState<'none' | 'catalog' | 'direct'>(
    parts.length === 0 ? 'none' : hasDirect ? 'direct' : 'catalog'
  )

  // Sync mode when dataBinding changes externally
  const effectiveHasDirect = parts.some(p => !findBindingLabel(p, plan))
  const effectiveMode = parts.length === 0 ? 'none' : effectiveHasDirect ? 'direct' : 'catalog'
  useEffect(() => { setMode(effectiveMode) }, [effectiveMode])

  const handleModeChange = (newMode: 'none' | 'catalog' | 'direct') => {
    setMode(newMode)
    if (newMode === 'none') {
      onUpdate({ dataBinding: '' })
    } else if (newMode === 'catalog') {
      // Remove any non-catalog parts
      if (hasDirect) {
        const catalogOnly = parts.filter(p => findBindingLabel(p, plan))
        onUpdate({ dataBinding: joinBindings(catalogOnly) })
      }
    } else if (newMode === 'direct') {
      // Clear everything for direct input
      if (parts.length > 0) onUpdate({ dataBinding: '' })
    }
  }

  const handleAddFromCatalog = (value: string) => {
    const newParts = [...parts, value]
    onUpdate({ dataBinding: joinBindings(newParts) })
  }

  const handleRemoveBinding = (index: number) => {
    const newParts = parts.filter((_, i) => i !== index)
    onUpdate({ dataBinding: joinBindings(newParts) })
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs whitespace-nowrap min-w-[120px]">Modo enlace:</Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleModeChange('none')}
            className={"px-2 py-0.5 text-[10px] rounded border transition-colors " + (
              mode === 'none'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            )}
          >
            Ninguno
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('catalog')}
            className={"px-2 py-0.5 text-[10px] rounded border transition-colors " + (
              mode === 'catalog'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            )}
          >
            Catalogo
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('direct')}
            className={"px-2 py-0.5 text-[10px] rounded border transition-colors " + (
              mode === 'direct'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            )}
          >
            Directo
          </button>
        </div>
      </div>

      {/* Catalog mode: chips + add button */}
      {mode === 'catalog' && (
        <div className="space-y-2">
          {parts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {parts.map((part, idx) => {
                const label = findBindingLabel(part, plan)
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] bg-primary/15 text-primary border border-primary/25 rounded px-1.5 py-0.5"
                  >
                    <span className="truncate max-w-[180px]">{label || part}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBinding(idx)}
                      className="hover:bg-primary/30 rounded p-0.5 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          <AddBindingCombobox
            existingBindings={parts}
            onAdd={handleAddFromCatalog}
            plan={plan}
          />
        </div>
      )}

      {/* Direct mode: free text input */}
      {mode === 'direct' && (
        <FieldRow label="Enlace directo:">
          <Input
            value={dataBinding}
            onChange={(e) => onUpdate({ dataBinding: e.target.value })}
            className="h-7 text-xs font-mono"
            placeholder="student.cedula, rawData.APELLIDOS"
          />
        </FieldRow>
      )}
    </div>
  )
}

export function PropertiesPanel({ cell, row, col, onUpdate, plan = 'vigente', isRangeMode = false }: PropertiesPanelProps) {
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
              ? `${cell.colspan}x${cell.rowspan}`
              : '1x1'}
          </span>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-3 overflow-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="space-y-3 pr-2" style={{ minWidth: 340 }}>
            {isRangeMode && (
              <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary">
                Modo seleccion activo: los cambios de formato se aplicaran a todas las celdas seleccionadas.
              </div>
            )}

            {/* CONTENIDO */}
            <SectionHeader title="Contenido" defaultOpen>
              <FieldRow label="Texto estatico:">
                <Input
                  value={cell.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  className="h-7 text-xs"
                />
              </FieldRow>
              <BindingModeSection
                dataBinding={cell.dataBinding}
                onUpdate={onUpdate}
                plan={plan}
              />
            </SectionHeader>

            <Separator />

            {/* COMBINACION DE CELDAS */}
            <SectionHeader title="Combinacion de Celdas" defaultOpen>
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
              
              <FieldRow label="Tipo Linea:">
                <Select
                  value={cell.borderStyle || 'solid'}
                  onValueChange={(v) => onUpdate({ borderStyle: v })}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solida</SelectItem>
                    <SelectItem value="dashed">Punteada</SelectItem>
                    <SelectItem value="dotted">Puntos</SelectItem>
                    <SelectItem value="double">Doble</SelectItem>
                    <SelectItem value="groove">Ranura</SelectItem>
                    <SelectItem value="ridge">Cresta</SelectItem>
                  </SelectContent>
                </Select>
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
              <FieldRow label="Tamano Fuente (pt):">
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
              <FieldRow label="Subrayado:">
                <Switch
                  checked={cell.textDecoration === 'underline'}
                  onCheckedChange={(checked) => onUpdate({ textDecoration: checked ? 'underline' : 'none' })}
                />
              </FieldRow>
              <FieldRow label="Direccion Texto:">
                <Select
                  value={cell.writingMode || 'horizontal-tb'}
                  onValueChange={(v) => onUpdate({ writingMode: v })}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal-tb">Normal</SelectItem>
                    <SelectItem value="vertical-rl">Vertical Der.</SelectItem>
                    <SelectItem value="vertical-lr">Vertical Izq.</SelectItem>
                    <SelectItem value="sideways-rl">Rotado Der.</SelectItem>
                    <SelectItem value="sideways-lr">Rotado Izq.</SelectItem>                  
                </SelectContent>
                </Select>

              </FieldRow>
              <FieldRow label="Alineacion Horiz.:">
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
              <FieldRow label="Alineacion Vert.:">
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
              <FieldRow label="Ajustar texto:">
                <Switch
                  checked={!!cell.autoFit}
                  onCheckedChange={(checked) => onUpdate({ autoFit: checked })}
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